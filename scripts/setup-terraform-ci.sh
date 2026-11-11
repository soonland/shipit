#!/usr/bin/env bash
# One-time setup: two identities for the Terraform workflow.
#   github-tf-plan  : read-only, usable from any workflow in soonland/shipit (PR plans)
#   github-tf-apply : can change monitoring, usable ONLY from workflows running on main
set -euo pipefail

PROJECT_ID=devops-playground-14386
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
REPO=soonland/shipit
BUCKET=devops-playground-14386-tfstate
POOL=github
PROVIDER=github
PLAN_SA="github-tf-plan@$PROJECT_ID.iam.gserviceaccount.com"
APPLY_SA="github-tf-apply@$PROJECT_ID.iam.gserviceaccount.com"
PRINCIPALS="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL"

# Expose the git ref in GitHub's identity token, so access can be limited to main.
gcloud iam workload-identity-pools providers update-oidc "$PROVIDER" --project "$PROJECT_ID" \
  --location global --workload-identity-pool "$POOL" \
  --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  >/dev/null

create_sa() {
  gcloud iam service-accounts describe "$1@$PROJECT_ID.iam.gserviceaccount.com" --project "$PROJECT_ID" >/dev/null 2>&1 ||
    gcloud iam service-accounts create "$1" --project "$PROJECT_ID" --display-name "$2"
}
create_sa github-tf-plan "GitHub Terraform plan (read-only)"
create_sa github-tf-apply "GitHub Terraform apply (main only)"

# New service accounts take a few seconds to propagate: retry project bindings.
bind_project() {
  for attempt in 1 2 3 4 5 6; do
    gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:$1" \
      --role "$2" --condition None --quiet >/dev/null 2>&1 && return
    echo "Waiting for $1 to propagate ($attempt)…"; sleep 10
  done
  echo "Could not bind $2 to $1, run the script again."; exit 1
}
bind_project "$PLAN_SA" roles/monitoring.viewer
bind_project "$APPLY_SA" roles/monitoring.editor

# State bucket: plan reads, apply reads and writes (state + lock).
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" \
  --member "serviceAccount:$PLAN_SA" --role roles/storage.objectViewer >/dev/null
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" \
  --member "serviceAccount:$APPLY_SA" --role roles/storage.objectAdmin >/dev/null

# Who may use them: plan from any workflow of the repo, apply only from main.
gcloud iam service-accounts add-iam-policy-binding "$PLAN_SA" --project "$PROJECT_ID" \
  --role roles/iam.workloadIdentityUser --member "$PRINCIPALS/attribute.repository/$REPO" --quiet >/dev/null
gcloud iam service-accounts add-iam-policy-binding "$APPLY_SA" --project "$PROJECT_ID" \
  --role roles/iam.workloadIdentityUser --member "$PRINCIPALS/attribute.ref/refs/heads/main" --quiet >/dev/null

gh variable set GCP_TF_PLAN_SA --repo "$REPO" --body "$PLAN_SA"
gh variable set GCP_TF_APPLY_SA --repo "$REPO" --body "$APPLY_SA"

echo "Done. Now set the alert email secret: gh secret set ALERT_EMAIL --repo $REPO"
