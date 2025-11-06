# Dagger Pipeline for Traditional Approach

Modern CI/CD alternative to bash scripts.

## Quick Start

```bash
# Install Dagger
curl -L https://dl.dagger.io/dagger/install.sh | sudo sh

# Run pipeline
cd dagger
go mod download
export ENVIRONMENT=dev IMAGE_TAG=v1.0.0-traditional
go run main.go
```

## What It Does

1. Terraform: Creates S3 bucket
2. Build: Builds and pushes Docker image
3. Deploy: Applies Kubernetes manifests
4. Verify: Waits for rollout

## Why Dagger?

- **Portable**: Same locally and in CI
- **Language-native**: Go (not YAML)
- **Container-based**: Reproducible builds
- **Local testing**: No need for CI runners

## Comparison

| Aspect | GitHub Actions | Dagger |
|--------|---------------|--------|
| Execution | Cloud/runners | Local + CI |
| Testing | Push to test | Run locally |
| Language | YAML | Go/Python/TS |
| Cost | CI minutes | Free locally |
