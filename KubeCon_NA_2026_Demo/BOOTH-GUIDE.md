# KubeCon NA 2026 booth guide: one interface to rule them all

For whoever is standing at the booth. Modeled on the India team's
`kubevela-one-interface-demos/demos/kubecon-in-2026/walkthrough.md`, but shorter:
a pitch, one demo loop and answers to the usual questions.

The demo is `kubevela-bucket-floci-demo/`. The slides are the deck "One
Interface To Rule Them All". They cover two personas: the developer and the
platform engineer.

## The message

One interface, two people.

**The developer** writes one `application.yaml` that declares the app, its traits and its bucket. They deploy it, and the same properties go to every stage, so there's nothing to edit. Their app code stays as it is too, because the platform provides the abstraction.

**The platform engineer** writes the components behind that file, in CUE or in Go with DevKit. Go is the new option: it's a language many engineers already know, with the tooling and tests they're used to. Either way the component renders the same resources.

Because of that one interface, nobody downstream notices what changes underneath. Crossplane or ACK can build the bucket, and AWS S3 or GCP GCS can hold it. The platform engineer picks, and the developer's file is the same either way.

## The platform engineer's side

The developer is one persona at the booth. The other is the platform engineer,
who writes the components behind the developer's file. A KubeVela component can
be written two ways:

- **In CUE**, as KubeVela definitions always were. `aws-cue` uses this, in `definitions/components/bucket-aws-cue.cue`.
- **In Go, with DevKit**, which is new in KubeVela. `aws-devkit`, `aws-ack` and `gcp-devkit` use this, in `devkit/components/`.

Why Go? A lot of engineers know Go better than CUE, and Go comes with an
ecosystem they already understand: modules, IDE support, linters and libraries.
That helps with writing the component and with writing its tests.

The tests are the part to show off. `cd devkit && go test ./...` runs without a
cluster. It renders the Go component and the CUE one and checks they produce the
same resources, and it checks every stage of `apps/product-catalog.yaml` against
its definitions. That is why moving from `aws-cue` to `aws-devkit` changes
nothing for the developer.

To show it: open `devkit/components/bucket_ack.go` next to the bucket browser
and point at the five lines that define the component.

## The 30-second pitch

> There are two people in this demo. The developer writes one file, and it
> never changes. The platform engineer writes the components behind it, in
> CUE or in Go with DevKit. Go is new, and it means they can use the tools and
> tests they already know. Watch the bucket browser: approve the next stage
> and the platform engineer swaps Crossplane for ACK, then AWS for GCP. The
> developer's file stays exactly the same.

## Before the doors open

1. Docker running, one demo cluster only (see Troubleshooting).
2. `cd kubevela-bucket-floci-demo && ./demo.sh --open` (add `--zscaler` behind Zscaler, after `./clean.sh`). The `--open` option opens two browser windows for you, VelaUX and the bucket browser. It works on macOS only; elsewhere, open the two URLs below yourself.
3. Put the two windows side by side, so a visitor sees the approval and the bucket appear together:
   - VelaUX: http://localhost:8000 (`admin` / `VelaUX12345`, or `VELAUX_ADMIN_PASSWORD`)
   - Bucket browser: http://localhost:8081
4. `vela status product-catalog` should show the first stage, `aws-cue`, healthy.
5. Put the slide deck on the second screen, on the "My application.yaml" slide.

## The demo loop (about 3 minutes)

Run it once per visitor group. Each step names the thing to point at.

| Step | You do | You say | Point at |
|---|---|---|---|
| 1 | Show `apps/product-catalog.yaml` | "This is the developer's whole input. Three bucket properties." | `name`, `region`, `projectName` |
| 2 | Look at the bucket browser | "Stage one is live: S3 via Crossplane, written in CUE." | The `aws-cue` card, with its mug |
| 3 | Approve the next stage in VelaUX (or `vela workflow resume product-catalog`) | "Same properties. The platform engineer now writes the component in Go, with DevKit, instead of CUE." | `DevKit` in red on the `aws-devkit` card |
| 4 | Approve again | "Same bucket, but ACK builds it instead of Crossplane." | `ACK` in red on the `aws-ack` card |
| 5 | Approve again | "Now a different cloud: GCP Cloud Storage. Still the same properties." | `GCP GCS` in red on the `gcp-devkit` card |
| 6 | Say it | "Four backings. One file. Nothing the developer wrote changed." | The four cards together |

Red in the bucket browser always means "this changed from the stage before".

## What each stage is

| Stage | Bucket | Created by | Written in |
|---|---|---|---|
| `aws-cue` | S3 in Floci | Crossplane | CUE |
| `aws-devkit` | S3 in Floci | Crossplane | Go, with DevKit |
| `aws-ack` | S3 in Floci | ACK | Go, with DevKit |
| `gcp-devkit` | Cloud Storage in floci-gcp | Crossplane | Go, with DevKit |

Floci and floci-gcp are local emulators, so the demo needs no cloud account.
Say so if someone asks whether it's real: the controllers and the definitions
are real; only the cloud API is emulated.

## Questions you'll get

**What actually changes between stages?**
Only the component type, picked by an override policy for that stage. The
properties are passed through as written. `kubevela-bucket-floci-demo/apps/product-catalog.yaml` shows it.

**Doesn't the app change when the cloud changes?**
No. The code talks to one `ObjectStore` interface (`app/storage.py`). The
platform sets `STORAGE_PROVIDER` for the stage, and the same image runs on S3
or Cloud Storage.

**Why CUE and DevKit?**
They are two ways for the platform team to write the same definitions. DevKit
is new, and it exists because many engineers are more at home in Go. They get
the Go ecosystem (IDE, modules, linters) for the component and for its tests.
A Go test checks the DevKit definitions against the CUE ones, so they stay
equivalent.

**Do I have to learn Go to write a component?**
No. CUE still works, and both forms render the same resources. DevKit is there
for teams that would rather write Go.

**Why Crossplane and ACK?**
Both are IaC controllers for Kubernetes. The point is that you can swap one
for the other without the developer noticing.

**Can we add another cloud or another tool?**
Yes: add a bucket component for it, add a stage with an override, and add the
stage to `apps/bucket-browser.yaml`'s `BUCKETS`. The developer's file doesn't change.

**Where are the pictures from?**
`./seed-products.sh` posts each stage's mug through its API. They use the
official KubeVela, Guidewire, AWS and Google Cloud logos; see `sample/LOGOS.md`.

## Reset between visitors

```bash
./clean.sh --apps-only        # delete the Application and its buckets, keep the cluster
./demo.sh --skip-cluster --skip-build   # bring it back on the same cluster
```

`--apps-only` empties the ACK bucket first, because ACK can't delete a bucket
that still has objects in it. A full teardown is `./clean.sh`.

## Troubleshooting

- **`vela-core` in `CrashLoopBackOff` with `too many open files`.** Two k3d clusters on one Rancher Desktop VM. Delete one, or raise `fs.inotify.max_user_instances`.
- **A stage's bucket shows "Bucket not created yet".** Its stage isn't approved yet. Check `vela status product-catalog`.
- **A card shows an error instead of products.** The stage is deployed, but its API can't reach its bucket. `kubectl get pods -n <stage>`, then re-run `./seed-products.sh <stage>`.
- **No mugs showing.** Run `./seed-products.sh`. A stage that already has its mug is left alone.
- **Nothing responds on 8000 or 8081.** The port-forwards died. Re-run `./demo.sh --skip-cluster --skip-build`.
- **The `vela` CLI doesn't match.** The demo pins v1.12.0-alpha.1: `curl -fsSl https://kubevela.io/script/install.sh | bash -s v1.12.0-alpha.1`.

## Useful commands

```bash
vela status product-catalog                 # workflow steps and each stage's health
vela workflow resume product-catalog        # approve the next stage
kubectl get buckets.s3.aws.upbound.io,buckets.storage.gcp.upbound.io   # Crossplane's buckets
kubectl get buckets.s3.services.k8s.aws -n aws-ack                      # ACK's bucket
./seed-products.sh [stage...]               # add each stage's mug
```
