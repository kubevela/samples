#!/usr/bin/env python3
"""Cloud-neutral object-storage abstraction for the Product Catalog API.

One interface (``ObjectStore``), two backends — AWS S3 and GCP Cloud Storage —
selected at runtime by the ``STORAGE_PROVIDER`` environment variable. The rest of
the app talks only to ``ObjectStore`` and never imports boto3 or google-cloud-storage
directly, so the exact same request-handling code serves a bucket on either cloud.
That is the "one interface to rule them all" promise applied to the application tier:
the platform swaps S3 for GCS underneath, the developer's app code does not change.

Environment variables
----------------------
STORAGE_PROVIDER            "aws" (default) or "gcp" — picks the backend.
BUCKET_NAME                 the bucket to use (falls back to legacy S3_BUCKET_NAME).

AWS (STORAGE_PROVIDER=aws):
    AWS_REGION              region for the S3 client (default us-west-2).
    AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SHARED_CREDENTIALS_FILE
                            standard boto3 credential sources.
    AWS_ENDPOINT_URL        an S3-compatible endpoint such as Floci; switches
                            to path-style bucket addressing.

GCP (STORAGE_PROVIDER=gcp):
    GOOGLE_CLOUD_PROJECT    project id (falls back to GOOGLE_PROJECT_ID).
    GOOGLE_APPLICATION_CREDENTIALS
                            path to a service-account JSON key (read automatically
                            by the client; also needed for signed URLs).
    STORAGE_EMULATOR_HOST   a Cloud Storage emulator such as floci-gcp; the client
                            then uses it with anonymous credentials.
"""
import os
from abc import ABC, abstractmethod


class StorageError(Exception):
    """Backend-agnostic storage failure (wraps boto3 / GCS provider errors)."""


class ObjectStore(ABC):
    """The single interface the app depends on. Backends implement it per cloud."""

    #: short provider tag surfaced in API responses ("aws" / "gcp")
    provider: str = "unknown"
    #: the bucket this store reads/writes
    bucket: str = ""
    #: human-readable location of the bucket (region/project), for the index page
    location: str = ""

    @abstractmethod
    def get(self, key: str):
        """Return the object's bytes, or None if it does not exist."""

    @abstractmethod
    def put(self, key: str, data: bytes, content_type: str) -> None:
        """Write bytes at key with the given content type."""

    @abstractmethod
    def delete(self, key: str) -> None:
        """Delete the object at key (no error if already absent)."""

    @abstractmethod
    def list_keys(self, prefix: str):
        """Return all object keys under prefix (handles pagination)."""

    @abstractmethod
    def bucket_exists(self) -> bool:
        """True if the bucket is reachable with current credentials (readiness)."""

    @abstractmethod
    def signed_url(self, key: str, expires_seconds: int) -> str:
        """A time-limited URL that grants read access to the object."""


class S3ObjectStore(ObjectStore):
    """AWS S3 backend (boto3)."""

    provider = "aws"

    def __init__(self, bucket: str):
        self.bucket = bucket
        self.region = os.environ.get("AWS_REGION", "us-west-2")
        self.location = self.region
        self._client = None

    @property
    def client(self):
        # Lazy so app startup never blocks on credentials; readiness reports them.
        if self._client is None:
            import boto3
            from botocore.config import Config
            # boto3 reads AWS_ENDPOINT_URL itself. An emulator such as Floci
            # serves buckets by path, not as <bucket>.<host> virtual hosts.
            style = "path" if os.environ.get("AWS_ENDPOINT_URL") else "auto"
            self._client = boto3.client(
                "s3", region_name=self.region,
                config=Config(s3={"addressing_style": style}),
            )
        return self._client

    def get(self, key):
        from botocore.exceptions import ClientError
        try:
            response = self.client.get_object(Bucket=self.bucket, Key=key)
            return response["Body"].read()
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            if code in ("NoSuchKey", "NoSuchBucket", "404"):
                return None
            raise StorageError(str(e)) from e

    def put(self, key, data, content_type):
        from botocore.exceptions import ClientError
        try:
            self.client.put_object(
                Bucket=self.bucket, Key=key, Body=data, ContentType=content_type
            )
        except ClientError as e:
            raise StorageError(str(e)) from e

    def delete(self, key):
        from botocore.exceptions import ClientError
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
        except ClientError as e:
            raise StorageError(str(e)) from e

    def list_keys(self, prefix):
        from botocore.exceptions import ClientError
        keys = []
        continuation_token = None
        try:
            while True:
                kwargs = {"Bucket": self.bucket, "Prefix": prefix}
                if continuation_token:
                    kwargs["ContinuationToken"] = continuation_token
                response = self.client.list_objects_v2(**kwargs)
                for obj in response.get("Contents", []):
                    keys.append(obj["Key"])
                continuation_token = response.get("NextContinuationToken")
                if not continuation_token:
                    break
        except ClientError as e:
            raise StorageError(str(e)) from e
        return keys

    def bucket_exists(self):
        from botocore.exceptions import ClientError, NoCredentialsError
        try:
            self.client.head_bucket(Bucket=self.bucket)
            return True
        except (ClientError, NoCredentialsError):
            return False

    def signed_url(self, key, expires_seconds):
        from botocore.exceptions import ClientError
        try:
            return self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=expires_seconds,
            )
        except ClientError as e:
            raise StorageError(str(e)) from e


class GcsObjectStore(ObjectStore):
    """GCP Cloud Storage backend (google-cloud-storage)."""

    provider = "gcp"

    def __init__(self, bucket: str):
        self.bucket = bucket
        self.project = os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get(
            "GOOGLE_PROJECT_ID", ""
        )
        self.location = self.project
        self._client = None
        self._bucket_handle = None

    @property
    def _bucket_ref(self):
        # Lazy: the GCS client looks up credentials on construction, so defer it
        # until first use to keep app startup robust without creds.
        if self._bucket_handle is None:
            from google.cloud import storage
            self._client = (
                storage.Client(project=self.project)
                if self.project
                else storage.Client()
            )
            self._bucket_handle = self._client.bucket(self.bucket)
        return self._bucket_handle

    def get(self, key):
        from google.cloud.exceptions import NotFound, GoogleCloudError
        try:
            return self._bucket_ref.blob(key).download_as_bytes()
        except NotFound:
            return None
        except GoogleCloudError as e:
            raise StorageError(str(e)) from e

    def put(self, key, data, content_type):
        from google.cloud.exceptions import GoogleCloudError
        try:
            self._bucket_ref.blob(key).upload_from_string(data, content_type=content_type)
        except GoogleCloudError as e:
            raise StorageError(str(e)) from e

    def delete(self, key):
        from google.cloud.exceptions import NotFound, GoogleCloudError
        try:
            self._bucket_ref.blob(key).delete()
        except NotFound:
            pass  # already gone — same contract as the S3 backend
        except GoogleCloudError as e:
            raise StorageError(str(e)) from e

    def list_keys(self, prefix):
        from google.cloud.exceptions import GoogleCloudError
        try:
            return [blob.name for blob in self._bucket_ref.list_blobs(prefix=prefix)]
        except GoogleCloudError as e:
            raise StorageError(str(e)) from e

    def bucket_exists(self):
        try:
            return self._bucket_ref.exists()
        except Exception:
            return False

    def signed_url(self, key, expires_seconds):
        from datetime import timedelta
        try:
            return self._bucket_ref.blob(key).generate_signed_url(
                version="v4",
                expiration=timedelta(seconds=expires_seconds),
                method="GET",
            )
        except Exception as e:
            raise StorageError(str(e)) from e


def build_object_store() -> ObjectStore:
    """Construct the ObjectStore for the configured provider.

    Reads STORAGE_PROVIDER and BUCKET_NAME (with a legacy S3_BUCKET_NAME fallback).
    Constructing the store does NOT open a client or contact the cloud — that is
    deferred to first use — so this is safe to call at import time.
    """
    provider = os.environ.get("STORAGE_PROVIDER", "aws").strip().lower()
    bucket = (
        os.environ.get("BUCKET_NAME")
        or os.environ.get("S3_BUCKET_NAME")
        or "product-catalog-images"
    )

    if provider in ("aws", "s3"):
        return S3ObjectStore(bucket)
    if provider in ("gcp", "gcs", "google"):
        return GcsObjectStore(bucket)
    raise StorageError(
        f"Unknown STORAGE_PROVIDER {provider!r}; use 'aws' or 'gcp'."
    )
