# Service Level Objective: "99.5% of requests to shipit succeed, over 28 days".
#
# The remaining 0.5% is the error budget (~1 failed request out of 200). The alert
# below fires when that budget is being spent 10x faster than allowed, i.e. when
# more than 5% of the last hour's requests failed: a real incident, not one blip.
# (The chaos `error` button is the way to test it.)

resource "google_monitoring_custom_service" "shipit" {
  service_id   = "shipit"
  display_name = "shipit"
}

resource "google_monitoring_slo" "availability" {
  service      = google_monitoring_custom_service.shipit.service_id
  slo_id       = "availability"
  display_name = "99.5% of requests succeed (28 days)"

  goal                = 0.995
  rolling_period_days = 28

  request_based_sli {
    good_total_ratio {
      # "Bad" = server errors (5xx). 4xx are the visitor's fault, not the service's.
      bad_service_filter   = "metric.type=\"run.googleapis.com/request_count\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"shipit\" AND metric.labels.response_code_class=\"5xx\""
      total_service_filter = "metric.type=\"run.googleapis.com/request_count\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"shipit\""
    }
  }
}

resource "google_monitoring_alert_policy" "slo_fast_burn" {
  display_name          = "shipit: error budget burning fast"
  combiner              = "OR"
  notification_channels = [google_monitoring_notification_channel.email.id]

  conditions {
    display_name = "Burn rate above 10x over 1 hour"

    condition_threshold {
      filter          = "select_slo_burn_rate(\"${google_monitoring_slo.availability.id}\", \"3600s\")"
      comparison      = "COMPARISON_GT"
      threshold_value = 10
      duration        = "0s"
    }
  }

  documentation {
    content   = "More than 5% of shipit requests failed over the last hour: at this pace the 28-day error budget (0.5%) is gone in under 3 days. Check the dashboard and Cloud Run logs."
    mime_type = "text/markdown"
  }
}
