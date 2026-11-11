# Adopt resources that already exist. Safe to delete after the first apply.

import {
  to = google_artifact_registry_repository.run_source
  id = "projects/devops-playground-14386/locations/northamerica-northeast1/repositories/cloud-run-source-deploy"
}

import {
  for_each = local.apis
  to       = google_project_service.apis[each.key]
  id       = "devops-playground-14386/${each.key}"
}
