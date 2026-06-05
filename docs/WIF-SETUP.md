# Keyless live-sync setup (Workload Identity Federation)

This lets the GitHub Actions cron write live scores to Firestore **without a
service-account key** (which your org policy blocks). One-time setup. Needs an
account with IAM admin on the project (you or IT) and the `gcloud` CLI.

> Existing service account (from your console): `firebase-adminsdk-fbsvc@world-cup-2026-c145b.iam.gserviceaccount.com`

```bash
PROJECT=world-cup-2026-c145b
SA=firebase-adminsdk-fbsvc@world-cup-2026-c145b.iam.gserviceaccount.com
REPO=YOUR_GH_ORG/YOUR_REPO          # e.g. storenext/mundial-2026
POOL=github-pool
PROVIDER=github-provider

gcloud config set project $PROJECT
PROJECT_NUMBER=$(gcloud projects describe $PROJECT --format='value(projectNumber)')

# 1) Enable APIs
gcloud services enable iamcredentials.googleapis.com sts.googleapis.com

# 2) Workload Identity Pool + GitHub OIDC provider
gcloud iam workload-identity-pools create $POOL --location=global --display-name="GitHub"
gcloud iam workload-identity-pools providers create-oidc $PROVIDER \
  --location=global --workload-identity-pool=$POOL \
  --display-name="GitHub OIDC" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='${REPO}'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# 3) Let that repo impersonate the service account
gcloud iam service-accounts add-iam-policy-binding $SA \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${REPO}"

# 4) Make sure the SA can write Firestore (usually already Editor)
gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:${SA}" --role=roles/datastore.user

# 5) Print the provider resource name for the GitHub secret
echo "projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}"
```

Then add **GitHub repo → Settings → Secrets and variables → Actions**:
- `GCP_WIF_PROVIDER` = the resource name printed in step 5
- `GCP_SERVICE_ACCOUNT` = `firebase-adminsdk-fbsvc@world-cup-2026-c145b.iam.gserviceaccount.com`
- `FOOTBALL_DATA_TOKEN` = your football-data.org token

The workflow `.github/workflows/live-sync.yml` is already wired for this. If your
org also blocks Workload Identity Pool creation, ask IT to run steps 2–3, or fall
back to **manual score entry** in the admin Matches tab (no setup needed).
