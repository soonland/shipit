# Monthly budget for this project, with alerts at 50% and 100%.
# Kept here (not in the GitHub stack) so GitHub never needs billing-account rights.

resource "google_billing_budget" "project" {
  billing_account = var.billing_account
  display_name    = "devops-playground ${var.budget_amount}"

  budget_filter {
    projects               = ["projects/${data.google_project.this.number}"]
    calendar_period        = "MONTH"
    credit_types_treatment = "INCLUDE_ALL_CREDITS"
  }

  amount {
    specified_amount {
      currency_code = "CAD"
      units         = tostring(var.budget_amount)
    }
  }

  threshold_rules {
    threshold_percent = 0.5
  }
  threshold_rules {
    threshold_percent = 1.0
  }
}
