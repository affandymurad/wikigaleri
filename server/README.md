# WikiGaleri API

Small Express service for **Cloud Run**. It sits between the browser app and Gemini:

- `POST /api/analyze` explains one Commons file (license, credit line, plain-language summary).
- `POST /api/area` summarizes the area around a map point.
- `GET /api/health` returns `{ "ok": true }`.

Each request: check the allowed origin → rate limit → look in the **Firestore** cache → if missing, take one slot from the daily budget → call Gemini (Flash-Lite only, text only) → cache the answer.

## Cost and abuse guards

| Guard | Value |
|---|---|
| Gemini key | From an AI Studio project **without billing**, so it stays on the free tier and cannot be charged |
| Daily Gemini calls | `DAILY_GEMINI_LIMIT`, default 300 per UTC day. Cache hits are free and not counted. Over the limit the API answers `daily_limit` and the app shows its local summary |
| Rate limit | 10 requests per minute per IP, 60 per minute overall |
| Origin | Only `ALLOWED_ORIGINS` may call the API |
| Input | 32 KB body, field lengths capped, fixed request types, `maxOutputTokens` 2048 |
| Cloud Run | `--max-instances 1`, `--min-instances 0`, request-based billing |
| Key handling | Secret Manager, sent to Gemini in a header, never logged, never sent to the browser |
| Firestore | `aiCache` (30-day TTL) and `usage` (7-day TTL). Rules deny all browser access |

Budget alerts only notify, with a delay. They are not a hard cap, so the guards above are what keep the bill near zero.

## Run locally

```bash
cd server
npm install
cp .env.example .env   # then put your own key in GEMINI_API_KEY
GEMINI_API_KEY=... npm run dev
```

In another terminal run `npm run dev` in the repo root. Vite proxies `/api` to `http://localhost:8080`. Locally the cache and daily counter live in memory (`CACHE_BACKEND=memory`).

## Deploy

Replace `PROJECT` with the Firebase project (`wikigaleri`). The region below is a Tier 1 region close to Indonesia.

```bash
gcloud config set project PROJECT

# 1. APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  secretmanager.googleapis.com firestore.googleapis.com

# 2. Firestore (Native mode) and TTL policies so old cache entries are removed for free
gcloud firestore databases create --location=asia-southeast1
gcloud firestore fields ttls update expireAt --collection-group=aiCache --enable-ttl
gcloud firestore fields ttls update expireAt --collection-group=usage --enable-ttl

# 3. Gemini key (from the AI Studio project without billing)
printf %s "PASTE_KEY_HERE" | gcloud secrets create gemini-api-key --data-file=-

# 4. Let Cloud Run's service account read the secret and use Firestore
SA="$(gcloud projects describe PROJECT --format='value(projectNumber)')-compute@developer.gserviceaccount.com"
gcloud secrets add-iam-policy-binding gemini-api-key --member="serviceAccount:$SA" --role=roles/secretmanager.secretAccessor
gcloud projects add-iam-policy-binding PROJECT --member="serviceAccount:$SA" --role=roles/datastore.user

# 5. Deploy the API
gcloud run deploy wikigaleri-api --source server --region asia-southeast1 \
  --allow-unauthenticated \
  --max-instances 1 --min-instances 0 --concurrency 20 --cpu 1 --memory 256Mi --timeout 60 \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest \
  --set-env-vars "^@^DAILY_GEMINI_LIMIT=300@ALLOWED_ORIGINS=https://wikigaleri.web.app,https://wikigaleri.firebaseapp.com"

# 6. Deploy the site, the /api/** rewrite and the Firestore rules
cd .. && npm run build && firebase deploy --only hosting,firestore:rules
```

`--allow-unauthenticated` is needed because browsers call the API through Firebase Hosting. The guards above protect it.

After deploying, check old container images in Artifact Registry now and then and delete the ones you do not need: storage beyond the free 0.5 GB is billed.

## Not done yet

- Budget alert and automatic kill switch (budget → Pub/Sub → function that stops the service).
- Firebase App Check.
