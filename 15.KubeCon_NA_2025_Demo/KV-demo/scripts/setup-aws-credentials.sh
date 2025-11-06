#!/bin/bash
set -e

echo "=== Setting up AWS Credentials for Application Namespaces ==="

# Source directory
CLUSTER_NAME="${CLUSTER_NAME:-kubecon-demo}"
SOURCE_NAMESPACE="crossplane-system"
SECRET_NAME="aws-credentials"
TARGET_NAMESPACES=("dev" "staging" "prod")

echo "Copying AWS credentials secret from ${SOURCE_NAMESPACE} to application namespaces..."

# Function to copy secret to a namespace
copy_secret_to_namespace() {
    local target_ns=$1

    echo ""
    echo "Processing namespace: ${target_ns}"

    # Create namespace if it doesn't exist
    if ! kubectl get namespace ${target_ns} &>/dev/null; then
        echo "  Creating namespace ${target_ns}..."
        kubectl create namespace ${target_ns}
    else
        echo "  ✓ Namespace ${target_ns} exists"
    fi

    # Get secret from source namespace and apply to target
    echo "  Copying secret ${SECRET_NAME}..."
    if kubectl get secret ${SECRET_NAME} -n ${SOURCE_NAMESPACE} &>/dev/null; then
        kubectl get secret ${SECRET_NAME} -n ${SOURCE_NAMESPACE} -o yaml | \
            sed "s/namespace: ${SOURCE_NAMESPACE}/namespace: ${target_ns}/" | \
            kubectl apply -f -
        echo "  ✓ Secret ${SECRET_NAME} copied to ${target_ns}"
    else
        echo "  ✗ Secret ${SECRET_NAME} not found in ${SOURCE_NAMESPACE}"
        return 1
    fi
}

# Copy secret to each target namespace
for ns in "${TARGET_NAMESPACES[@]}"; do
    copy_secret_to_namespace "$ns"
done

echo ""
echo "=== AWS Credentials Setup Complete ==="
echo "✓ Secret '${SECRET_NAME}' has been copied to:"
for ns in "${TARGET_NAMESPACES[@]}"; do
    echo "  - ${ns}"
done

echo ""
echo "Verifying secrets..."
for ns in "${TARGET_NAMESPACES[@]}"; do
    if kubectl get secret ${SECRET_NAME} -n ${ns} &>/dev/null; then
        echo "  ✓ ${ns}: secret exists"
    else
        echo "  ✗ ${ns}: secret NOT found"
    fi
done
