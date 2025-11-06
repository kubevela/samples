#!/bin/bash
# Simple test script for the Product Catalog API

set -e

API_URL="${API_URL:-http://localhost:8080}"

echo "Testing Product Catalog API at $API_URL"
echo "========================================"

echo ""
echo "1. Health Check..."
curl -s $API_URL/health | jq .

echo ""
echo "2. Readiness Check..."
curl -s $API_URL/ready | jq .

echo ""
echo "3. List Products (should be empty)..."
curl -s $API_URL/products | jq .

echo ""
echo "4. Create a Product..."
PRODUCT_ID=$(curl -s -X POST $API_URL/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demo Product",
    "description": "A test product for KubeCon demo",
    "price": 99.99
  }' | jq -r '.id')

echo "Created product with ID: $PRODUCT_ID"

echo ""
echo "5. Get Product by ID..."
curl -s $API_URL/products/$PRODUCT_ID | jq .

echo ""
echo "6. List Products (should have 1 product)..."
curl -s $API_URL/products | jq .

echo ""
echo "7. Delete Product..."
curl -s -X DELETE $API_URL/products/$PRODUCT_ID | jq .

echo ""
echo "8. List Products (should be empty again)..."
curl -s $API_URL/products | jq .

echo ""
echo "========================================"
echo "All tests completed successfully!"
