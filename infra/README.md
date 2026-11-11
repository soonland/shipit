# Infrastructure (Terraform)

Manages the monitoring for shipit: dashboard, uptime check, email channel and alert policies.
Cloud Run deploys are still done by the GitHub `Deploy` workflow.

State: `gs://devops-playground-14386-tfstate/shipit` (private, versioned, keeps the last 10 old versions).

## First time

```bash
gcloud auth application-default login   # Terraform's own Google login
cp terraform.tfvars.example terraform.tfvars   # set alert_email (git-ignored)
terraform init
```

## Every change

```bash
terraform fmt && terraform validate
terraform plan -out=change.tfplan   # read it!
terraform apply change.tfplan
```

`terraform plan` should say **No changes** when nothing was edited. If it doesn't, something
was changed by hand in the console: either copy that change here or apply to undo it.
