// Package apptest checks ../../apps/product-catalog.yaml, the demo's one
// Application, against the definitions its stages use, CUE and DevKit.
package apptest

import (
	"encoding/json"
	"os"
	"testing"

	"github.com/kubecon-na-2026/kubevela-bucket-floci-demo/devkit/components"
	"github.com/kubecon-na-2026/kubevela-bucket-floci-demo/devkit/internal/cuetest"
	"github.com/kubecon-na-2026/kubevela-bucket-floci-demo/devkit/traits"
	wfv1alpha1 "github.com/kubevela/pkg/apis/oam/v1alpha1"
	"github.com/oam-dev/kubevela/apis/core.oam.dev/common"
	"github.com/oam-dev/kubevela/apis/core.oam.dev/v1alpha1"
	"github.com/oam-dev/kubevela/apis/core.oam.dev/v1beta1"
	"github.com/oam-dev/kubevela/pkg/policy/envbinding"
	"sigs.k8s.io/yaml"
)

// builtIn are the types KubeVela ships, which have no definition here.
var builtIn = map[string]bool{"webservice": true, "env": true}

func definitions(t *testing.T) map[string]cuetest.Definition {
	t.Helper()
	return map[string]cuetest.Definition{
		"bucket-aws-cue":            cuetest.ReadDefinition(t, "components/bucket-aws-cue.cue"),
		"high-availability":         cuetest.ReadDefinition(t, "traits/high-availability.cue"),
		components.BucketAWSType:    components.BucketAWS(),
		components.BucketGCPType:    components.BucketGCP(),
		components.BucketACKType:    components.BucketACK(),
		traits.HighAvailabilityType: traits.HighAvailability(),
	}
}

// readApp reads ../../apps/<name>.yaml.
func readApp(t *testing.T, name string) *v1beta1.Application {
	t.Helper()
	src, err := os.ReadFile("../../apps/" + name + ".yaml")
	if err != nil {
		t.Fatal(err)
	}
	var app v1beta1.Application
	if err := yaml.Unmarshal(src, &app); err != nil {
		t.Fatal(err)
	}
	return &app
}

// stageComponents returns the components a deploy step deploys: the
// Application's, with the step's override policies applied the way the
// deploy step applies them.
func stageComponents(t *testing.T, app *v1beta1.Application, deploy wfv1alpha1.WorkflowStep) []common.ApplicationComponent {
	t.Helper()
	// The deploy step's own spec type, in pkg/workflow/step, pulls in
	// KubeVela's CLI dependencies, so read just the field needed here.
	var props struct {
		Policies []string `json:"policies"`
	}
	if err := json.Unmarshal(deploy.Properties.Raw, &props); err != nil {
		t.Fatalf("%s: %v", deploy.Name, err)
	}
	comps := app.Spec.Components
	for _, name := range props.Policies {
		policy := findPolicy(t, app, name)
		if policy.Type != "override" {
			continue
		}
		var spec v1alpha1.OverridePolicySpec
		if err := json.Unmarshal(policy.Properties.Raw, &spec); err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		var err error
		if comps, err = envbinding.PatchComponents(comps, spec.Components, spec.Selector); err != nil {
			t.Fatalf("%s: %v", name, err)
		}
	}
	return comps
}

func findPolicy(t *testing.T, app *v1beta1.Application, name string) v1beta1.AppPolicy {
	t.Helper()
	for _, p := range app.Spec.Policies {
		if p.Name == name {
			return p
		}
	}
	t.Fatalf("no policy %s", name)
	return v1beta1.AppPolicy{}
}

// Every stage's components and traits have a definition that accepts their
// properties, and every DevKit definition is used by some stage.
func TestStagesMatchDefinitions(t *testing.T) {
	defs := definitions(t)
	used := map[string]bool{}
	check := func(stage, typ string, props []byte) {
		used[typ] = true
		if builtIn[typ] {
			return
		}
		def, ok := defs[typ]
		if !ok {
			t.Errorf("%s: no definition for type %s", stage, typ)
			return
		}
		if err := cuetest.ValidateProperties(def, props); err != nil {
			t.Errorf("%s: %s rejected its properties: %v", stage, typ, err)
		}
	}

	app := readApp(t, "product-catalog")
	for _, ws := range app.Spec.Workflow.Steps {
		if ws.Type != "deploy" {
			continue
		}
		for _, comp := range stageComponents(t, app, ws) {
			check(ws.Name, comp.Type, comp.Properties.Raw)
			for _, trait := range comp.Traits {
				check(ws.Name, trait.Type, trait.Properties.Raw)
			}
		}
	}
	for _, typ := range []string{components.BucketAWSType, components.BucketGCPType, components.BucketACKType, traits.HighAvailabilityType} {
		if !used[typ] {
			t.Errorf("no stage uses %s", typ)
		}
	}
}
