package components

import "github.com/oam-dev/kubevela/pkg/definition/defkit"

// BucketACKType is the component type an Application refers to.
const BucketACKType = "bucket-aws-ack"

// ackSynced is the condition ACK sets once the bucket matches its spec.
const ackSynced = "ACK.ResourceSynced"

// BucketACK is an S3 bucket that the ACK S3 controller creates in Floci. It
// takes the same parameters as the Crossplane buckets, so an Application
// changes provisioner by changing only the component type.
func BucketACK() *defkit.ComponentDefinition {
	p := newBucketParams()
	return defkit.NewComponent(BucketACKType).
		Description("S3 bucket created by the ACK S3 controller in Floci. Named <name>-<namespace>.").
		Workload("s3.services.k8s.aws/v1alpha1", "Bucket").
		Params(p.all()...).
		Template(p.renderACK).
		HealthPolicy(bucketHealth(ackSynced)).
		CustomStatus(bucketStatus(ackSynced))
}

// renderACK writes an ACK Bucket. Unlike Crossplane's buckets it is
// namespaced, so KubeVela puts it in the stage's namespace. There is no
// forceDestroy: ACK only deletes empty buckets, so ../../clean.sh empties it
// first.
func (p bucketParams) renderACK(tpl *defkit.Template) {
	tpl.Output(defkit.NewResource("s3.services.k8s.aws/v1alpha1", "Bucket").
		Set("metadata.name", p.bucketName()).
		Set("metadata.labels[app.kubernetes.io/part-of]", p.projectName).
		// The bucket's region, in place of the controller's default.
		Set("metadata.annotations[services.k8s.aws/region]", p.region).
		Set("spec.name", p.bucketName()))
}

func init() {
	defkit.Register(BucketACK())
}
