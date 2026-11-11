# The bucket holding all Terraform state (created by hand first; adopted here).

resource "google_storage_bucket" "state" {
  name                        = local.state_bucket
  location                    = upper(var.region)
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  # Keep the 10 previous versions of each state file.
  lifecycle_rule {
    condition {
      with_state         = "ARCHIVED"
      num_newer_versions = 10
    }
    action {
      type = "Delete"
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}
