#!/usr/bin/env bash
# One-time setup: lets GitHub Actions in soonland/shipit deploy to Cloud Run
# using Workload Identity Federation (short-lived tokens, no JSON keys).
set -euo pipefail

PROJECT_ID=devops-playground-14386
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
REPO=soonland/shipit
SA_NAME=github-deployer
SA="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"
POOL=github
PROVIDER=github

gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --project "$PROJECT_ID"

# 1. Service account the workflow acts as
gcloud iam service-accounts describe "$SA" --project "$PROJECT_ID" >/dev/null 2>&1 ||
  gcloud iam service-accounts create "$SA_NAME" --project "$PROJECT_ID" --display-name "GitHub deployer"

# 2. Just enough to deploy from source to Cloud Run
for ROLE in roles/run.sourceDeveloper roles/serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member "serviceAccount:$SA" --role "$ROLE" --condition None --quiet >/dev/null
done
# ...and to run the service as the default runtime account
gcloud iam service-accounts add-iam-policy-binding \
  "$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --project "$PROJECT_ID" --member "serviceAccount:$SA" \
  --role roles/iam.serviceAccountUser --quiet >/dev/null

# 3. Trust GitHub's identity tokens, but only from this repo
gcloud iam workload-identity-pools describe "$POOL" --project "$PROJECT_ID" --location global >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools create "$POOL" --project "$PROJECT_ID" --location global \
    --display-name "GitHub Actions"

gcloud iam workload-identity-pools providers describe "$PROVIDER" --project "$PROJECT_ID" \
  --location global --workload-identity-pool "$POOL" >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" --project "$PROJECT_ID" \
    --location global --workload-identity-pool "$POOL" \
    --display-name "GitHub" \
    --issuer-uri "https://token.actions.githubusercontent.com" \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition "assertion.repository == '$REPO'"

gcloud iam service-accounts add-iam-policy-binding "$SA" --project "$PROJECT_ID" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL/attribute.repository/$REPO" \
  --quiet >/dev/null

# 4. Tell the workflow where to authenticate (non-secret values)
gh variable set GCP_WIF_PROVIDER --repo "$REPO" \
  --body "projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL/providers/$PROVIDER"
gh variable set GCP_DEPLOY_SA --repo "$REPO" --body "$SA"

echo "Done. Run the Deploy workflow from https://github.com/$REPO/actions"
