#!/usr/bin/env bash
# One-time setup: a dedicated, least-privilege identity for the shipit container.
# Replaces the default compute service account (which usually has Editor on the project).
set -euo pipefail

PROJECT_ID=devops-playground-14386
SA_NAME=shipit-runtime
SA="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"
DEPLOYER="github-deployer@$PROJECT_ID.iam.gserviceaccount.com"

gcloud iam service-accounts describe "$SA" --project "$PROJECT_ID" >/dev/null 2>&1 ||
  gcloud iam service-accounts create "$SA_NAME" --project "$PROJECT_ID" \
    --display-name "shipit runtime" --description "Identity of the shipit Cloud Run container"

# The only thing the app needs: read the chaos code. (Logs and metrics are collected
# by Cloud Run from stdout, and the metadata server needs no permission.)
# A new service account takes a few seconds to be visible to other services (IAM is
# eventually consistent), so retry the first binding instead of failing.
for attempt in 1 2 3 4 5 6; do
  gcloud secrets add-iam-policy-binding chaos-key --project "$PROJECT_ID" \
    --member "serviceAccount:$SA" --role roles/secretmanager.secretAccessor --quiet >/dev/null 2>&1 && break
  [ "$attempt" = 6 ] && { echo "Service account still not visible, run the script again."; exit 1; }
  echo "Waiting for the new service account to propagate ($attempt)…"; sleep 10
done

# Let the GitHub deploy workflow run the service as this account.
gcloud iam service-accounts add-iam-policy-binding "$SA" --project "$PROJECT_ID" \
  --member "serviceAccount:$DEPLOYER" --role roles/iam.serviceAccountUser --quiet >/dev/null

echo "Done: $SA can read chaos-key, and github-deployer can deploy with it."
