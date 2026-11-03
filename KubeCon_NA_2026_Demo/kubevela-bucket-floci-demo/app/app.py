#!/usr/bin/env python3
"""
Product Catalog API — a cloud-neutral Flask microservice.

Stores product metadata and images in an object-storage bucket. The bucket can be
AWS S3 or GCP Cloud Storage, selected at runtime by STORAGE_PROVIDER, via the
ObjectStore abstraction in storage.py. Every request handler below is identical
for both clouds — the "one interface" promise applied to the application tier.
"""
import os
import json
import uuid
import base64
import binascii
from datetime import UTC, datetime
from flask import Flask, request, jsonify

from storage import build_object_store, StorageError

app = Flask(__name__)
# Pictures arrive base64 in the JSON body; refuse anything larger than this.
app.config['MAX_CONTENT_LENGTH'] = 8 * 1024 * 1024

# The object store — S3 or GCS, chosen by STORAGE_PROVIDER. Construction is cheap
# and credential-free; the cloud client is opened lazily on first use.
store = build_object_store()

PRODUCTS_PREFIX = 'products'
METADATA_FILENAME = 'product.json'
IMAGE_BASENAME = 'image'

# The picture types a product can carry, and the extension each is stored
# under, so the key says what the object is.
IMAGE_TYPES = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
}


def build_image_key(product_id: str, extension: str) -> str:
    return f"{PRODUCTS_PREFIX}/{product_id}/{IMAGE_BASENAME}.{extension}"


def build_metadata_key(product_id: str) -> str:
    return f"{PRODUCTS_PREFIX}/{product_id}/{METADATA_FILENAME}"


def fetch_product(product_id: str):
    metadata_key = build_metadata_key(product_id)
    data = store.get(metadata_key)
    if data is None:
        return None
    product = json.loads(data.decode('utf-8'))
    product['metadata_key'] = metadata_key
    return product


def list_product_metadata_keys():
    keys = store.list_keys(f"{PRODUCTS_PREFIX}/")
    return [key for key in keys if key.endswith(f"/{METADATA_FILENAME}")]


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now(UTC).isoformat(),
        'service': 'product-catalog-api'
    }), 200


@app.route('/ready', methods=['GET'])
def readiness_check():
    """Readiness check - verifies the storage bucket is accessible"""
    if store.bucket_exists():
        return jsonify({
            'status': 'ready',
            'timestamp': datetime.now(UTC).isoformat(),
            'provider': store.provider,
            'bucket': store.bucket
        }), 200
    return jsonify({
        'status': 'not ready',
        'provider': store.provider,
        'error': f'{store.provider} bucket "{store.bucket}" not accessible '
                 '(check credentials and bucket name)'
    }), 503


@app.route('/products', methods=['GET'])
def list_products():
    """List all products"""
    try:
        product_keys = list_product_metadata_keys()
        product_list = []
        for key in product_keys:
            try:
                data = store.get(key)
                if data is None:
                    continue
                product = json.loads(data.decode('utf-8'))
                product['metadata_key'] = key
                product_list.append(product)
            except (StorageError, ValueError):
                # Skip products that cannot be read or parsed
                continue

        return jsonify({
            'products': product_list,
            'count': len(product_list)
        }), 200
    except StorageError as e:
        return jsonify({'error': f'Failed to list products: {str(e)}'}), 500


@app.route('/products', methods=['POST'])
def create_product():
    """Create a new product with optional image upload to object storage"""
    try:
        data = request.get_json(silent=True)

        if not isinstance(data, dict) or 'name' not in data:
            return jsonify({'error': 'Product name is required'}), 400

        product_id = str(uuid.uuid4())

        product = {
            'id': product_id,
            'name': data['name'],
            'description': data.get('description', ''),
            'price': data.get('price', 0.0),
            'created_at': datetime.now(UTC).isoformat()
        }

        # The picture arrives base64-encoded in image_data, with its type in
        # image_content_type (JPEG if unset). Without one, a JSON placeholder
        # stands in for it.
        if data.get('image_data'):
            content_type = data.get('image_content_type', 'image/jpeg')
            if content_type not in IMAGE_TYPES:
                return jsonify({'error': f'image_content_type must be one of {sorted(IMAGE_TYPES)}'}), 400
            try:
                image_body = base64.b64decode(str(data['image_data']), validate=True)
            except (binascii.Error, ValueError):
                return jsonify({'error': 'image_data must be base64'}), 400
            image_key = build_image_key(product_id, IMAGE_TYPES[content_type])
        else:
            placeholder_data = {
                'product_id': product_id,
                'product_name': data['name'],
                'note': 'Placeholder - no image uploaded',
                'created_at': datetime.now(UTC).isoformat()
            }
            image_body = json.dumps(placeholder_data).encode('utf-8')
            content_type = 'application/json'
            image_key = build_image_key(product_id, 'json')

        try:
            store.put(image_key, image_body, content_type)
            product['image_key'] = image_key
            product['image_content_type'] = content_type
        except StorageError as e:
            return jsonify({'error': f'Failed to upload image: {str(e)}'}), 500

        metadata_key = build_metadata_key(product_id)

        try:
            store.put(
                metadata_key,
                json.dumps(product).encode('utf-8'),
                'application/json',
            )
            product['metadata_key'] = metadata_key
        except StorageError as e:
            return jsonify({'error': f'Failed to store product metadata: {str(e)}'}), 500

        return jsonify(product), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/products/<product_id>', methods=['GET'])
def get_product(product_id):
    """Get a specific product with a signed URL for its image"""
    product = fetch_product(product_id)

    if not product:
        return jsonify({'error': 'Product not found'}), 404

    # Generate a signed URL for the image if it exists
    if 'image_key' in product:
        try:
            product['image_url'] = store.signed_url(product['image_key'], 3600)  # 1 hour
        except StorageError as e:
            product['image_url_error'] = str(e)

    return jsonify(product), 200


@app.route('/products/<product_id>', methods=['DELETE'])
def delete_product(product_id):
    """Delete a product and its stored image"""
    product = fetch_product(product_id)

    if not product:
        return jsonify({'error': 'Product not found'}), 404

    # Delete image from storage if it exists
    if 'image_key' in product:
        try:
            store.delete(product['image_key'])
        except StorageError:
            pass  # Continue even if the object delete fails
    try:
        store.delete(build_metadata_key(product_id))
    except StorageError:
        pass

    return jsonify({'message': 'Product deleted'}), 200


@app.route('/', methods=['GET'])
def index():
    """Root endpoint with API information"""
    return jsonify({
        'service': 'Product Catalog API',
        'version': '1.0.0',
        'endpoints': {
            'GET /health': 'Health check',
            'GET /ready': 'Readiness check',
            'GET /products': 'List all products',
            'POST /products': 'Create a product (picture: base64 image_data, image_content_type)',
            'GET /products/<id>': 'Get a specific product',
            'DELETE /products/<id>': 'Delete a product'
        },
        'provider': store.provider,
        'bucket': store.bucket,
        'location': store.location
    }), 200


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
