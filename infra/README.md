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

## Bootstrap

Identities, GitHub sign-in, permissions, the state bucket, the budget and the chaos-key
container live in [`bootstrap/`](bootstrap/), a separate stack applied only from a laptop.

## SLO and drift

- `slo.tf`: 99.5% of requests succeed over 28 days (5xx = bad), with an email alert
  when the error budget burns more than 10x too fast over an hour.
- `.github/workflows/drift.yml`: every night, a read-only plan of this stack. Any
  difference opens a GitHub issue labelled `drift`; it closes itself once fixed.
  (The bootstrap stack isn't checked: GitHub can't read it, on purpose.)
