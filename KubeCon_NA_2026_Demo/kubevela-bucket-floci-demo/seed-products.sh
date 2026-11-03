#!/bin/bash
# Gives each stage's bucket a product with the stage's mug, through its API,
# unless the stage already has one of that name (so it can run again). The
# bucket browser (http://localhost:8081) shows the result.
#
# Usage: ./seed-products.sh [stage...]   (default: all four stages)
#
# Mugs are sample/mug-<logo>.*: KubeVela, Guidewire, AWS, then Google Cloud.
# Drop in an official logo of the same name to replace one. It runs inside
# each stage's API pod, so nothing is needed locally but kubectl.
set -euo pipefail

SAMPLES="$(dirname "$0")/sample"
STAGES="${*:-aws-cue aws-devkit aws-ack gcp-devkit}"

# A stage's logo: its file name, then how the product names it.
stage_logo() {
    case "$1" in
        aws-cue) echo "kubevela KubeVela" ;;
        aws-devkit) echo "guidewire Guidewire" ;;
        aws-ack) echo "aws AWS" ;;
        gcp-devkit) echo "gcp GCP" ;;
        *) echo "✗ unknown stage $1" >&2; exit 1 ;;
    esac
}

# Run by `python -` in the pod, with NAME, IMAGE_B64 and IMAGE_TYPE set ahead of it.
read -r -d '' SEED <<'PY' || true
import json, random, urllib.request

API = "http://localhost:8080/products"
with urllib.request.urlopen(API, timeout=10) as resp:
    names = [p.get("name") for p in json.load(resp)["products"]]
if NAME in names:
    print(f"Already has {NAME}")
else:
    body = json.dumps({"name": NAME, "price": random.randint(10, 20), "image_data": IMAGE_B64,
                       "image_content_type": IMAGE_TYPE}).encode()
    request = urllib.request.Request(API, data=body, method="POST",
                                     headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=30) as resp:
        print(f"Created {json.load(resp)['name']}")
PY

failed=0
for stage in $STAGES; do
    entry="$(stage_logo "$stage")"
    read -r file logo <<<"$entry"
    picture="$(ls "$SAMPLES/mug-$file".* | head -1)"
    case "$picture" in
        *.svg) type=image/svg+xml ;;
        *.png) type=image/png ;;
        *) type=image/jpeg ;;
    esac
    printf '\n=== %s ===\n' "$stage"
    if ! kubectl -n "$stage" get deploy/product-catalog-api >/dev/null 2>&1; then
        echo "Not deployed yet"
        continue
    fi
    printf 'NAME = "Mug %s (%s)"\nIMAGE_B64 = "%s"\nIMAGE_TYPE = "%s"\n%s\n' \
        "$logo" "$stage" "$(base64 <"$picture" | tr -d '\n')" "$type" "$SEED" |
        kubectl -n "$stage" exec -i deploy/product-catalog-api -- python - ||
        { echo "✗ Couldn't seed $stage"; failed=1; }
done
exit "$failed"
