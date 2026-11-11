variable "project_id" {
  description = "Google Cloud project"
  type        = string
  default     = "devops-playground-14386"
}

variable "region" {
  description = "Default region"
  type        = string
  default     = "northamerica-northeast1"
}

variable "alert_email" {
  description = "Where alert emails go. Set it in terraform.tfvars (git-ignored), never in the repo."
  type        = string
  sensitive   = true
}
