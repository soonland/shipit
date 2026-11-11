# The dashboard JSON stays the single source of truth in ../monitoring/.
resource "google_monitoring_dashboard" "shipit" {
  dashboard_json = file("${path.module}/../monitoring/dashboard.json")
}
