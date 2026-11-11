# Uptime check, email channel and alert policies for shipit.
# The email address comes from var.alert_email (terraform.tfvars, git-ignored).

resource "google_monitoring_notification_channel" "email" {
  display_name = "Alerts email"
  enabled      = true
  labels = {
    email_address = var.alert_email
  }
  project = var.project_id
  type    = "email"
}

resource "google_monitoring_uptime_check_config" "health" {
  checker_type       = "STATIC_IP_CHECKERS"
  display_name       = "shipit /health"
  log_check_failures = false
  period             = "300s"
  project            = var.project_id
  selected_regions   = ["USA_VIRGINIA", "USA_OREGON", "USA_IOWA"]
  timeout            = "10s"
  content_matchers {
    content = "ok"
    matcher = "CONTAINS_STRING"
  }
  http_check {
    mask_headers   = false
    path           = "/health"
    port           = 443
    request_method = "GET"
    use_ssl        = true
    validate_ssl   = false
  }
  monitored_resource {
    labels = {
      host       = "shipit-116485471187.northamerica-northeast1.run.app"
      project_id = "devops-playground-14386"
    }
    type = "uptime_url"
  }
}

resource "google_monitoring_alert_policy" "site_down" {
  combiner              = "OR"
  display_name          = "shipit: site down"
  enabled               = true
  notification_channels = [google_monitoring_notification_channel.email.name]
  project               = var.project_id
  severity              = "CRITICAL"
  alert_strategy {
    auto_close = "1800s"
  }
  conditions {
    display_name = "Uptime check failing in 2+ regions"
    condition_threshold {
      comparison      = "COMPARISON_GT"
      duration        = "60s"
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\" AND metric.label.check_id=\"${google_monitoring_uptime_check_config.health.uptime_check_id}\""
      threshold_value = 1
      aggregations {
        alignment_period     = "1200s"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.*"]
        per_series_aligner   = "ALIGN_NEXT_OLDER"
      }
      trigger {
        count   = 1
        percent = 0
      }
    }
  }
  documentation {
    content   = "**/health is failing from at least 2 regions.**\n\nCheck the latest deploy in GitHub Actions and the Cloud Run revisions; roll back with `gcloud run services update-traffic shipit --to-revisions=<previous>=100`.\n\n[Dashboard](https://console.cloud.google.com/monitoring/dashboards/builder/cf717913-54db-4263-a4f3-fcc4085fc2c7?project=devops-playground-14386) · [Live site](https://shipit-116485471187.northamerica-northeast1.run.app)"
    mime_type = "text/markdown"
  }
}

resource "google_monitoring_alert_policy" "slow" {
  combiner              = "OR"
  display_name          = "shipit: slow responses"
  enabled               = true
  notification_channels = [google_monitoring_notification_channel.email.name]
  project               = var.project_id
  severity              = "WARNING"
  alert_strategy {
    auto_close = "1800s"
  }
  conditions {
    display_name = "p95 latency above 1 s for 10 minutes"
    condition_threshold {
      comparison      = "COMPARISON_GT"
      duration        = "600s"
      filter          = "metric.type=\"run.googleapis.com/request_latencies\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"shipit\""
      threshold_value = 1000
      aggregations {
        alignment_period     = "300s"
        cross_series_reducer = "REDUCE_MAX"
        per_series_aligner   = "ALIGN_PERCENTILE_95"
      }
      trigger {
        count   = 1
        percent = 0
      }
    }
  }
  documentation {
    content   = "**95% of requests are slower than 1 s.** Cold starts alone should not last 10 minutes; check CPU/memory on the dashboard.\n\n[Dashboard](https://console.cloud.google.com/monitoring/dashboards/builder/cf717913-54db-4263-a4f3-fcc4085fc2c7?project=devops-playground-14386) · [Live site](https://shipit-116485471187.northamerica-northeast1.run.app)"
    mime_type = "text/markdown"
  }
}

resource "google_monitoring_alert_policy" "errors_5xx" {
  combiner              = "OR"
  display_name          = "shipit: 5xx errors"
  enabled               = true
  notification_channels = [google_monitoring_notification_channel.email.name]
  project               = var.project_id
  severity              = "ERROR"
  alert_strategy {
    auto_close = "1800s"
  }
  conditions {
    display_name = "Any 5xx response in 5 minutes"
    condition_threshold {
      comparison      = "COMPARISON_GT"
      duration        = "0s"
      filter          = "metric.type=\"run.googleapis.com/request_count\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"shipit\" AND metric.labels.response_code_class=\"5xx\""
      threshold_value = 0
      aggregations {
        alignment_period     = "300s"
        cross_series_reducer = "REDUCE_SUM"
        per_series_aligner   = "ALIGN_DELTA"
      }
      trigger {
        count   = 1
        percent = 0
      }
    }
  }
  documentation {
    content   = "**The server returned 5xx errors.** Look at the logs panel on the dashboard (severity ≥ WARNING).\n\n[Dashboard](https://console.cloud.google.com/monitoring/dashboards/builder/cf717913-54db-4263-a4f3-fcc4085fc2c7?project=devops-playground-14386) · [Live site](https://shipit-116485471187.northamerica-northeast1.run.app)"
    mime_type = "text/markdown"
  }
}
