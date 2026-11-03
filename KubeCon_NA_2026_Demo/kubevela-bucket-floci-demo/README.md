# KubeVela bucket demo on Floci: one interface, CUE and DevKit, Crossplane and ACK, AWS and GCP

One Application, `product-catalog`, promoted through four stages. Each stage gets a bucket from a different backing, and the developer's properties never change; only the definition types do, one thing at a time:

| Stage (namespace) | Component | HA trait | Written in | Created by | Bucket |
|---|---|---|---|---|---|
| `aws-cue` | `bucket-aws-cue` | `high-availability` | CUE (`definitions/`) | Crossplane | S3 in [Floci](https://github.com/floci-io/floci) |
| `aws-devkit` | `bucket-aws-devkit` | `high-availability-devkit` | Go, with DevKit (`devkit/`) | Crossplane | S3 in Floci |
| `aws-ack` | `bucket-aws-ack` | `high-availability-devkit` | Go, with DevKit | ACK | S3 in Floci |
| `gcp-devkit` | `bucket-gcp-devkit` | `high-availability-devkit` | Go, with DevKit | Crossplane | Cloud Storage in [floci-gcp](https://github.com/floci-io/floci-gcp) |

Crossplane creates its buckets through provider-aws-s3 or provider-gcp-storage, as cluster-wide managed resources. ACK's S3 controller creates its bucket from a `Bucket` in the stage's namespace. The app is the product-catalog API from kubevela-one-interface-demos, which stores products in whichever bucket it is given.

The Application's workflow deploys a stage, then creates a product through that stage's API. That fails the workflow unless the API can write to its bucket. Before each later stage it waits for approval. The HA trait's level goes up along the way: `dev` (1-2 replicas) in `aws-cue`, `staging` (1-3, a disruption budget, spread across nodes) in `aws-devkit` and `aws-ack`, `prod-local` (3-6) in `gcp-devkit`.

The Application is defined once, in `apps/product-catalog.yaml`. Each stage's override policy picks its bucket component and its HA trait, so the DevKit stages differ from `aws-cue` only in those types. `cd devkit && go test ./...` checks that the DevKit definitions render the same resources as the CUE ones, and that each stage's definitions accept its properties.

## Run it

On a host with Docker:

```bash
./demo.sh
```

It creates the k3d cluster `kubevela-bucket-floci-demo` (1 server, 2 agents), builds and imports the `product-catalog` image, and installs Floci, floci-gcp, KubeVela with VelaUX, Crossplane with both providers, and the ACK S3 controller. Then it applies the CUE and DevKit definitions, deploys the Application and the bucket browser, and walks the promotion, asking before each approval. As soon as the `aws-cue` stage is deployed it forwards two pages, so you can follow the promotion there:

- VelaUX on http://localhost:8000 (user `admin`, password `VelaUX12345` or `VELAUX_ADMIN_PASSWORD`)
- the bucket browser on http://localhost:8081, which shows every stage's bucket on one page (see below)

`demo.sh --open` opens both pages for you on macOS. The forwards keep running after `demo.sh` ends; `./clean.sh` stops them. Set `VELAUX_LOCAL_PORT` or `BROWSER_LOCAL_PORT` if a port is taken.

Needs `docker`, `k3d`, `kubectl`, `helm`, Go 1.27+ (for the DevKit module) and the vela CLI v1.12.0-alpha.1:

```bash
curl -fsSl https://kubevela.io/script/install.sh | bash -s v1.12.0-alpha.1
```

Options:

- `--auto-approve` promotes without asking. So does any run without a terminal.
- `--open` opens VelaUX and the bucket browser in your default browser once they're forwarded (macOS only). Put the two windows side by side: approve a stage in VelaUX and its bucket appears in the browser within five seconds.
- `--skip-cluster` uses the current kubectl context.
- `--skip-build` skips the image build when the image is already in the cluster.
- `--zscaler` trusts a TLS-inspecting proxy's CA. It mounts `~/zscaler/zscaler_root.crt`, or `REGISTRY_CA_BUNDLE`, into the k3d nodes at cluster creation, so run `./clean.sh` first if the cluster was created without it.

Run one demo cluster at a time. Rancher Desktop allows 128 inotify instances, and with two k3d clusters `kubevela-vela-core` crash-loops with `too many open files`. Delete the other cluster or raise `fs.inotify.max_user_instances`.

Tear down with `./clean.sh`, or `./clean.sh --apps-only` to delete only the Application and its buckets. ACK can't delete a bucket that still has objects in it, and the workflow leaves a product in each one, so `--apps-only` empties the `aws-ack` bucket first. Deleting the Application any other way, from VelaUX say, leaves its ACK `Bucket` waiting for the bucket to be emptied.

## Promote by hand

```bash
vela status product-catalog                   # workflow steps and each stage's health
vela workflow resume product-catalog          # approve the next stage
kubectl get buckets.s3.aws.upbound.io,buckets.storage.gcp.upbound.io   # Crossplane's
kubectl get buckets.s3.services.k8s.aws -n aws-ack                      # ACK's
kubectl get pods -n aws-cue                   # likewise aws-devkit, aws-ack and gcp-devkit
kubectl port-forward -n gcp-devkit svc/product-catalog-api 8080:8080   # then curl localhost:8080/products
```

`./seed-products.sh [stage...]` gives each deployed stage's bucket a product with the stage's mug (`sample/mug-<logo>.*`), through its API. A stage that already has that product is left alone, so `demo.sh`, which seeds each stage as it goes live, can run again without piling up mugs. It runs inside each stage's API pod, so it needs nothing but `kubectl`. The bucket browser shows the result.

## The bucket browser

`apps/bucket-browser.yaml` is a second, small Application: a page that shows the four stages side by side. For each it shows who created the bucket and how, the products in it with their pictures, and the raw objects, or "not created yet" until the stage is deployed. It refreshes every five seconds, so leave it open during the promotion and each bucket appears as its stage goes live. Once a stage's test passes, `demo.sh` adds that stage's mug to its bucket, so every card has a picture: KubeVela for `aws-cue`, Guidewire for `aws-devkit`, AWS for `aws-ack` and Google Cloud for `gcp-devkit`.

The mugs in `sample/` (`mug-kubevela.svg`, `mug-guidewire.svg`, `mug-aws.svg`, `mug-gcp.svg`) each embed the official logo, unmodified, from the CNCF's `artwork` and `landscape` repositories; `sample/LOGOS.md` lists the sources and the trademark terms. To use another picture for a stage, replace its file and keep the base name: `mug-aws.png` works as well as `mug-aws.svg`, as long as only one of them is there.

It runs from the product-catalog image (`app/browser.py`, using the API's `storage.py`) and reads both Floci and floci-gcp. Its `BUCKETS` list must match the stages; `cd devkit && go test ./...` checks that.

## How ACK reaches Floci

`demo.sh` installs the ACK S3 controller's Helm chart with Floci as both its S3 and its STS endpoint (ACK calls `GetCallerIdentity` at startup), with plain HTTP allowed and path-style addressing on. The credentials secret holds Floci's dummy `test` keys.

On every reconcile ACK reads about twenty bucket settings (ACL, CORS, logging, metrics and the rest) and fails the sync if one errors. Floci 2.3.0 implements all of them but `GetBucketAbac`, which falls through to a ListObjects reply that the AWS SDK reads as "no ABAC status". Check this list again before moving to another Floci version.

## How the GCP bucket reaches floci-gcp

Crossplane's GCP ProviderConfig has no endpoint field. The provider runs the Terraform Google provider inside, though, and that reads `GOOGLE_STORAGE_CUSTOM_ENDPOINT` from its environment. `demo.sh` sets it on the provider pod through a DeploymentRuntimeConfig. The ProviderConfig uses an access token, which floci-gcp doesn't check.

## Layout

| Path | What it is |
|---|---|
| `demo.sh`, `clean.sh` | Bring the demo up and tear it down |
| `seed-products.sh` | Add the stage's mug as a product to each deployed stage |
| `apps/bucket-browser.yaml` | The bucket browser's Application |
| `sample/` | The stages' mugs (KubeVela, Guidewire, AWS, Google Cloud), and `mug.svg` for any other stage |
| `floci/` | Floci and floci-gcp, and the Crossplane ProviderConfigs pointing at them |
| `definitions/components/bucket-aws-cue.cue` | The CUE bucket component |
| `definitions/traits/high-availability.cue` | The `high-availability` trait, from kubevela-one-interface-demos |
| `apps/product-catalog.yaml` | The Application: components, stage policies and the promotion workflow |
| `devkit/` | The DevKit bucket components (Crossplane and ACK) and `high-availability-devkit` trait; see `devkit/README.md` |
| `app/` | The product-catalog API (Flask), the bucket browser (`browser.py`) and their image |

## Changes from kubevela-one-interface-demos

- `app/storage.py` addresses S3 buckets by path when `AWS_ENDPOINT_URL` is set, since Floci doesn't serve `<bucket>.<host>` virtual hosts. Against floci-gcp the GCS client needs nothing: `STORAGE_EMULATOR_HOST` makes it use anonymous credentials.
- The Crossplane bucket components create managed resources directly rather than through a composition. All the bucket components and take the same parameters as there (`name`, `region`, `projectName`; versioning is left out). `region` is limited to the regions `bucket-gcp-devkit` can map to a GCS location.
- One Application promotes across backings, where the original deploys one backing per run.
- The API base64-decodes `image_data` and takes its type from `image_content_type` (JPEG by default), so a stored picture is a real image file. The image key's extension follows the type, and without a picture the placeholder is `image.json`.
- The bucket browser is adapted from `apps/bucket-browser`, which browses one bucket and shows only text: this one shows every stage at once, renders pictures, and serves objects with a Content-Security-Policy so an uploaded SVG can't run scripts.
