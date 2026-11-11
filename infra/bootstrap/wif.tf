# Workload Identity Federation: GitHub Actions signs in with a short-lived
# token from GitHub, instead of a downloaded key. Only one repository is accepted.

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github"
  display_name              = "GitHub Actions"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }
  attribute_condition = "assertion.repository == '${var.github_repo}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

locals {
  pool = google_iam_workload_identity_pool.github.name
  # Any workflow of the repository...
  from_repo = "principalSet://iam.googleapis.com/${local.pool}/attribute.repository/${var.github_repo}"
  # ...or only workflows running on main (the provider already limits it to the repository).
  from_main = "principalSet://iam.googleapis.com/${local.pool}/attribute.ref/refs/heads/main"
}

resource "google_service_account_iam_member" "github_login" {
  for_each = {
    github-deployer = local.from_repo
    github-tf-plan  = local.from_repo
    github-tf-apply = local.from_main
  }

  service_account_id = google_service_account.this[each.key].name
  role               = "roles/iam.workloadIdentityUser"
  member             = each.value
}
