package components

import "github.com/oam-dev/kubevela/pkg/definition/defkit"

// BucketAWSType is the component type an Application refers to.
const BucketAWSType = "bucket-aws-devkit"

// BucketAWS is the Go version of
// ../../definitions/components/bucket-aws-cue.cue: an S3 bucket that
// Crossplane's provider-aws-s3 creates in Floci.
func BucketAWS() *defkit.ComponentDefinition {
	p := newBucketParams()
	return defkit.NewComponent(BucketAWSType).
		Description("S3 bucket created by Crossplane in Floci. Named <name>-<namespace>.").
		Workload("s3.aws.upbound.io/v1beta1", "Bucket").
		Params(p.all()...).
		Template(p.renderAWS).
		HealthPolicy(bucketHealth(crossplaneReady)).
		CustomStatus(bucketStatus(crossplaneReady))
}

func (p bucketParams) renderAWS(tpl *defkit.Template) {
	tpl.Output(p.newBucketResource("s3.aws.upbound.io/v1beta1", "Bucket").
		Set("spec.forProvider.region", p.region))
}

func init() {
	defkit.Register(BucketAWS())
}
