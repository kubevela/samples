#!/bin/bash
# Delete the demo's k3d cluster; everything demo.sh installed lives inside it.
# Also stops the port-forwards demo.sh started (VelaUX and the bucket browser).
#
# Usage: ./clean.sh [--apps-only]
#   --apps-only  Keep the cluster; delete only the product-catalog application
#                (its buckets in every stage are deleted with it; the ACK one
#                is emptied first, since ACK can't delete a non-empty bucket)
set -euo pipefail

CLUSTER_NAME="${CLUSTER_NAME:-kubevela-bucket-floci-demo}"

case "${1:-}" in
    "" | --apps-only) ;;
    *) echo "Usage: ./clean.sh [--apps-only]" >&2; exit 2 ;;
esac

if [ "${1:-}" = "--apps-only" ]; then
    # ACK only deletes empty buckets, and the workflow left a product in the
    # aws-ack one, so empty it with the API's own storage code first.
    if kubectl -n aws-ack get deploy/product-catalog-api >/dev/null 2>&1; then
        kubectl -n aws-ack exec deploy/product-catalog-api -- python -c \
            'import os, storage; s = storage.S3ObjectStore(os.environ["BUCKET_NAME"]); [s.delete(k) for k in s.list_keys("")]' ||
            echo "⚠ Couldn't empty product-images-aws-ack; its ACK Bucket will wait until the bucket is empty"
    fi
    # An application that is already gone is fine; a failed delete is not.
    if kubectl get application product-catalog -n default >/dev/null 2>&1; then
        vela delete product-catalog -n default -y
    fi
    exit 0
fi

# demo.sh leaves VelaUX and the bucket browser forwarded in the background.
for pidfile in "${TMPDIR:-/tmp}/$CLUSTER_NAME-forward-"*.pid; do
    [ -f "$pidfile" ] || continue
    kill "$(cat "$pidfile")" 2>/dev/null || true
    rm -f "$pidfile"
done
k3d cluster delete "$CLUSTER_NAME"
