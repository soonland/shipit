# Who is who. Every robot gets its own identity with only what it needs.

locals {
  service_accounts = {
    github-deployer = {
      name        = "GitHub deployer"
      description = ""
    }
    shipit-runtime = {
      name        = "shipit runtime"
      description = "Identity of the shipit Cloud Run container"
    }
    github-tf-plan = {
      name        = "GitHub Terraform plan (read-only)"
      description = ""
    }
    github-tf-apply = {
      name        = "GitHub Terraform apply (main only)"
      description = ""
    }
  }

  sa = { for k, v in google_service_account.this : k => "serviceAccount:${v.email}" }
}

resource "google_service_account" "this" {
  for_each = local.service_accounts

  account_id   = each.key
  display_name = each.value.name
  description  = each.value.description
}
