#!/usr/bin/env bash
# Extra permissions for the Terraform workflow, now that it also manages
# the Artifact Registry repository (with its cleanup policy) and the project APIs.
set -euo pipefail

PROJECT_ID=devops-playground-14386
REGION=northamerica-northeast1
REPO=cloud-run-source-deploy
PLAN_SA="github-tf-plan@$PROJECT_ID.iam.gserviceaccount.com"
APPLY_SA="github-tf-apply@$PROJECT_ID.iam.gserviceaccount.com"

bind() { gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:$1" \
  --role "$2" --condition None --quiet >/dev/null; }

# plan (read-only): see the repository and which APIs are enabled
bind "$PLAN_SA" roles/artifactregistry.reader
bind "$PLAN_SA" roles/serviceusage.serviceUsageViewer

# apply: enable APIs, and administer THIS repository only (cleanup policy, IAM)
bind "$APPLY_SA" roles/serviceusage.serviceUsageAdmin
gcloud artifacts repositories add-iam-policy-binding "$REPO" --project "$PROJECT_ID" --location "$REGION" \
  --member "serviceAccount:$APPLY_SA" --role roles/artifactregistry.admin --quiet >/dev/null

echo "Done."
