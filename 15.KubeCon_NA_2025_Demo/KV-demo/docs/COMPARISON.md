# Traditional vs KubeVela Comparison

## Quick Summary

| Aspect | Traditional | KubeVela | Improvement |
|--------|-------------|----------|-------------|
| **Files per app** | 6 | 1 | 83% fewer |
| **Lines per app** | 437 | 171 | 61% less |
| **Tools** | Terraform + K8s + CI/CD | KubeVela | Unified |
| **Workflow** | External (249 lines) | Built-in | Integrated |
| **Infrastructure** | Separate Terraform | Components | Reusable |

## Traditional Approach

**Structure:**
```
terraform/     # 243 lines (one-time)
  - S3 bucket: tenant-atlantis-product-images-traditional
  - IAM: Role ARN configured via ServiceAccount annotation

k8s/          # 188 lines (per-app)
  - ServiceAccount, ConfigMap, Deployment, Service, HPA
  - Image: product-catalog-api:v1.0.0-traditional

.github/workflows/deploy.yml  # 249 lines (per-app)
  - CI/CD orchestration

deploy-local.sh  # Local deployment script
```

**Deployment:**
```bash
./deploy-local.sh --cleanup dev
```

**Key Points:**
- Manual coordination between Terraform, Docker, and K8s
- Separate files for each concern
- Environment-specific values require manual updates or templating

## KubeVela Approach

**Structure:**
```
crossplane/    # 269 lines (one-time)
  - XRD and Composition for S3

components/    # 76 lines (one-time)
  - ComponentDefinition for simple-s3

application.yaml  # 171 lines (per-app)
  - Components: webservice + simple-s3
  - Traits: HPA, SecurityContext, Resources
  - Workflow: dev → staging → prod
  - Policies: Environment-specific overrides
```

**Deployment:**
```bash
vela up -f application.yaml
```

**Key Points:**
- Single file defines everything
- Built-in workflow with approval gates
- Policy-driven environment configuration
- Infrastructure as application components

## Code Examples

### Security Context

**Traditional (k8s/deployment.yaml):**
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000
  seccompProfile:
    type: RuntimeDefault
containers:
  - name: api
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      runAsNonRoot: true
      runAsUser: 1000
      capabilities:
        drop: [ALL]
```

**KubeVela (application.yaml):**
```yaml
traits:
  - type: podsecuritycontext
    properties:
      runAsNonRoot: true
      runAsUser: 1000
      fsGroup: 1000
      seccompProfile:
        type: RuntimeDefault
```

### Multi-Environment Configuration

**Traditional:**
- Duplicate K8s manifests per environment, OR
- Complex templating with Helm/Kustomize, OR
- CI/CD variables and conditionals

**KubeVela:**
```yaml
policies:
  - name: topology-dev
    type: topology
    properties:
      namespace: dev
  - name: override-dev
    type: override
    properties:
      components:
        - name: product-api
          traits:
            - type: hpa
              properties:
                minReplicas: 1
                maxReplicas: 3
```

### Workflow

**Traditional (.github/workflows/deploy.yml):** 249 lines
- Build job
- Test job
- Deploy to dev
- Deploy to staging (manual approval)
- Deploy to prod (manual approval)

**KubeVela (application.yaml):**
```yaml
workflow:
  steps:
    - name: deploy-dev
      type: deploy2env
      properties:
        policy: topology-dev
        env: dev
    - name: approval-staging
      type: suspend
    - name: deploy-staging
      type: deploy2env
      properties:
        policy: topology-staging
        env: staging
    - name: approval-prod
      type: suspend
    - name: deploy-prod
      type: deploy2env
      properties:
        policy: topology-prod
        env: prod
```

## Resource Naming

To avoid conflicts, the traditional approach uses different names:

| Resource | Traditional | KubeVela |
|----------|-------------|----------|
| S3 Bucket | `tenant-atlantis-product-images-traditional` | `tenant-atlantis-product-images` |
| Image Tag | `v1.0.0-traditional` | `v1.0.0` |
| IAM Role | Role ARN placeholder (injected at deploy) | Crossplane-managed |

## Key Advantages of KubeVela

1. **Single Source of Truth**: One file for app, infrastructure, and deployment
2. **No External CI/CD**: Built-in workflow engine
3. **Reusable Components**: Infrastructure as platform capabilities
4. **Policy-Driven**: DRY principle for multi-environment configs
5. **Kubernetes-Native**: Uses K8s as control plane and state store

## When to Use Each

**Traditional Approach:**
- Team already deeply invested in Terraform
- Need explicit state file management
- Prefer external CI/CD tools
- Simple single-environment deployments

**KubeVela Approach:**
- Platform engineering teams building internal developer platforms
- Multi-environment deployments with progressive delivery
- Want to reduce tooling complexity
- Kubernetes-native workflows preferred
