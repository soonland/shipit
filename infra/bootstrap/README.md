# bootstrap

The foundation the GitHub workflows stand on: their identities, how they sign in,
what they may do, the state bucket, the budget and the chaos-key secret container.

**Applied only from your laptop, never from GitHub.** A workflow that could change
these resources could give itself more power, so they live in their own stack
with their own state (`gs://devops-playground-14386-tfstate/shipit-bootstrap`).

| File | What |
|---|---|
| `identities.tf` | the 4 service accounts |
| `wif.tf` | Workload Identity Federation: GitHub sign-in, limited to `soonland/shipit` |
| `iam.tf` | the roles of each identity, on the smallest scope possible |
| `secret.tf` | the `chaos-key` container and who reads it (the value stays out of Terraform) |
| `state.tf` | the Terraform state bucket (protected from `destroy`) |
| `budget.tf` | the CA$5 monthly budget |

```sh
cp terraform.tfvars.example terraform.tfvars   # then put your billing account ID
terraform init
terraform plan
terraform apply
```

The chaos code itself is still set with `scripts/setup-chaos-key.sh`.
