# floci-buckets

The bucket demo's DevKit (`defkit`) definitions: the three bucket components and the high-availability trait the `aws-devkit`, `aws-ack` and `gcp-devkit` stages use. The Application itself is `../apps/product-catalog.yaml`; it isn't repeated here.

## What's here

| Path | What it is |
|---|---|
| `components/bucket.go` | `BucketProperties`, the parameters every bucket component takes, and what the buckets share |
| `components/bucket_aws.go` | `bucket-aws-devkit`, the DevKit version of `../definitions/components/bucket-aws-cue.cue` |
| `components/bucket_gcp.go` | `bucket-gcp-devkit`, a Cloud Storage bucket in floci-gcp |
| `components/bucket_ack.go` | `bucket-aws-ack`, an S3 bucket created by the ACK S3 controller instead of Crossplane |
| `traits/high_availability.go` | `high-availability-devkit`, the DevKit version of `../definitions/traits/high-availability.cue`. It has its own name so both can be installed at once |
| `apptest/` | Tests that check `../apps/product-catalog.yaml` against the definitions, and `../apps/bucket-browser.yaml`'s bucket list against its stages |
| `cmd/register` | Entry point `vela def apply-module` runs to discover the definitions |
| `internal/cuetest` | Test helpers that evaluate generated and hand-written CUE |
| `internal/paramcheck` | Test helper that keeps the property structs in step with the parameters |

## What the tests hold together

- `bucket-aws-devkit` renders the same resources as `bucket-aws-cue`, and `high-availability-devkit` the same as `high-availability` at every level. So promoting from `aws-cue` to `aws-devkit` changes only how the definitions are written.
- All three bucket components take exactly `BucketProperties`, and each is healthy once its provisioner's condition is true: Crossplane's `Ready`, ACK's `ACK.ResourceSynced`.
- `bucket-gcp-devkit` maps every allowed region to a GCS location and rejects any other.
- For each deploy step of the Application, the components after its overrides (merged by KubeVela's own `envbinding.PatchComponents`) are accepted by their definitions.
- The bucket browser lists every stage, in promotion order, with the provider and bucket that stage's API uses.

## Usage

```bash
go test ./...                                   # no cluster needed
vela def gen-module . -o /tmp/floci-buckets     # see the CUE the controller will run
vela def apply-module . --conflict overwrite
```

## Known issues (KubeVela v1.12.0-alpha.1)

- `vela def init-module` writes `require github.com/oam-dev/kubevela 1.12.0-alpha.1` without the `v`, so `go mod tidy` fails until it is added by hand.
- `defkit` emits `field!: ...` for `Required()`. The TraitDefinition admission webhook evaluates a trait's patch without parameters and rejects a required field the patch reads.
- `SetIf` on a trait patch generates `patch: if cond { ... }`, which is not valid CUE. `high-availability-devkit` uses `Patch().If(...)` instead.
- The status builders read `context.output.status` without a guard. `Status().Condition(...)`, `Health().Field(...)` and the status `Case` conditions fail to evaluate until the resource has a status, so KubeVela logs an error and shows no message. Only `Health().Condition(...)` is safe, so the buckets' custom status is a CUE string.
- `Health().Condition(name)` builds a CUE identifier from the condition name, so a name with a dot, such as `ACK.ResourceSynced`, generates invalid CUE. The bucket health policies are CUE strings too (`bucketHealth`).
- `Lit` of a list of maps writes Go syntax (`[map[name:id]]`); build the list with `NewArray().Item(NewArrayElement()...)` instead.
- `ArrayElement.Set` writes its key as given: `a.b` and `m[k]` paths become invalid CUE, and a key such as `app.oam.dev/component` has to be quoted by hand. Nest elements for deeper fields.
- `VelaCtx().Custom("output.kind")` generates `context.custom.output.kind`; use `Reference("context.output.kind")`.
- `ComponentDefinition.Render` does not evaluate string expressions, so tests render through `internal/cuetest`, which runs the generated CUE.
- Importing `github.com/oam-dev/kubevela/pkg/workflow/step` pulls in KubeVela's CLI dependencies, which don't compile here (an old `stern`).
