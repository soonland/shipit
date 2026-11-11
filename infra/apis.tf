# APIs shipit needs. Disabling is never done by Terraform (other things may depend on them).
locals {
  apis = toset([
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "serviceusage.googleapis.com",
    "storage.googleapis.com",
    "sts.googleapis.com",
  ])
}

resource "google_project_service" "apis" {
  for_each = local.apis

  service                    = each.key
  disable_on_destroy         = false
  disable_dependent_services = false
}
