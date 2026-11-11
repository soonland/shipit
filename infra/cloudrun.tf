# The shipit Cloud Run service: Terraform owns its settings,
# the GitHub workflows own what runs in it.
#
#   Terraform  -> identity, CPU/memory, scaling, probes, timeout, public access
#   deploy.yml -> the image (new revision on each release) and the traffic
#   preview.yml -> extra no-traffic revisions tagged pr-N (with PREVIEW_PR set)
#
# Anything the workflows change on every deploy is listed in ignore_changes,
# so a release or a preview never shows up as drift in the Terraform plan.

resource "google_cloud_run_v2_service" "shipit" {
  name                = "shipit"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = true # terraform destroy can't take the site down by accident

  template {
    service_account                  = "shipit-runtime@${var.project_id}.iam.gserviceaccount.com"
    max_instance_request_concurrency = 80
    timeout                          = "60s"

    scaling {
      min_instance_count = 0 # scale to zero: free when nobody visits
      max_instance_count = 3 # caps the bill, even under chaos or a traffic spike
    }

    containers {
      # Placeholder: the real image comes from the deploy workflow (ignored below).
      image = "${var.region}-docker.pkg.dev/${var.project_id}/cloud-run-source-deploy/shipit"

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "256Mi"
        }
        cpu_idle          = true # CPU only while handling a request (cheaper)
        startup_cpu_boost = true
      }

      # Only used when the service is created: the workflows add PREVIEW_PR to
      # preview revisions, so env is ignored afterwards.
      env {
        name = "CHAOS_KEY"
        value_source {
          secret_key_ref {
            secret  = "chaos-key"
            version = "latest"
          }
        }
      }

      startup_probe {
        tcp_socket {
          port = 8080
        }
        period_seconds    = 240
        timeout_seconds   = 240
        failure_threshold = 1
      }

      # Restart the container if /health stops answering.
      liveness_probe {
        http_get {
          path = "/health"
          port = 8080
        }
        period_seconds    = 30
        timeout_seconds   = 5
        failure_threshold = 3
      }
    }
  }

  lifecycle {
    ignore_changes = [
      client,
      client_version,
      build_config,
      traffic,
      scaling, # service-level scaling: unused, the revision limit above applies
      template[0].revision,
      template[0].labels,
      template[0].annotations,
      template[0].containers[0].image,
      template[0].containers[0].env,
    ]
  }
}

# Public website: anyone can call it, no Google sign-in.
resource "google_cloud_run_v2_service_iam_member" "public" {
  name     = google_cloud_run_v2_service.shipit.name
  location = google_cloud_run_v2_service.shipit.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
