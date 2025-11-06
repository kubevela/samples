terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Using local backend for demo purposes
  # In production, use S3 backend with state locking
}

provider "aws" {
  region = var.aws_region

  # Use environment variables for credentials
  # AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN
  # These should be sourced from .env.aws

  default_tags {
    tags = var.common_tags
  }
}
