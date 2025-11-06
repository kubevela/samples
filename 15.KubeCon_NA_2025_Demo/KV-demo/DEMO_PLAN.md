# KubeVela Power Demo - Plan & Architecture

## Executive Summary

This demo showcases the power and simplicity of KubeVela's unified application delivery model compared to traditional approaches. We'll demonstrate a real-world application deployment that includes:
- Kubernetes resources (Deployment, Service)
- AWS infrastructure (S3 bucket)
- Application lifecycle management (workflow, policies, traits)

## Demo Scenario: "Product Catalog Service"

A microservice that:
1. Runs a containerized API (K8s Deployment + Service)
2. Stores product images in S3
3. Requires multi-stage deployment (dev → staging → prod)
4. Needs auto-scaling and monitoring

## Comparison Matrix

| Aspect | Traditional Approach | KubeVela Approach |
|--------|---------------------|-------------------|
| **K8s Resources** | Raw YAML manifests (188 lines) | Component definitions with sensible defaults |
| **Infrastructure** | Separate Terraform files + state management | S3 component in same application.yaml |
| **Orchestration** | External CI/CD pipeline (Jenkins/GitHub Actions) | Built-in workflow in application.yaml |
| **Configuration** | Multiple config files, hard-coded values | Traits for cross-cutting concerns |
| **Developer Experience** | Must understand K8s, Terraform, CI/CD | Focus on business requirements |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              KubeVela Application                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Components:                                            │
│    ├─ product-api (webservice)                         │
│    └─ product-images (simple-s3)                       │
│                                                          │
│  Traits:                                                │
│    ├─ hpa (horizontal pod autoscaler)                  │
│    ├─ security-context (pod security settings)         │
│    └─ resource (CPU/memory limits & requests)          │
│                                                          │
│  Workflow:                                              │
│    ├─ deploy-dev                                        │
│    ├─ manual-approval                                   │
│    ├─ deploy-staging                                    │
│    ├─ health-check                                      │
│    └─ deploy-prod                                       │
│                                                          │
│  Policy:                                                │
│    └─ topology (multi-cluster)                         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Detailed Comparison Scenarios

### Scenario 1: Traditional Approach - Kubernetes + Terraform + CI/CD

**What you need:**

**A. Kubernetes Manifests:**
- deployment.yaml (104 lines)
  - Container specs, replicas, labels
  - Environment variables, volume mounts
- service.yaml (17 lines)
- hpa.yaml (44 lines)
  - Min/max replicas, target CPU
- serviceaccount.yaml (11 lines)
  - IAM role annotation
- configmap.yaml (12 lines)
- Total: 188 lines across 5 YAML files

**B. Terraform Files (HCL):**
- **provider.tf** (25 lines)
  ```hcl
  terraform {
    required_version = "1.5.7"
    required_providers {
      aws = {
        source  = "hashicorp/aws"
        version = "~> 5.0"
      }
    }
    backend "s3" {
      # State management configuration
      bucket = "terraform-state-bucket"
      key    = "product-catalog/terraform.tfstate"
      region = "us-west-2"
    }
  }

  provider "aws" {
    region = var.aws_region
  }
  ```

- **main.tf** (101 lines)
  ```hcl
  # S3 Bucket for product images
  resource "aws_s3_bucket" "product_images" {
    bucket = "tenant-atlantis-product-images"

    tags = {
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

  # IAM Role for pod
  resource "aws_iam_role" "product_api_role" {
    name = "tenant-atlantis-product-api-role"
    # ... assume role policy
  }

  # IAM Policy for S3 access
  resource "aws_iam_policy" "s3_access" {
    # ... S3 bucket permissions
  }
  ```

- **variables.tf** (68 lines)
- **outputs.tf** (29 lines)
- **terraform.tfvars** (20 lines)
- Total: 243 lines across 4 Terraform files

**C. CI/CD Pipeline (GitHub Actions):**
- **.github/workflows/deploy.yml** (249 lines)
  ```yaml
  name: Deploy Product Catalog
  on:
    push:
      branches: [main]

  jobs:
    terraform:
      - terraform init
      - terraform plan
      - terraform apply

    deploy-k8s:
      - kubectl apply -f deployment.yaml
      - kubectl apply -f service.yaml
      - kubectl apply -f hpa.yaml
      - kubectl apply -f security-context.yaml

    approval:
      - manual approval step

    deploy-prod:
      - repeat for production
  ```

**Total: 680 lines across 10 files in 3 different tools** (243 Terraform + 188 K8s + 249 CI/CD)

**Pain points:**
- Context switching between K8s YAML, HCL, and CI/CD pipeline YAML
- Terraform state management complexity
- Pipeline configuration complexity
- Credential management across tools (AWS creds in CI/CD + kubeconfig)
- Manual coordination between infrastructure and application
- No unified view of application
- Separate HPA, SecurityContext, and Resource manifests to manage
- Manual orchestration of multi-stage deployments

### Scenario 2: KubeVela (The Better Way)

**What you need:**
- application.yaml (171 lines total)
- Component definitions (reusable, platform-provided)
- **Total: 171 lines in 1 file**

**Benefits:**
- Single source of truth
- Built-in workflow orchestration
- Infrastructure as components
- Business-focused configuration
- Platform defaults applied automatically
- Unified observability

## Sample Microservice Application

### Python3 Boto3 Application
To make the demo as local as possible, we'll use a simple Python3 Flask + boto3 application:

**Application: Product Catalog API**
- **Language**: Python 3.11+
- **Framework**: Flask (lightweight REST API)
- **AWS SDK**: boto3 (for S3 operations)
- **Container Registry**: Local registry in k3d cluster (localhost:5000)
- **Features**:
  - `GET /products` - List products (reads from local DB)
  - `POST /products` - Create product with image upload (stores image in S3)
  - `GET /products/{id}` - Get product with S3 signed URL for image
  - Health check endpoint

**Docker Setup:**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
CMD ["python", "app.py"]
```

**Local Registry in k3d:**
```bash
# k3d cluster already includes registry
# Push to: localhost:5000/product-api:v1.0.0
docker build -t localhost:5000/product-api:v1.0.0 .
docker push localhost:5000/product-api:v1.0.0
```

**AWS Resources (Only External Dependencies):**
- S3 bucket for product images
- IAM role/policy for S3 access (via IRSA - IAM Roles for Service Accounts)

**Everything else runs locally:**
- Application pods in k3d
- Database (optional: local PostgreSQL or in-memory)
- No external CI/CD services

## Demo Flow

### Part 1: The Traditional Way (Show the Pain)

**Show the complete traditional stack** (10 files, 680 lines):

1. **Terraform Infrastructure** (HCL files)
   - provider.tf with version constraints
   - main.tf with S3 bucket and IAM resources
   - variables.tf, outputs.tf, terraform.tfvars
   - Highlight: State management, AWS credentials, resource tagging

2. **Kubernetes Manifests** (multiple YAML files)
   - deployment.yaml with container specs
   - service.yaml
   - hpa.yaml (separate auto-scaling config)
   - security-context patches
   - resource limits/requests
   - Highlight: Scattered configuration, repetition, manual coordination

3. **CI/CD Pipeline** (GitHub Actions YAML)
   - terraform init/plan/apply
   - kubectl apply commands
   - manual approval gates
   - Highlight: Pipeline complexity, credential management

**Key pain points to emphasize:**
- Three different languages/tools (HCL, K8s YAML, GitHub Actions YAML)
- Terraform state file management
- Manual coordination between infra and app deployment
- No unified view of the entire application

### Part 2: The KubeVela Way (Show the Power)

1. **Show single application.yaml** (1 file, 171 lines vs 6 files, 437 lines)
   - Clean, business-focused
   - Components with defaults
   - Built-in workflow
   - Infrastructure included

2. **Live demo:**
   ```bash
   vela up -f application.yaml
   vela workflow suspend my-app --step manual-approval
   vela workflow resume my-app
   vela status my-app
   ```

3. **Show what happened behind the scenes:**
   - S3 bucket created via Crossplane
   - Deployment scaled automatically
   - Multi-stage workflow executed
   - All from one file!

## Key Talking Points

### 1. Abstraction Done Right
- Developers don't need to be K8s experts
- Platform team provides components with sensible defaults
- Business requirements, not technical details

### 2. Infrastructure as Components
- S3 bucket is just another component
- No Terraform state to manage
- No separate infrastructure pipeline
- Unified with application lifecycle
- **All AWS resources must include proper tagging** for governance and cost tracking (see 01_OAM-contrib.ipynb for tag structure)

### 3. Built-in Workflow vs External CI/CD
- No separate pipeline configuration
- Workflow is part of the application definition
- Portable across environments
- Version controlled with the app

### 4. Traits for Cross-Cutting Concerns
- HPA (Horizontal Pod Autoscaler) for auto-scaling
- Security Context for pod security settings
- Resource limits and requests for resource management
- Applied declaratively
- Reusable across applications
- No manual coordination

### 5. Progressive Delivery Built-in
- Multi-stage deployment
- Manual approval gates
- Health checks
- Rollback capabilities

## Demo Artifacts to Create

### 1. Sample Application (`/app/`)
- `app.py` - Flask application with boto3 S3 integration
- `requirements.txt` - Python dependencies (flask, boto3, etc.)
- `Dockerfile` - Container image definition
- `README.md` - Application documentation
- `test_api.sh` - Simple test script

### 2. Traditional Approach (`/comparison/traditional/`)

#### a. Terraform Infrastructure (`terraform/`)
- `provider.tf` - Terraform and AWS provider configuration with version 1.5.7
- `main.tf` - S3 bucket, IAM role, IAM policy with proper tags
- `variables.tf` - Input variables (bucket name, region, tags)
- `outputs.tf` - Output values (bucket ARN, IAM role ARN)
- `terraform.tfvars` - Variable values
- `backend.tf` - S3 backend for state management

#### b. Kubernetes Manifests (`k8s/`)
- `deployment.yaml` - Application deployment with volume mounts, env vars
- `service.yaml` - ClusterIP service
- `hpa.yaml` - Horizontal Pod Autoscaler (min: 2, max: 10)
- `resources.yaml` - ResourceQuota and LimitRange
- `security-context.yaml` - PodSecurityPolicy or SecurityContext patches
- `serviceaccount.yaml` - ServiceAccount with IAM role annotation
- `configmap.yaml` - Application configuration

#### c. CI/CD Pipeline (`.github/workflows/`)
- `deploy.yml` - Complete deployment pipeline
  - Terraform plan/apply
  - Docker build and push to registry
  - kubectl apply K8s resources
  - Manual approval gates
  - Multi-environment deployment (dev → staging → prod)

#### d. Documentation
- `README.md` - Setup instructions, prerequisites, deployment steps

### 3. KubeVela Approach (`/kubevela/`)

#### a. Crossplane S3 Component (`crossplane/s3/`)
- `xrd.yaml` - CompositeResourceDefinition for S3 bucket
  - Define simple Experience API (bucket name, region, tags)
  - Use Crossplane v2 API with Cluster scope
- `composition.yaml` - Composition using Pipeline mode
  - Create aws_s3_bucket resource
  - Create aws_iam_role for IRSA
  - Create aws_iam_policy with S3 permissions
  - Patch tenant-atlantis prefix
  - Apply standard tags automatically
  - Use function-patch-and-transform

#### b. KubeVela ComponentDefinition (`components/`)
- `s3/s3-bucket.cue` - ComponentDefinition for simple-s3
  - Wraps Crossplane XRD
  - Adds health policy
  - Adds custom status
  - Enforces naming convention and tags
- `webservice/webservice.cue` (if not using built-in)
  - Standard webservice component
  - With HPA, SecurityContext, Resource traits applied

#### c. Application Definition
- `application.yaml` - **The star of the show!**
  - Components: product-api (webservice), product-images (simple-s3)
  - Traits: hpa, security-context, resource
  - Workflow: deploy-dev → approval → deploy-staging → approval → deploy-prod
  - Policy: topology for multi-namespace deployment

#### d. Local Development Setup
- `local-setup.sh` - Script to build and push app to local registry
- `test-local.sh` - Test the deployed application

#### e. Documentation
- `README.md` - Usage guide and comparison
- `DEMO_SCRIPT.md` - Step-by-step demo presentation

### 4. Documentation (`/docs/`)
- `COMPARISON.md` - Side-by-side feature comparison table
- `CROSSPLANE_DETAILS.md` - Deep dive on XRD and Composition
- `WALKTHROUGH.md` - Complete demo walkthrough script
- `ARCHITECTURE.md` - Technical architecture diagrams

## Success Criteria

By the end of the demo, the audience should understand:

1. ✅ KubeVela reduces complexity (1 file vs 6 files per app, 83% fewer)
2. ✅ Infrastructure can be treated as components
3. ✅ Workflows eliminate external CI/CD for deployments
4. ✅ Traits provide reusable cross-cutting concerns
5. ✅ Developers focus on business value, not K8s details
6. ✅ Platform teams provide opinionated, secure defaults

## Technical Requirements

### Prerequisites (from 00_Env-setup.ipynb)
- ✅ k3d cluster running
- ✅ Crossplane installed
- ✅ Crossplane AWS Provider configured
- ✅ KubeVela installed
- ✅ **Terraform v1.5.7** - Verify with `terraform version` (recommended: use tfenv or similar version manager)
  ```bash
  # Check Terraform version
  terraform version

  # If using tfenv
  tfenv install 1.5.7
  tfenv use 1.5.7
  ```
- ✅ AWS credentials configured from `../.env.aws` file
  - AWS_ACCESS_KEY_ID
  - AWS_SECRET_ACCESS_KEY
  - AWS_SESSION_TOKEN (if using temporary credentials)
  - AWS_DEFAULT_REGION (default: us-west-2)

### New Components to Create
1. **S3 Component** (similar to DynamoDB example in 01_OAM-contrib.ipynb)
   - XRD for S3 bucket
   - Composition with sensible defaults
   - ComponentDefinition in CUE
   - **IMPORTANT**: Must include AWS resource tags following the pattern from DynamoDB example:
     ```yaml
     tags:
       "gwcp:v1:dept": "000"
       "gwcp:v1:provisioned-resource:created-by": "kubecon-demo"
       "gwcp:v1:quadrant:name": "dev"
       "gwcp:v1:resource-type:managed-by": "pod-atlantis"
       "gwcp:v1:resource-type:managed-tool": "crossplane"
       "gwcp:v1:star-system:name": "kubecon"
       "gwcp:v1:tenant:name": "atlantis"
       "gwcp:v1:tenant:app-name": context.appName
     ```
   - Resource naming convention: `tenant-atlantis-{name}` prefix

2. **Webservice Component** (may already exist)
   - Standard deployment + service pattern
   - With configurable replicas, image, ports

### Workflow Steps to Demonstrate
1. Deploy to dev namespace
2. Run integration tests (simulated)
3. Manual approval gate
4. Deploy to staging namespace
5. Health check validation
6. Deploy to prod namespace

### Traits to Use
1. `hpa` - Horizontal Pod Autoscaler trait
   - Auto-scaling based on CPU/memory metrics
   - Min/max replica configuration

2. `security-context` - Pod/Container security settings trait
   - Run as non-root user
   - Read-only root filesystem
   - Drop capabilities
   - Security best practices

3. `resource` - Resource limits and requests trait
   - CPU limits and requests
   - Memory limits and requests
   - Resource quotas

## Timeline

1. **Prerequisites verification** (~15 mins)
   - Verify Terraform v1.5.7 is installed
   - Verify AWS credentials from ../.env.aws are properly configured
   - Test AWS connectivity
   - Verify k3d cluster has local registry available

2. **Create sample Python3 application** (~45 mins)
   - Flask API with boto3 S3 integration
   - Dockerfile for containerization
   - Build and push to k3d local registry (localhost:5000)
   - Test script for API endpoints

3. **Create Crossplane S3 component** (~45 mins)
   - XRD for S3 bucket (following DynamoDB example structure)
   - Composition with Pipeline mode
     - S3 bucket resource with versioning
     - IAM role for IRSA
     - IAM policy for S3 access
   - Include proper AWS resource tags
   - Implement tenant-atlantis naming prefix
   - Test composite resource directly

4. **Create traditional approach artifacts** (~60 mins)
   - Terraform files (provider.tf, main.tf, variables.tf, outputs.tf, backend.tf)
     - S3 bucket with tags
     - IAM resources
   - K8s manifests (deployment, service, hpa, resources, security-context, serviceaccount, configmap)
   - CI/CD pipeline YAML (GitHub Actions)
   - README with setup instructions

5. **Create KubeVela solution** (~45 mins)
   - KubeVela ComponentDefinition for S3 (CUE file)
   - Main application.yaml
     - product-api component (webservice)
     - product-images component (simple-s3)
     - Traits: hpa, security-context, resource
     - Workflow: dev → approval → staging → approval → prod
   - Local setup scripts

6. **Create documentation** (~30 mins)
   - COMPARISON.md (side-by-side)
   - CROSSPLANE_DETAILS.md (XRD/Composition deep dive)
   - WALKTHROUGH.md (demo script)
   - DEMO_SCRIPT.md (presentation guide)

7. **Test everything** (~40 mins)
   - Test traditional approach end-to-end
   - Test KubeVela application deployment
   - Verify AWS S3 bucket creation with tags
   - Test API endpoints with S3 integration
   - Verify HPA, SecurityContext, Resource traits
   - Refine based on findings

**Total: ~4.5 hours of work**

## Next Steps

1. ✅ Review and approve this plan
2. Verify prerequisites:
   - Check Terraform v1.5.7 installation (`terraform version`)
   - Verify AWS credentials from `../.env.aws`
   - Test AWS connectivity
   - Verify k3d registry: `docker pull localhost:5000/test || echo "Registry ready"`
3. Create directory structure:
   ```
   KV-demo/
   ├── app/                    # Python Flask + boto3 application
   ├── comparison/
   │   └── traditional/        # Combined K8s + Terraform + CI/CD
   │       ├── terraform/
   │       ├── k8s/
   │       └── .github/workflows/
   ├── kubevela/
   │   ├── crossplane/s3/      # XRD and Composition
   │   ├── components/         # ComponentDefinition CUE files
   │   └── application.yaml    # Main application
   └── docs/                   # Documentation
   ```
4. Build sample Python3 application:
   - Flask API with S3 integration
   - Containerize and push to local registry
5. Create Crossplane S3 component:
   - Follow DynamoDB example from 01_OAM-contrib.ipynb
   - XRD, Composition with IAM resources
   - Include proper AWS resource tags
   - Implement tenant-atlantis naming prefix
6. Build traditional approach artifacts:
   - Complete Terraform HCL files
   - Full K8s manifests with HPA, SecurityContext, Resources
   - CI/CD pipeline YAML
7. Build KubeVela solution:
   - ComponentDefinition for S3
   - Application YAML with traits and workflow
8. Create comprehensive documentation
9. Test both approaches end-to-end
10. Refine and prepare demo presentation
