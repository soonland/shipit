# The chaos code. Terraform manages the empty container and who can read it;
# the value itself is added from your terminal (scripts/setup-chaos-key.sh)
# so it never appears in code or in the Terraform state.

resource "google_secret_manager_secret" "chaos_key" {
  secret_id = "chaos-key"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_iam_member" "runtime_reads_chaos_key" {
  secret_id = google_secret_manager_secret.chaos_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = local.sa["shipit-runtime"]
}
