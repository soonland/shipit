terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.11"
    }
  }

  # State lives in a private, versioned bucket (created once with gcloud).
  backend "gcs" {
    bucket = "devops-playground-14386-tfstate"
    prefix = "shipit"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
