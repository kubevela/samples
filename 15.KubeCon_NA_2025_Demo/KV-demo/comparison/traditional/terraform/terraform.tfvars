# AWS Configuration
aws_region = "us-west-2"

# S3 Bucket Configuration
bucket_name        = "tenant-atlantis-product-images-traditional"
enable_versioning  = false

# IAM Configuration
# Set to true if you have IAM permissions to create roles
# Set to false to use an existing role (specified in existing_iam_role_arn)
create_iam_resources = false
existing_iam_role_arn = "arn:aws:iam::627188849628:role/aws_gwre-ccs-dev_tenant_atlantis_developer"

# Environment
environment = "dev"
namespace   = "default"

# OIDC Provider (for IRSA) - Update these values for your cluster
# oidc_provider_arn = "arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-west-2.amazonaws.com/id/EXAMPLE"
# oidc_provider_url = "oidc.eks.us-west-2.amazonaws.com/id/EXAMPLE"
