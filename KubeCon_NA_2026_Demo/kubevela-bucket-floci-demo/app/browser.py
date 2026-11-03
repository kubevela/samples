#!/usr/bin/env python3
"""
Bucket Browser: every stage's bucket on one page.

Adapted from kubevela-one-interface-demos/apps/bucket-browser, which browses one
bucket. This one reads BUCKETS, one entry per stage separated by ';', each
'stage|provider|bucket|label':

    BUCKETS="aws-cue|aws|product-images-aws-cue|AWS S3 via Crossplane, CUE;..."

and shows, for each stage, the pictures of the products the product-catalog
API stored in its bucket, then the bucket's raw objects. *word* in a label
shows in red. It uses the API's storage.py, so S3 in Floci and Cloud Storage in floci-gcp need no extra code.
It only reads.
"""
import json
import mimetypes
import os
import re
from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from flask import Flask, Response, abort, render_template_string
from markupsafe import Markup, escape

from storage import GcsObjectStore, S3ObjectStore

app = Flask(__name__)

STORES = {'aws': S3ObjectStore, 'gcp': GcsObjectStore}

# Product times show in Salt Lake City's zone.
LOCAL_ZONE = ZoneInfo('America/Denver')

# Objects are served from a bucket the API's callers write to, so they may not
# run scripts or fetch anything; pictures render through <img> only. data:
# images are allowed: the sample mugs embed their logo that way.
OBJECT_HEADERS = {
    'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
    'X-Content-Type-Options': 'nosniff',
}


def parse_buckets(spec):
    """Turns BUCKETS into an ordered list of stages."""
    stages = []
    for entry in filter(None, (e.strip() for e in spec.split(';'))):
        stage, provider, bucket, label = (part.strip() for part in entry.split('|'))
        if provider not in STORES:
            raise ValueError(f'{stage}: provider {provider!r} is not one of {sorted(STORES)}')
        stages.append({'stage': stage, 'provider': provider, 'bucket': bucket, 'label': label,
                       'store': STORES[provider](bucket)})
    return stages


@app.template_filter()
def emphasize(text):
    """Escapes text, then shows each *word* in bold."""
    return Markup(re.sub(r'\*([^*]+)\*', r'<span class="changed">\1</span>', str(escape(text))))


@app.template_filter()
def short_time(iso):
    """An API timestamp, UTC unless it says otherwise, as MM-DD-YY HH:MM:SS local."""
    try:
        when = datetime.fromisoformat(iso)
    except (TypeError, ValueError):
        return iso
    if when.tzinfo is None:
        when = when.replace(tzinfo=UTC)
    return when.astimezone(LOCAL_ZONE).strftime('%m-%d-%y %H:%M:%S')


STAGES = parse_buckets(os.environ.get('BUCKETS', ''))
BY_NAME = {s['stage']: s for s in STAGES}
if len(BY_NAME) != len(STAGES):
    raise ValueError('BUCKETS lists a stage name twice')


def stage_view(stage):
    """What one card shows: the state of the bucket, its products and objects."""
    view = {k: stage[k] for k in ('stage', 'label')}
    view.update(state='ok', products=[], objects=[], error=None)
    store = stage['store']
    # One broken bucket must not take the page down, so catch everything.
    try:
        if not store.bucket_exists():
            view['state'] = 'missing'
            return view
        view['objects'] = sorted(store.list_keys(''))
        for key in view['objects']:
            if key.endswith('/product.json'):
                product = json.loads(store.get(key) or b'{}')
                product['has_picture'] = product.get('image_content_type', '').startswith('image/')
                view['products'].append(product)
        view['products'].sort(key=lambda p: p.get('created_at', ''))
    except Exception as e:  # noqa: BLE001
        view['state'], view['error'] = 'error', str(e)
    return view


PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="5">
<title>Bucket Browser</title>
<style>
  :root { --bg: #f6f7f9; --card: #fff; --text: #1d2430; --muted: #5f6b7a; --line: #dde2e8;
          --ok: #1f7a4d; --warn: #9a6700; --err: #b42318; }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #14181f; --card: #1c222b; --text: #e6e9ee; --muted: #9aa5b4; --line: #2c3440;
            --ok: #4cc38a; --warn: #e3b341; --err: #f97066; }
  }
  body { margin: 0; padding: 16px; background: var(--bg); color: var(--text);
         font: 15px/1.4 system-ui, sans-serif; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: var(--muted); margin: 0 0 16px; }
  .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 14px; }
  .card h2 { font-size: 16px; margin: 0 0 8px; }
  .changed { color: var(--err); }
  .state-ok { color: var(--ok); } .state-missing { color: var(--warn); } .state-error { color: var(--err); }
  .product { display: flex; gap: 10px; align-items: center; padding: 8px 0; border-top: 1px solid var(--line); }
  .product img { width: 88px; height: 88px; object-fit: contain; border-radius: 6px;
                 background: var(--bg); flex: none; }
  .meta { color: var(--muted); font-size: 13px; }
  details { margin-top: 8px; } summary { cursor: pointer; color: var(--muted); }
  ul { padding-left: 18px; margin: 6px 0 0; font-family: ui-monospace, monospace; font-size: 12px; }
  a { color: inherit; }
</style>
</head>
<body>
<h1>Bucket Browser</h1>
<p class="sub">The product-catalog bucket of each stage, with its products' pictures. Refreshes every 5 seconds.</p>
<div class="grid">
{% for v in views %}
  <section class="card">
    <h2>{{ v.label|emphasize }}</h2>
    {% if v.state == 'missing' %}
      <p class="state-missing">Bucket not created yet</p>
    {% elif v.state == 'error' %}
      <p class="state-error">Can't read the bucket: {{ v.error }}</p>
    {% else %}
      <p class="state-ok">{{ v.products|length }} product(s), {{ v.objects|length }} object(s)</p>
      {% for p in v.products if p.has_picture %}
        <div class="product">
          <img src="{{ url_for('view_object', stage=v.stage, key=p.image_key) }}" alt="{{ p.name }}">
          <div>
            <div>{{ p.name }}</div>
            <div class="meta">price {{ p.price }} · {{ p.created_at|short_time }}</div>
          </div>
        </div>
      {% endfor %}
      {% if v.objects %}
        <details>
          <summary>Objects</summary>
          <ul>
          {% for key in v.objects %}
            <li><a href="{{ url_for('view_object', stage=v.stage, key=key) }}">{{ key }}</a></li>
          {% endfor %}
          </ul>
        </details>
      {% endif %}
    {% endif %}
  </section>
{% endfor %}
</div>
</body>
</html>
"""


@app.route('/health', methods=['GET'])
def health_check():
    return {'status': 'healthy'}, 200


@app.route('/ready', methods=['GET'])
def readiness_check():
    # Ready whether or not the buckets exist yet: showing that is the point.
    return {'status': 'ready', 'stages': [s['stage'] for s in STAGES]}, 200


@app.route('/', methods=['GET'])
def index():
    return render_template_string(PAGE, views=[stage_view(s) for s in STAGES])


@app.route('/object/<stage>/<path:key>', methods=['GET'])
def view_object(stage, key):
    """Serves one object as stored, typed from its key's extension."""
    if stage not in BY_NAME:
        abort(404)
    try:
        data = BY_NAME[stage]['store'].get(key)
    except Exception:  # noqa: BLE001
        abort(502)
    if data is None:
        abort(404)
    content_type = mimetypes.guess_type(key)[0] or 'application/octet-stream'
    return Response(data, content_type=content_type, headers=OBJECT_HEADERS)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
