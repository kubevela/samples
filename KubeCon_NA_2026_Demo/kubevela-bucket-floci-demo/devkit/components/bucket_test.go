package components

import (
	"reflect"
	"testing"

	"github.com/kubecon-na-2026/kubevela-bucket-floci-demo/devkit/internal/cuetest"
	"github.com/kubecon-na-2026/kubevela-bucket-floci-demo/devkit/internal/paramcheck"
	"github.com/oam-dev/kubevela/pkg/cue/definition/health"
	"github.com/oam-dev/kubevela/pkg/definition/defkit"
)

// stage is the KubeVela context of a component deployed to the aws-devkit stage.
var stage = map[string]any{"name": "product-images", "namespace": "aws-devkit"}

func render(t *testing.T, def cuetest.Definition, props BucketProperties) cuetest.Rendered {
	t.Helper()
	out, err := cuetest.Render(def, stage, props)
	if err != nil {
		t.Fatal(err)
	}
	return out
}

// ./demo.sh applies both bucket-aws-cue and bucket-aws-devkit, and the promotion
// swaps one for the other, so they must render the same resources.
func TestBucketAWSMatchesCUE(t *testing.T) {
	cue := cuetest.ReadDefinition(t, "components/bucket-aws-cue.cue")
	for _, props := range []BucketProperties{
		{Name: "product-images"},
		{Name: "product-images", Region: "eu-west-1", ProjectName: "catalog"},
	} {
		want, got := render(t, cue, props), render(t, BucketAWS(), props)
		if !reflect.DeepEqual(got, want) {
			t.Errorf("%+v: Go and CUE differ\n go: %#v\ncue: %#v", props, got, want)
		}
	}
}

func TestBucketAWSRendersBucket(t *testing.T) {
	out := render(t, BucketAWS(), BucketProperties{Name: "product-images"})

	for path, want := range map[string]any{
		"metadata.name":                 "product-images-aws-devkit",
		"metadata.labels":               map[string]any{"app.kubernetes.io/part-of": "kubecon-na-2026"},
		"spec.forProvider.region":       "us-west-2",
		"spec.forProvider.forceDestroy": true,
		"spec.providerConfigRef.name":   "default",
		"metadata.annotations":          map[string]any{"crossplane.io/external-name": "product-images-aws-devkit"},
	} {
		if got := cuetest.Get(out.Output, path); !reflect.DeepEqual(got, want) {
			t.Errorf("%s = %#v, want %#v", path, got, want)
		}
	}
	if len(out.Outputs) != 0 {
		t.Errorf("outputs = %#v, want only the bucket", out.Outputs)
	}
}

// The ACK bucket is namespaced and named like the Crossplane ones, with its
// region as an annotation since the controller has one default region.
func TestBucketACKRendersBucket(t *testing.T) {
	out, err := cuetest.Render(BucketACK(), map[string]any{"name": "product-images", "namespace": "aws-ack"},
		BucketProperties{Name: "product-images", Region: "eu-west-1"})
	if err != nil {
		t.Fatal(err)
	}

	for path, want := range map[string]any{
		"apiVersion":           "s3.services.k8s.aws/v1alpha1",
		"metadata.name":        "product-images-aws-ack",
		"spec.name":            "product-images-aws-ack",
		"metadata.labels":      map[string]any{"app.kubernetes.io/part-of": "kubecon-na-2026"},
		"metadata.annotations": map[string]any{"services.k8s.aws/region": "eu-west-1"},
	} {
		if got := cuetest.Get(out.Output, path); !reflect.DeepEqual(got, want) {
			t.Errorf("%s = %#v, want %#v", path, got, want)
		}
	}
	if len(out.Outputs) != 0 {
		t.Errorf("outputs = %#v, want only the bucket", out.Outputs)
	}
}

func TestBucketGCPMapsRegionToLocation(t *testing.T) {
	for _, region := range Regions {
		out := render(t, BucketGCP(), BucketProperties{Name: "product-images", Region: region})
		if gcsLocations[region] == "" {
			t.Errorf("%s has no GCS location", region)
		}
		if got := cuetest.Get(out.Output, "spec.forProvider.location"); got != gcsLocations[region] {
			t.Errorf("%s: location = %v, want %s", region, got, gcsLocations[region])
		}
	}
}

func TestBucketGCPRejectsUnmappedRegion(t *testing.T) {
	if err := cuetest.ValidateProperties(BucketGCP(), BucketProperties{Name: "b", Region: "af-south-1"}); err == nil {
		t.Error("accepted region af-south-1, which has no GCS location")
	}
}

// Every bucket component, in Go or CUE, takes exactly BucketProperties.
func TestBucketsShareOneInterface(t *testing.T) {
	for _, def := range []*defkit.ComponentDefinition{BucketAWS(), BucketGCP(), BucketACK()} {
		for _, d := range paramcheck.Diff(def.GetParams(), BucketProperties{}) {
			t.Errorf("%s: %s", def.DefName(), d)
		}
	}
}

// statusOf runs a component's health policy and status message through
// KubeVela's own evaluator, as the controller does on each reconcile.
func statusOf(t *testing.T, def *defkit.ComponentDefinition, status map[string]any) *health.StatusResult {
	t.Helper()
	output := map[string]any{"metadata": map[string]any{"name": "product-images-aws-devkit"}}
	if status != nil {
		output["status"] = status
	}
	got, err := health.GetStatus(map[string]any{"output": output}, &health.StatusRequest{
		Health: def.GetHealthPolicy(),
		Custom: def.GetCustomStatus(),
	})
	if err != nil {
		t.Fatalf("%s: %v", def.DefName(), err)
	}
	return got
}

func conditions(typ, status string) map[string]any {
	return map[string]any{"conditions": []any{map[string]any{"type": typ, "status": status}}}
}

// Each bucket is healthy once its provisioner's condition is true:
// Crossplane's Ready, or ACK's ACK.ResourceSynced.
func TestBucketStatus(t *testing.T) {
	for def, cond := range map[*defkit.ComponentDefinition]string{
		BucketAWS(): crossplaneReady,
		BucketGCP(): crossplaneReady,
		BucketACK(): ackSynced,
	} {
		tests := []struct {
			name        string
			status      map[string]any
			wantHealthy bool
			wantMessage string
		}{
			{"no status yet", nil, false, "Provisioning bucket - " + cond + ": Unknown"},
			{"creating", conditions(cond, "False"), false, "Provisioning bucket - " + cond + ": False"},
			{"ready", conditions(cond, "True"), true, "Bucket product-images-aws-devkit ready"},
			// Another provisioner's condition doesn't count.
			{"other condition", conditions("Other", "True"), false, "Provisioning bucket - " + cond + ": Unknown"},
		}
		for _, tt := range tests {
			got := statusOf(t, def, tt.status)
			if got.Healthy != tt.wantHealthy || got.Message != tt.wantMessage {
				t.Errorf("%s %s: healthy %v message %q, want %v %q",
					def.DefName(), tt.name, got.Healthy, got.Message, tt.wantHealthy, tt.wantMessage)
			}
		}
	}
}
