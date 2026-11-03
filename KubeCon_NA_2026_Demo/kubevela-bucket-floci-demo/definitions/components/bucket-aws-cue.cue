// An S3 bucket, created by Crossplane's provider-aws-s3 in Floci.
//
// One of four bucket components that take the same parameters (name,
// region, projectName). The others, bucket-aws-devkit, bucket-aws-ack and
// bucket-gcp-devkit, are written in Go with DevKit in
// ../../devkit/components/. An Application changes backing by changing only
// the component type.
//
// The bucket is named <name>-<namespace>, so each stage of the promotion
// gets its own.

"bucket-aws-cue": {
	type:        "component"
	annotations: {}
	labels: {}
	description: "S3 bucket created by Crossplane in Floci. Named <name>-<namespace>."
	attributes: {
		workload: definition: {
			apiVersion: "s3.aws.upbound.io/v1beta1"
			kind:       "Bucket"
		}
		status: {
			healthPolicy: #"""
				isHealth: *false | bool
				for c in *context.output.status.conditions | [] {
					if c.type == "Ready" && c.status == "True" {
						isHealth: true
					}
				}
				"""#
			customStatus: #"""
				ready: *"Unknown" | string
				for c in *context.output.status.conditions | [] {
					if c.type == "Ready" {
						ready: c.status
					}
				}
				if context.status.healthy {
					message: "Bucket \(context.output.metadata.name) ready"
				}
				if !context.status.healthy {
					message: "Provisioning bucket - Ready: \(ready)"
				}
				"""#
		}
	}
}

template: {
	_bucket: "\(parameter.name)-\(context.namespace)"

	output: {
		apiVersion: "s3.aws.upbound.io/v1beta1"
		kind:       "Bucket"
		metadata: {
			name: _bucket
			// The external name is the bucket's name in S3.
			annotations: "crossplane.io/external-name": _bucket
			labels: "app.kubernetes.io/part-of":        parameter.projectName
		}
		spec: {
			forProvider: {
				region: parameter.region
				// Deleting the Application empties and deletes the bucket.
				forceDestroy: true
			}
			// ../../floci/providerconfigs.yaml points the default ProviderConfig at Floci.
			providerConfigRef: name: "default"
		}
	}

	parameter: {
		// +usage=Bucket name; the deploy namespace is appended
		name: string
		// +usage=AWS region. bucket-gcp-devkit maps it to the nearest GCS location
		region: *"us-west-2" | "us-east-1" | "eu-west-1" | "eu-central-1" | "ap-south-1"
		// +usage=Project the bucket belongs to, set as the app.kubernetes.io/part-of label
		projectName: *"kubecon-na-2026" | string
	}
}
