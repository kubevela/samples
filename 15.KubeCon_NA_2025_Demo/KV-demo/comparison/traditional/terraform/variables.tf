variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "bucket_name" {
  description = "Name of the S3 bucket for product images"
  type        = string
  default     = "tenant-atlantis-product-images-traditional"
}

variable "enable_versioning" {
  description = "Enable versioning on the S3 bucket"
  type        = bool
  default     = false
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "namespace" {
  description = "Kubernetes namespace"
  type        = string
  default     = "default"
}

variable "oidc_provider_arn" {
  description = "ARN of the OIDC provider for EKS/k3d"
  type        = string
  default     = ""
}

variable "oidc_provider_url" {
  description = "URL of the OIDC provider"
  type        = string
  default     = ""
}

variable "create_iam_resources" {
  description = "Whether to create IAM role and policy. Set to false if you lack IAM permissions."
  type        = bool
  default     = false
}

variable "existing_iam_role_arn" {
  description = "ARN of existing IAM role to use when create_iam_resources is false"
  type        = string
  default     = "arn:aws:iam::627188849628:role/aws_gwre-ccs-dev_tenant_atlantis_developer"
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    "gwcp:v1:dept"                            = "000"
    "gwcp:v1:provisioned-resource:created-by" = "kubecon-demo"
    "gwcp:v1:quadrant:name"                   = "dev"
    "gwcp:v1:resource-type:managed-by"        = "pod-atlantis"
    "gwcp:v1:resource-type:managed-tool"      = "terraform"
    "gwcp:v1:star-system:name"                = "kubecon"
    "gwcp:v1:tenant:name"                     = "atlantis"
    "gwcp:v1:tenant:app-name"                 = "product-catalog"
  }
}
