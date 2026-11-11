# What each identity may do. Prefer a single resource over the whole project.

locals {
  repo         = "cloud-run-source-deploy"
  state_bucket = "${var.project_id}-tfstate"

  project_roles = {
    "deployer-run"     = { sa = "github-deployer", role = "roles/run.sourceDeveloper" }
    "deployer-usage"   = { sa = "github-deployer", role = "roles/serviceusage.serviceUsageConsumer" }
    "plan-registry"    = { sa = "github-tf-plan", role = "roles/artifactregistry.reader" }
    "plan-monitoring"  = { sa = "github-tf-plan", role = "roles/monitoring.viewer" }
    "plan-services"    = { sa = "github-tf-plan", role = "roles/serviceusage.serviceUsageViewer" }
    "apply-monitoring" = { sa = "github-tf-apply", role = "roles/monitoring.editor" }
    "apply-services"   = { sa = "github-tf-apply", role = "roles/serviceusage.serviceUsageAdmin" }
  }
}

resource "google_project_iam_member" "this" {
  for_each = local.project_roles

  project = var.project_id
  role    = each.value.role
  member  = local.sa[each.value.sa]
}

# The deploy workflow may run the service as shipit-runtime.
resource "google_service_account_iam_member" "deployer_acts_as_runtime" {
  service_account_id = google_service_account.this["shipit-runtime"].name
  role               = "roles/iam.serviceAccountUser"
  member             = local.sa["github-deployer"]
}

# Terraform state: plan reads it, apply writes it.
resource "google_storage_bucket_iam_member" "state" {
  for_each = {
    github-tf-plan  = "roles/storage.objectViewer"
    github-tf-apply = "roles/storage.objectAdmin"
  }

  bucket = google_storage_bucket.state.name
  role   = each.value
  member = local.sa[each.key]
}

# The image registry (the repository itself is managed by the main stack).
resource "google_artifact_registry_repository_iam_member" "ci" {
  for_each = {
    github-tf-plan  = "roles/iam.securityReviewer"
    github-tf-apply = "roles/artifactregistry.admin"
  }

  location   = var.region
  repository = local.repo
  role       = each.value
  member     = local.sa[each.key]
}
