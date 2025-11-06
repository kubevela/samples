# KubeCon NA 2025 Demo - Setup Guide

This directory contains notebooks and scripts for the KubeCon NA 2025 demo showcasing Crossplane, KubeVela, and OAM components.

## Quick Start

1. **Setup Environment** - Run `00_Env-setup.ipynb`
2. **OAM Contribution Demo** - Run `01_OAM-contrib.ipynb`
3. **Cleanup OAM Demo** - Run `01-OAM-cleanup.ipynb`
4. **Cleanup Environment** - Run `00-Env-cleanup.ipynb`

## Files Overview

### Notebooks
- **`00_Env-setup.ipynb`** - Complete environment setup (k3d, Crossplane, KubeVela, AWS provider)
- **`01_OAM-contrib.ipynb`** - Simplified DynamoDB OAM component contribution workflow
- **`01-OAM-cleanup.ipynb`** - Cleanup for OAM demo resources
- **`00-Env-cleanup.ipynb`** - Complete environment teardown

### Configuration Files
- **`config.yaml`** - Cluster and component configuration
- **`.env.aws`** - AWS credentials (you must create this)
- **`.env.sh`** - Auto-generated environment variables

## AWS Credentials Setup

To use AWS resources with Crossplane, you need to configure AWS credentials.

### Step 1: Create `.env.aws` File

A template has been created at `.env.aws`. Edit it with your credentials:

```bash
# .env.aws
AWS_ACCESS_KEY_ID=your-actual-access-key-id
AWS_SECRET_ACCESS_KEY=your-actual-secret-access-key_
AWS_SESSION_TOKEN=your-actual-session-token
AWS_DEFAULT_REGION=us-west-2
```

### Step 2: Set File Permissions

Protect your credentials:

```bash
chmod 600 .env.aws
```

### Step 3: Run Setup

The `00_Env-setup.ipynb` notebook will automatically:
1. Read credentials from `.env.aws`
2. Install the Crossplane AWS provider
3. Create a Kubernetes secret with your credentials
4. Configure the provider to use those credentials

### Important Security Notes

- ✅ `.env.aws` is in `.gitignore` - **never commit credentials to git**
- ✅ Use IAM roles in production instead of static credentials
- ✅ Ensure file permissions are restrictive (`chmod 600`)
- ✅ Rotate credentials regularly
- ✅ Use least-privilege IAM policies

### AWS IAM Permissions

Your AWS credentials need permissions to create DynamoDB tables. Minimum IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:CreateTable",
        "dynamodb:DescribeTable",
        "dynamodb:DeleteTable",
        "dynamodb:UpdateTable",
        "dynamodb:ListTables",
        "dynamodb:TagResource",
        "dynamodb:UntagResource"
      ],
      "Resource": "*"
    }
  ]
}
```

## Prerequisites

### Required Tools
- **k3d** - Lightweight Kubernetes: https://k3d.io/
- **kubectl** - Kubernetes CLI: https://kubernetes.io/docs/tasks/tools/
- **helm** - Kubernetes package manager: https://helm.sh/docs/intro/install/
- **Python 3.x** - With pip
- **vela CLI** - For ComponentDefinition management: https://kubevela.io/docs/installation/standalone

## Setup Steps

### 1. Install Prerequisites

```bash
# Install k3d
curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash

# Install kubectl
# See: https://kubernetes.io/docs/tasks/tools/

# Install helm
# See: https://helm.sh/docs/intro/install/

# Install vela CLI (optional)
curl -fsSl https://kubevela.io/script/install.sh | bash
```

### 2. Configure AWS Credentials

Create and edit `.env.aws`:

```bash
cp .env.aws.template .env.aws  # If you have a template
# OR create manually
nano .env.aws
```

Add your credentials:
```bash
AWS_ACCESS_KEY_ID='ASIA ...'
AWS_SECRET_ACCESS_KEY='wJalrX ...'
AWS_SESSION_TOKEN='IQoJb3JpZ2luX2VjEK3////// ...'
AWS_DEFAULT_REGION=us-west-2
```

### 3. Run Setup Notebook

Open and run `00_Env-setup.ipynb` in Jupyter:

```bash
jupyter notebook "00_Env-setup.ipynb"
```

Or use the VS Code Jupyter extension.

## Troubleshooting

### AWS Provider Issues

**Problem:** Provider not installing
```bash
kubectl get providers
kubectl describe provider provider-aws-dynamodb
```

**Problem:** Credentials not working
```bash
kubectl get secret aws-credentials -n crossplane-system -o yaml
kubectl get providerconfig default -o yaml
```

**Problem:** DynamoDB table not creating
```bash
kubectl get table -A
kubectl describe table <table-name>
kubectl logs -n crossplane-system -l pkg.crossplane.io/provider=provider-aws-dynamodb
```

### General Issues

**Problem:** Ports already in use
- Change ports in `config.yaml`
- Or stop services using ports 6443, 8090

**Problem:** kubectl context not switching
- Manually switch: `kubectl config use-context k3d-kubecon-demo`

**Problem:** CRDs not appearing
- Wait longer (can take 1-2 minutes)
- Check Crossplane logs: `kubectl logs -n crossplane-system -l app=crossplane`

## Cleanup

### Quick Cleanup (OAM Demo Only)
```bash
jupyter notebook "01-OAM-cleanup.ipynb"
```

### Complete Cleanup (Everything)
```bash
jupyter notebook "00-Env-cleanup.ipynb"
# OR manually
k3d cluster delete kubecon-demo
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│  KubeVela Applications (OAM)                    │
├─────────────────────────────────────────────────┤
│  ComponentDefinitions (CUE)                     │
├─────────────────────────────────────────────────┤
│  Crossplane Composite Resources (XRD)           │
├─────────────────────────────────────────────────┤
│  Crossplane Compositions                        │
├─────────────────────────────────────────────────┤
│  Crossplane AWS Provider                        │
├─────────────────────────────────────────────────┤
│  AWS DynamoDB (via provider-aws-dynamodb)       │
└─────────────────────────────────────────────────┘
```

## Security Best Practices

1. **Never commit `.env.aws`** - It's in `.gitignore`
2. **Use IAM roles in production** - Not static credentials
3. **Rotate credentials regularly**
4. **Use least-privilege policies**
5. **Enable MFA on AWS accounts**
6. **Monitor CloudTrail for API usage**
7. **Use AWS Secrets Manager** for production

## Additional Resources

- [Crossplane Documentation](https://docs.crossplane.io/)
- [KubeVela Documentation](https://kubevela.io/)
- [OAM Specification](https://oam.dev/)
- [k3d Documentation](https://k3d.io/)
- [AWS Provider Documentation](https://marketplace.upbound.io/providers/upbound/provider-aws/)

## License

This demo is for educational purposes.
