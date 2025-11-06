#!/usr/bin/env python3
"""
Product Catalog API - Flask application with S3 integration
Demonstrates a simple microservice that stores product images in S3
"""
import os
import json
import uuid
from datetime import datetime
from flask import Flask, request, jsonify
import boto3
from botocore.exceptions import ClientError

app = Flask(__name__)

# Configuration
S3_BUCKET = os.environ.get('S3_BUCKET_NAME', 'tenant-atlantis-product-images')
AWS_REGION = os.environ.get('AWS_REGION', 'us-west-2')

# Initialize S3 client
s3_client = boto3.client('s3', region_name=AWS_REGION)

# In-memory product storage (for demo purposes)
products = {}


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'product-catalog-api'
    }), 200


@app.route('/ready', methods=['GET'])
def readiness_check():
    """Readiness check - verifies S3 bucket is accessible"""
    try:
        s3_client.head_bucket(Bucket=S3_BUCKET)
        return jsonify({
            'status': 'ready',
            'timestamp': datetime.utcnow().isoformat(),
            's3_bucket': S3_BUCKET
        }), 200
    except ClientError:
        return jsonify({
            'status': 'not ready',
            'error': 'S3 bucket not accessible'
        }), 503


@app.route('/products', methods=['GET'])
def list_products():
    """List all products"""
    return jsonify({
        'products': list(products.values()),
        'count': len(products)
    }), 200


@app.route('/products', methods=['POST'])
def create_product():
    """Create a new product with optional image upload to S3"""
    try:
        data = request.get_json()

        if not data or 'name' not in data:
            return jsonify({'error': 'Product name is required'}), 400

        product_id = str(uuid.uuid4())

        product = {
            'id': product_id,
            'name': data['name'],
            'description': data.get('description', ''),
            'price': data.get('price', 0.0),
            'created_at': datetime.utcnow().isoformat()
        }

        # Handle image upload if provided (base64 or URL)
        if 'image_data' in data:
            image_key = f"products/{product_id}/image.jpg"
            try:
                # In a real app, you'd decode base64 or download from URL
                s3_client.put_object(
                    Bucket=S3_BUCKET,
                    Key=image_key,
                    Body=data['image_data'].encode('utf-8'),
                    ContentType='image/jpeg'
                )
                product['image_s3_key'] = image_key
            except ClientError as e:
                return jsonify({'error': f'Failed to upload image: {str(e)}'}), 500

        products[product_id] = product

        return jsonify(product), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/products/<product_id>', methods=['GET'])
def get_product(product_id):
    """Get a specific product with S3 signed URL for image"""
    if product_id not in products:
        return jsonify({'error': 'Product not found'}), 404

    product = products[product_id].copy()

    # Generate presigned URL for image if it exists
    if 'image_s3_key' in product:
        try:
            url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': S3_BUCKET, 'Key': product['image_s3_key']},
                ExpiresIn=3600  # 1 hour
            )
            product['image_url'] = url
        except ClientError as e:
            product['image_url_error'] = str(e)

    return jsonify(product), 200


@app.route('/products/<product_id>', methods=['DELETE'])
def delete_product(product_id):
    """Delete a product and its S3 image"""
    if product_id not in products:
        return jsonify({'error': 'Product not found'}), 404

    product = products[product_id]

    # Delete image from S3 if exists
    if 'image_s3_key' in product:
        try:
            s3_client.delete_object(Bucket=S3_BUCKET, Key=product['image_s3_key'])
        except ClientError:
            pass  # Continue even if S3 delete fails

    del products[product_id]

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
            'POST /products': 'Create a product',
            'GET /products/<id>': 'Get a specific product',
            'DELETE /products/<id>': 'Delete a product'
        },
        's3_bucket': S3_BUCKET,
        'region': AWS_REGION
    }), 200


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
