// Package components holds the module's ComponentDefinitions; each file
// registers its definition with defkit in init().
package components

import "github.com/oam-dev/kubevela/pkg/definition/defkit"

// BucketProperties are the parameters of every bucket component, here and in
// ../../definitions/components/bucket-aws-cue.cue. They are the same on
// purpose: an Application changes cloud by changing only the component type.
type BucketProperties struct {
	Name        string `json:"name"`
	Region      string `json:"region,omitempty"`
	ProjectName string `json:"projectName,omitempty"`
}

// gcsLocations maps each AWS region a bucket can ask for to the nearest GCS
// location, so the same properties work on both clouds.
var gcsLocations = map[string]string{
	"us-east-1":    "us-east1",
	"us-west-2":    "us-west1",
	"eu-west-1":    "europe-west1",
	"eu-central-1": "europe-west3",
	"ap-south-1":   "asia-south1",
}

// Regions lists the regions in the order the CUE is generated.
var Regions = []string{"us-west-2", "us-east-1", "eu-west-1", "eu-central-1", "ap-south-1"}

// bucketParams are the shared parameters, built fresh for each definition.
type bucketParams struct {
	name, region, projectName *defkit.StringParam
}

func newBucketParams() bucketParams {
	return bucketParams{
		name: defkit.String("name").Required().
			Description("Bucket name; the deploy namespace is appended"),
		region: defkit.String("region").Default(Regions[0]).Values(Regions...).
			Description("AWS region. bucket-gcp-devkit maps it to the nearest GCS location"),
		projectName: defkit.String("projectName").Default("kubecon-na-2026").
			Description("Project the bucket belongs to, set as the app.kubernetes.io/part-of label"),
	}
}

func (p bucketParams) all() []defkit.Param {
	return []defkit.Param{p.name, p.region, p.projectName}
}

// bucketName is <name>-<namespace>, so each stage of a promotion gets its own
// bucket.
func (p bucketParams) bucketName() defkit.Value {
	return defkit.Interpolation(p.name, defkit.Lit("-"), defkit.VelaCtx().Namespace())
}

// newBucketResource starts a cluster-scoped Crossplane managed resource named
// after the bucket, with the settings every bucket shares.
func (p bucketParams) newBucketResource(apiVersion, kind string) *defkit.Resource {
	return defkit.NewResource(apiVersion, kind).
		Set("metadata.name", p.bucketName()).
		// The external name is the bucket's name in the cloud.
		Set("metadata.annotations[crossplane.io/external-name]", p.bucketName()).
		Set("metadata.labels[app.kubernetes.io/part-of]", p.projectName).
		// Deleting the Application empties and deletes the bucket.
		Set("spec.forProvider.forceDestroy", defkit.Lit(true)).
		// ../../floci/providerconfigs.yaml points the default ProviderConfigs at Floci.
		Set("spec.providerConfigRef.name", defkit.Lit("default"))
}

// crossplaneReady is the condition Crossplane sets once the bucket exists.
const crossplaneReady = "Ready"

// bucketHealth is healthy once the condition is True. It is CUE rather than
// defkit.Health().Condition, which builds a CUE identifier from the condition
// name and so breaks on a dot, as in ACK.ResourceSynced.
func bucketHealth(condition string) string {
	return `isHealth: *false | bool
for c in *context.output.status.conditions | [] {
	if c.type == "` + condition + `" && c.status == "True" {
		isHealth: true
	}
}`
}

// bucketStatus names the bucket once it is ready, and shows the condition
// that decides readiness until then. It is CUE rather than defkit's status
// builder, whose condition lookups fail while the bucket has no status.
func bucketStatus(condition string) string {
	return `ready: *"Unknown" | string
for c in *context.output.status.conditions | [] {
	if c.type == "` + condition + `" {
		ready: c.status
	}
}
if context.status.healthy {
	message: "Bucket \(context.output.metadata.name) ready"
}
if !context.status.healthy {
	message: "Provisioning bucket - ` + condition + `: \(ready)"
}`
}
