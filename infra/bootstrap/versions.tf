terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.11"
    }
  }

  # Same private bucket as the main stack, separate state file.
  backend "gcs" {
    bucket = "devops-playground-14386-tfstate"
    prefix = "shipit-bootstrap"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region

  # The budgets API bills its calls to a project: use this one.
  user_project_override = true
  billing_project       = var.project_id
}

data "google_project" "this" {}
