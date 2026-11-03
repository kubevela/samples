package apptest

import (
	"encoding/json"
	"fmt"
	"strings"
	"testing"

	"github.com/oam-dev/kubevela/apis/core.oam.dev/common"
)

// envOf returns a component's environment, as its env trait sets it.
func envOf(t *testing.T, comp common.ApplicationComponent) map[string]string {
	t.Helper()
	for _, trait := range comp.Traits {
		if trait.Type != "env" {
			continue
		}
		var props struct {
			Env map[string]string `json:"env"`
		}
		if err := json.Unmarshal(trait.Properties.Raw, &props); err != nil {
			t.Fatalf("%s: %v", comp.Name, err)
		}
		return props.Env
	}
	t.Fatalf("%s has no env trait", comp.Name)
	return nil
}

// The browser lists every stage's bucket, in promotion order, as each
// stage's API sees it: same provider, same bucket name.
func TestBucketBrowserListsEveryStage(t *testing.T) {
	var want []string
	app := readApp(t, "product-catalog")
	for _, ws := range app.Spec.Workflow.Steps {
		if ws.Type != "deploy" {
			continue
		}
		for _, comp := range stageComponents(t, app, ws) {
			if comp.Name != "product-catalog-api" {
				continue
			}
			env := envOf(t, comp)
			stage := strings.TrimPrefix(ws.Name, "deploy-")
			want = append(want, fmt.Sprintf("%s|%s|%s", stage, env["STORAGE_PROVIDER"], env["BUCKET_NAME"]))
		}
	}

	browser := readApp(t, "bucket-browser")
	var got []string
	for _, entry := range strings.Split(envOf(t, browser.Spec.Components[0])["BUCKETS"], ";") {
		parts := strings.Split(strings.TrimSpace(entry), "|")
		if len(parts) != 4 {
			t.Fatalf("BUCKETS entry %q is not stage|provider|bucket|label", entry)
		}
		got = append(got, strings.Join(parts[:3], "|"))
	}

	if strings.Join(got, "\n") != strings.Join(want, "\n") {
		t.Errorf("BUCKETS lists\n%s\nwant\n%s", strings.Join(got, "\n"), strings.Join(want, "\n"))
	}
}
