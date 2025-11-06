# Product Catalog API

A simple Flask-based REST API that demonstrates S3 integration for storing product images.

## Features

- **GET /health** - Health check endpoint
- **GET /ready** - Readiness check (verifies S3 bucket access)
- **GET /products** - List all products
- **POST /products** - Create a new product with optional image upload to S3
- **GET /products/{id}** - Get a specific product with S3 presigned URL for image
- **DELETE /products/{id}** - Delete a product and its S3 image

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export S3_BUCKET_NAME=tenant-atlantis-product-images
export AWS_REGION=us-west-2
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key

# Run the application
python app.py

# Test the API
./test_api.sh
```

## Docker Build

```bash
# Build the image
docker build -t product-catalog-api:v1.0.0 .

# Run locally
docker run -p 8080:8080 \
  -e S3_BUCKET_NAME=tenant-atlantis-product-images \
  -e AWS_REGION=us-west-2 \
  -e AWS_ACCESS_KEY_ID=your_access_key \
  -e AWS_SECRET_ACCESS_KEY=your_secret_key \
  product-catalog-api:v1.0.0

# Push to k3d local registry
docker tag product-catalog-api:v1.0.0 localhost:5000/product-catalog-api:v1.0.0
docker push localhost:5000/product-catalog-api:v1.0.0
```

## Environment Variables

- `S3_BUCKET_NAME` - S3 bucket name for storing product images (default: tenant-atlantis-product-images)
- `AWS_REGION` - AWS region (default: us-west-2)
- `AWS_ACCESS_KEY_ID` - AWS access key (for authentication)
- `AWS_SECRET_ACCESS_KEY` - AWS secret key (for authentication)
- `PORT` - Port to run the application on (default: 8080)

## Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Client    │────────▶│  Flask API  │────────▶│  AWS S3     │
│             │         │             │         │   Bucket    │
└─────────────┘         └─────────────┘         └─────────────┘
                              │
                              │
                              ▼
                        ┌─────────────┐
                        │  In-Memory  │
                        │   Storage   │
                        └─────────────┘
```

## Security Features

- Non-root user in Docker container
- Read-only root filesystem compatible
- Presigned URLs for secure S3 access
- IAM role-based authentication (when using IRSA in Kubernetes)
