# S3 Bucket for Product Images
resource "aws_s3_bucket" "product_images" {
  bucket = var.bucket_name

  tags = merge(
    var.common_tags,
    {
      Name        = var.bucket_name
      Environment = var.environment
    }
  )
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "product_images" {
  bucket = aws_s3_bucket.product_images.id

  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Suspended"
  }
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "product_images" {
  bucket = aws_s3_bucket.product_images.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# IAM Role for Kubernetes Service Account (IRSA)
# Only created if create_iam_resources is true
resource "aws_iam_role" "product_api" {
  count = var.create_iam_resources ? 1 : 0
  name  = "${var.namespace}-product-api-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${var.oidc_provider_url}:sub" = "system:serviceaccount:${var.namespace}:product-api-sa"
            "${var.oidc_provider_url}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = merge(
    var.common_tags,
    {
      Name = "${var.namespace}-product-api-role"
    }
  )
}

# IAM Policy for S3 Access
# Only created if create_iam_resources is true
resource "aws_iam_policy" "s3_access" {
  count       = var.create_iam_resources ? 1 : 0
  name        = "${var.namespace}-product-api-s3-policy"
  description = "Policy for product API to access S3 bucket"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.product_images.arn,
          "${aws_s3_bucket.product_images.arn}/*"
        ]
      }
    ]
  })

  tags = var.common_tags
}

# Attach Policy to Role
# Only created if create_iam_resources is true
resource "aws_iam_role_policy_attachment" "product_api_s3" {
  count      = var.create_iam_resources ? 1 : 0
  role       = aws_iam_role.product_api[0].name
  policy_arn = aws_iam_policy.s3_access[0].arn
}
