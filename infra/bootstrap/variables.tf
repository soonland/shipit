variable "project_id" {
  type    = string
  default = "devops-playground-14386"
}

variable "region" {
  type    = string
  default = "northamerica-northeast1"
}

variable "github_repo" {
  description = "The only GitHub repository allowed to sign in to Google Cloud."
  type        = string
  default     = "soonland/shipit"
}

variable "billing_account" {
  description = "Billing account ID (kept out of git: set it in terraform.tfvars)."
  type        = string
}

variable "budget_amount" {
  description = "Monthly budget for this project, in CAD."
  type        = number
  default     = 5
}
