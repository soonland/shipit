# Where `gcloud run deploy --source` stores the container images.
resource "google_artifact_registry_repository" "run_source" {
  location      = var.region
  repository_id = "cloud-run-source-deploy"
  description   = "Cloud Run Source Deployments"
  format        = "DOCKER"

  cleanup_policy_dry_run = false

  # Release images are tagged vX.Y.Z by the deploy workflow: never delete them,
  # so the revision production runs on (and recent rollbacks) always have their image.
  cleanup_policies {
    id     = "keep-releases"
    action = "KEEP"
    condition {
      tag_state    = "TAGGED"
      tag_prefixes = ["v"]
    }
  }

  # Always keep the 10 most recent images (recent previews and builds).
  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }

  # Everything else (old preview builds) is deleted after 14 days.
  cleanup_policies {
    id     = "delete-old"
    action = "DELETE"
    condition {
      tag_state  = "ANY"
      older_than = "1209600s"
    }
  }

  depends_on = [google_project_service.apis]
}

# The deploy workflow tags release images, so its identity needs write access here.
resource "google_artifact_registry_repository_iam_member" "deployer_writer" {
  location   = google_artifact_registry_repository.run_source.location
  repository = google_artifact_registry_repository.run_source.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:github-deployer@${var.project_id}.iam.gserviceaccount.com"
}
