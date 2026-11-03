package traits

import (
	"reflect"
	"testing"

	"github.com/kubecon-na-2026/kubevela-bucket-floci-demo/devkit/internal/cuetest"
	"github.com/kubecon-na-2026/kubevela-bucket-floci-demo/devkit/internal/paramcheck"
)

// haContext is the KubeVela context the tests render the trait in: the
// product-catalog-api Deployment in the aws-devkit stage.
var haContext = map[string]any{
	"name":      "product-catalog-api",
	"namespace": "aws-devkit",
	"output":    map[string]any{"apiVersion": "apps/v1", "kind": "Deployment"},
}

func renderHA(t *testing.T, def cuetest.Definition, props HighAvailabilityProperties) cuetest.Rendered {
	t.Helper()
	out, err := cuetest.Render(def, haContext, props)
	if err != nil {
		t.Fatal(err)
	}
	return out
}

var ownPodSelector = map[string]any{"matchLabels": map[string]any{"app.oam.dev/component": "product-catalog-api"}}

// The promotion moves from the CUE trait in aws-cue to this one in
// aws-devkit, so for every level they must render the same resources and
// patch.
func TestHighAvailabilityMatchesCUE(t *testing.T) {
	cue := cuetest.ReadDefinition(t, "traits/high-availability.cue")
	for _, level := range levels {
		t.Run(level, func(t *testing.T) {
			props := HighAvailabilityProperties{Level: level}
			want, got := renderHA(t, cue, props), renderHA(t, HighAvailability(), props)
			if !reflect.DeepEqual(got.Outputs, want.Outputs) {
				t.Errorf("outputs differ\n go: %#v\ncue: %#v", got.Outputs, want.Outputs)
			}
			if !reflect.DeepEqual(got.Patch, want.Patch) {
				t.Errorf("patch differs\n go: %#v\ncue: %#v", got.Patch, want.Patch)
			}
		})
	}
}

func TestHighAvailabilityScalesEveryLevel(t *testing.T) {
	for _, level := range levels {
		t.Run(level, func(t *testing.T) {
			hpa := renderHA(t, HighAvailability(), HighAvailabilityProperties{Level: level}).Outputs["hpa"]
			want := postures[level]

			checks := map[string]any{
				"metadata.name":                    "product-catalog-api",
				"metadata.namespace":               "aws-devkit",
				"spec.scaleTargetRef.kind":         "Deployment",
				"spec.scaleTargetRef.name":         "product-catalog-api",
				"spec.minReplicas":                 int64(want.minReplicas),
				"spec.maxReplicas":                 int64(want.maxReplicas),
				"spec.behavior.scaleDown.policies": []any{map[string]any{"type": "Percent", "value": int64(50), "periodSeconds": int64(60)}},
			}
			for path, w := range checks {
				if got := cuetest.Get(hpa, path); !reflect.DeepEqual(got, w) {
					t.Errorf("hpa %s = %#v, want %#v", path, got, w)
				}
			}
			metric := cuetest.Get(hpa, "spec.metrics").([]any)[0]
			if got := cuetest.Get(metric, "resource.target.averageUtilization"); got != int64(targetCPUUtilization) {
				t.Errorf("cpu target = %v, want %d", got, targetCPUUtilization)
			}
		})
	}
}

func TestHighAvailabilityDefaultsToDev(t *testing.T) {
	out := renderHA(t, HighAvailability(), HighAvailabilityProperties{})

	if got := cuetest.Get(out.Outputs["hpa"], "spec.maxReplicas"); got != int64(postures[LevelDev].maxReplicas) {
		t.Errorf("maxReplicas = %v, want dev's %d", got, postures[LevelDev].maxReplicas)
	}
	if _, ok := out.Outputs["pdb"]; ok {
		t.Error("dev got a PodDisruptionBudget")
	}
	if podSpec, _ := cuetest.Get(out.Patch, "spec.template.spec").(map[string]any); len(podSpec) != 0 {
		t.Errorf("dev patched the pod spec: %#v", podSpec)
	}
}

func TestHighAvailabilityDisruptionBudget(t *testing.T) {
	tests := []struct {
		level, field string
		want         any
	}{
		{LevelStaging, "maxUnavailable", int64(1)},
		{LevelProd, "maxUnavailable", int64(2)},
		{LevelProdLocal, "maxUnavailable", int64(1)},
	}
	for _, tt := range tests {
		t.Run(tt.level, func(t *testing.T) {
			pdb := renderHA(t, HighAvailability(), HighAvailabilityProperties{Level: tt.level}).Outputs["pdb"]
			if got := cuetest.Get(pdb, "spec."+tt.field); got != tt.want {
				t.Errorf("spec.%s = %#v, want %#v", tt.field, got, tt.want)
			}
			if got := cuetest.Get(pdb, "spec.selector"); !reflect.DeepEqual(got, ownPodSelector) {
				t.Errorf("spec.selector = %#v", got)
			}
		})
	}
}

func TestHighAvailabilitySpreadsPods(t *testing.T) {
	const podSpec = "spec.template.spec."
	const preferred = podSpec + "affinity.podAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution"
	const required = podSpec + "affinity.podAntiAffinity.requiredDuringSchedulingIgnoredDuringExecution"
	const zones = podSpec + "topologySpreadConstraints"

	preferredTerm := []any{map[string]any{
		"weight": int64(preferredWeight),
		"podAffinityTerm": map[string]any{
			"topologyKey":   hostnameTopologyKey,
			"labelSelector": ownPodSelector,
		},
	}}
	tests := []struct {
		level string
		want  map[string]any // path -> value; nil means the path is not set
	}{
		{LevelStaging, map[string]any{preferred: preferredTerm, required: nil, zones: nil}},
		{LevelProd, map[string]any{
			preferred: nil,
			required:  []any{map[string]any{"topologyKey": hostnameTopologyKey, "labelSelector": ownPodSelector}},
			zones: []any{map[string]any{
				"maxSkew": int64(1), "topologyKey": zoneTopologyKey,
				"whenUnsatisfiable": "DoNotSchedule", "labelSelector": ownPodSelector,
			}},
		}},
		{LevelProdLocal, map[string]any{preferred: preferredTerm, required: nil, zones: nil}},
	}
	for _, tt := range tests {
		t.Run(tt.level, func(t *testing.T) {
			patch := renderHA(t, HighAvailability(), HighAvailabilityProperties{Level: tt.level}).Patch
			for path, w := range tt.want {
				if got := cuetest.Get(patch, path); !reflect.DeepEqual(got, w) {
					t.Errorf("%s = %#v, want %#v", path, got, w)
				}
			}
		})
	}
}

func TestHighAvailabilityRejectsUnknownLevel(t *testing.T) {
	if err := cuetest.ValidateProperties(HighAvailability(), HighAvailabilityProperties{Level: "production"}); err == nil {
		t.Error("accepted level production")
	}
}

func TestHighAvailabilityPropertiesMatchParams(t *testing.T) {
	for _, d := range paramcheck.Diff(HighAvailability().GetParams(), HighAvailabilityProperties{}) {
		t.Error(d)
	}
}
