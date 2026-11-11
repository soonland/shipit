#!/usr/bin/env bash
# One-time setup: store your chaos code in Secret Manager and give it to Cloud Run.
# The code is typed here (hidden), never stored in the repo or the page.
# NOTE: updating the service creates a new Cloud Run revision (a redeploy of the same image).
set -euo pipefail

PROJECT_ID=devops-playground-14386
REGION=northamerica-northeast1
SERVICE=shipit
SECRET=chaos-key
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
RUNTIME_SA="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

read -r -s -p "Chaos code (8+ characters): " CODE; echo
[ ${#CODE} -ge 8 ] || { echo "Too short."; exit 1; }

gcloud services enable secretmanager.googleapis.com --project "$PROJECT_ID"

if gcloud secrets describe "$SECRET" --project "$PROJECT_ID" >/dev/null 2>&1; then
  printf '%s' "$CODE" | gcloud secrets versions add "$SECRET" --project "$PROJECT_ID" --data-file=-
else
  printf '%s' "$CODE" | gcloud secrets create "$SECRET" --project "$PROJECT_ID" \
    --replication-policy=automatic --data-file=-
fi

# Only the Cloud Run runtime account may read this one secret.
gcloud secrets add-iam-policy-binding "$SECRET" --project "$PROJECT_ID" \
  --member "serviceAccount:$RUNTIME_SA" --role roles/secretmanager.secretAccessor --quiet >/dev/null

gcloud run services update "$SERVICE" --project "$PROJECT_ID" --region "$REGION" \
  --update-secrets "CHAOS_KEY=$SECRET:latest"

echo "Done. Unlock chaos mode with the lock in the terminal's status bar."
