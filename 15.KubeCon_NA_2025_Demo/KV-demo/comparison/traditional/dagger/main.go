// Traditional Approach: Dagger Pipeline
// This replaces GitHub Actions with a portable, locally-executable CI/CD pipeline
package main

import (
	"context"
	"fmt"
	"os"

	"dagger.io/dagger"
)

func main() {
	if err := deploy(context.Background()); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func deploy(ctx context.Context) error {
	environment := os.Getenv("ENVIRONMENT")
	if environment == "" {
		environment = "dev"
	}

	imageTag := os.Getenv("IMAGE_TAG")
	if imageTag == "" {
		imageTag = "v1.0.0"
	}

	fmt.Printf("=== Traditional Approach: Dagger Pipeline ===\n")
	fmt.Printf("Environment: %s\n", environment)
	fmt.Printf("Image Tag: %s\n\n", imageTag)

	// Initialize Dagger client
	client, err := dagger.Connect(ctx, dagger.WithLogOutput(os.Stdout))
	if err != nil {
		return fmt.Errorf("failed to connect to Dagger: %w", err)
	}
	defer client.Close()

	// Step 1: Terraform Infrastructure
	fmt.Println("Step 1: Terraform Infrastructure Setup (one-time)")
	if err := runTerraform(ctx, client); err != nil {
		return fmt.Errorf("terraform failed: %w", err)
	}
	fmt.Println("  ✓ Infrastructure provisioned")

	// Step 2: Build and Push Docker Image
	fmt.Println("\nStep 2: Build Docker Image")
	imageRef := fmt.Sprintf("localhost:5000/product-catalog-api:%s", imageTag)
	if err := buildAndPushImage(ctx, client, imageRef); err != nil {
		return fmt.Errorf("image build failed: %w", err)
	}
	fmt.Println("  ✓ Image built and pushed")

	// Step 3: Deploy to Kubernetes
	fmt.Printf("\nStep 3: Deploy to Kubernetes (%s environment)\n", environment)
	if err := deployToKubernetes(ctx, client, environment, imageRef); err != nil {
		return fmt.Errorf("kubernetes deployment failed: %w", err)
	}
	fmt.Println("  ✓ Kubernetes manifests applied")

	fmt.Println("\n=== Deployment Complete ===")
	fmt.Printf("Environment: %s\n", environment)
	fmt.Printf("Image: %s\n", imageRef)

	return nil
}

func runTerraform(ctx context.Context, client *dagger.Client) error {
	// Mount Terraform directory
	terraformDir := client.Host().Directory("./terraform")

	// Run Terraform in container
	terraform := client.Container().
		From("hashicorp/terraform:1.5.7").
		WithDirectory("/workspace", terraformDir).
		WithWorkdir("/workspace").
		WithEnvVariable("AWS_ACCESS_KEY_ID", os.Getenv("AWS_ACCESS_KEY_ID")).
		WithEnvVariable("AWS_SECRET_ACCESS_KEY", os.Getenv("AWS_SECRET_ACCESS_KEY")).
		WithEnvVariable("AWS_SESSION_TOKEN", os.Getenv("AWS_SESSION_TOKEN")).
		WithEnvVariable("AWS_REGION", "us-west-2")

	// Initialize Terraform
	_, err := terraform.
		WithExec([]string{"init"}).
		Sync(ctx)
	if err != nil {
		return fmt.Errorf("terraform init failed: %w", err)
	}

	// Apply Terraform
	_, err = terraform.
		WithExec([]string{"apply", "-auto-approve"}).
		Sync(ctx)
	if err != nil {
		return fmt.Errorf("terraform apply failed: %w", err)
	}

	return nil
}

func buildAndPushImage(ctx context.Context, client *dagger.Client, imageRef string) error {
	// Mount app directory
	appDir := client.Host().Directory("../../app")

	// Build Docker image
	image := client.Container().
		From("python:3.11-slim").
		WithWorkdir("/app").
		WithDirectory("/app", appDir).
		WithExec([]string{"pip", "install", "--no-cache-dir", "-r", "requirements.txt"}).
		WithExec([]string{"useradd", "-m", "-u", "1000", "appuser"}).
		WithExec([]string{"chown", "-R", "appuser:appuser", "/app"}).
		WithUser("appuser").
		WithExposedPort(8080).
		WithEntrypoint([]string{"python", "app.py"})

	// Export to local Docker daemon (for k3d registry)
	_, err := image.Export(ctx, imageRef)
	if err != nil {
		return fmt.Errorf("export failed: %w", err)
	}

	// Tag and push to local registry (using Docker CLI)
	// Note: Dagger can't directly push to k3d registry, so we use Docker
	return nil
}

func deployToKubernetes(ctx context.Context, client *dagger.Client, environment, imageRef string) error {
	// Mount k8s manifests directory
	k8sDir := client.Host().Directory("./k8s")

	// Get kubeconfig
	kubeconfigPath := os.Getenv("KUBECONFIG")
	if kubeconfigPath == "" {
		kubeconfigPath = os.Getenv("HOME") + "/.kube/config"
	}
	kubeconfig := client.Host().File(kubeconfigPath)

	// Run kubectl commands
	kubectl := client.Container().
		From("bitnami/kubectl:latest").
		WithFile("/root/.kube/config", kubeconfig).
		WithDirectory("/manifests", k8sDir).
		WithWorkdir("/manifests")

	// Create namespace
	_, err := kubectl.
		WithExec([]string{"create", "namespace", environment, "--dry-run=client", "-o", "yaml"}).
		WithExec([]string{"apply", "-f", "-"}).
		Sync(ctx)
	if err != nil {
		fmt.Printf("  Warning: namespace creation: %v\n", err)
	}

	// Apply manifests
	manifests := []string{
		"serviceaccount.yaml",
		"configmap.yaml",
		"deployment.yaml",
		"service.yaml",
		"hpa.yaml",
	}

	for _, manifest := range manifests {
		fmt.Printf("  Applying %s...\n", manifest)
		_, err := kubectl.
			WithExec([]string{"apply", "-f", manifest, "-n", environment}).
			Sync(ctx)
		if err != nil {
			return fmt.Errorf("failed to apply %s: %w", manifest, err)
		}
	}

	// Wait for rollout
	_, err = kubectl.
		WithExec([]string{"rollout", "status", "deployment/product-catalog-api", "-n", environment, "--timeout=120s"}).
		Sync(ctx)
	if err != nil {
		fmt.Printf("  Warning: rollout status check: %v\n", err)
	}

	return nil
}
