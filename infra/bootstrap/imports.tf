# One-time: adopt what was created by hand with the setup scripts.
# Delete this file after the first apply.

locals {
  p       = var.project_id
  email   = { for k, _ in local.service_accounts : k => "${k}@${var.project_id}.iam.gserviceaccount.com" }
  pool_id = "projects/${local.p}/locations/global/workloadIdentityPools/github"
}

import {
  for_each = local.service_accounts
  to       = google_service_account.this[each.key]
  id       = "projects/${local.p}/serviceAccounts/${local.email[each.key]}"
}

import {
  to = google_iam_workload_identity_pool.github
  id = local.pool_id
}

import {
  to = google_iam_workload_identity_pool_provider.github
  id = "${local.pool_id}/providers/github"
}

import {
  for_each = {
    github-deployer = "attribute.repository/${var.github_repo}"
    github-tf-plan  = "attribute.repository/${var.github_repo}"
    github-tf-apply = "attribute.ref/refs/heads/main"
  }
  to = google_service_account_iam_member.github_login[each.key]
  id = "projects/${local.p}/serviceAccounts/${local.email[each.key]} roles/iam.workloadIdentityUser principalSet://iam.googleapis.com/projects/${data.google_project.this.number}/locations/global/workloadIdentityPools/github/${each.value}"
}

import {
  for_each = local.project_roles
  to       = google_project_iam_member.this[each.key]
  id       = "${local.p} ${each.value.role} serviceAccount:${local.email[each.value.sa]}"
}

import {
  to = google_service_account_iam_member.deployer_acts_as_runtime
  id = "projects/${local.p}/serviceAccounts/${local.email["shipit-runtime"]} roles/iam.serviceAccountUser serviceAccount:${local.email["github-deployer"]}"
}

import {
  to = google_storage_bucket.state
  id = local.state_bucket
}

import {
  for_each = { github-tf-plan = "roles/storage.objectViewer", github-tf-apply = "roles/storage.objectAdmin" }
  to       = google_storage_bucket_iam_member.state[each.key]
  id       = "b/${local.state_bucket} ${each.value} serviceAccount:${local.email[each.key]}"
}

import {
  for_each = { github-tf-plan = "roles/iam.securityReviewer", github-tf-apply = "roles/artifactregistry.admin" }
  to       = google_artifact_registry_repository_iam_member.ci[each.key]
  id       = "projects/${local.p}/locations/${var.region}/repositories/${local.repo} ${each.value} serviceAccount:${local.email[each.key]}"
}

import {
  to = google_secret_manager_secret.chaos_key
  id = "projects/${local.p}/secrets/chaos-key"
}

import {
  to = google_secret_manager_secret_iam_member.runtime_reads_chaos_key
  id = "projects/${local.p}/secrets/chaos-key roles/secretmanager.secretAccessor serviceAccount:${local.email["shipit-runtime"]}"
}

import {
  to = google_billing_budget.project
  id = "billingAccounts/${var.billing_account}/budgets/3b410a42-906a-4b35-9cb6-2b1b3301b343"
}
