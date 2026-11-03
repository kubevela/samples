package components

import "github.com/oam-dev/kubevela/pkg/definition/defkit"

// BucketGCPType is the component type an Application refers to.
const BucketGCPType = "bucket-gcp-devkit"

// BucketGCP is a Cloud Storage bucket that Crossplane's
// provider-gcp-storage creates in floci-gcp. It takes the same parameters as
// the S3 buckets and maps the AWS region to a comparable GCS location.
func BucketGCP() *defkit.ComponentDefinition {
	p := newBucketParams()
	return defkit.NewComponent(BucketGCPType).
		Description("Cloud Storage bucket created by Crossplane in floci-gcp. Named <name>-<namespace>.").
		Workload("storage.gcp.upbound.io/v1beta3", "Bucket").
		Params(p.all()...).
		Template(p.renderGCP).
		HealthPolicy(bucketHealth(crossplaneReady)).
		CustomStatus(bucketStatus(crossplaneReady))
}

func (p bucketParams) renderGCP(tpl *defkit.Template) {
	bucket := p.newBucketResource("storage.gcp.upbound.io/v1beta3", "Bucket")
	for _, region := range Regions {
		bucket.SetIf(p.region.Eq(region), "spec.forProvider.location", defkit.Lit(gcsLocations[region]))
	}
	tpl.Output(bucket)
}

func init() {
	defkit.Register(BucketGCP())
}
