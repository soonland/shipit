# Monitoring

The dashboard layout lives in `dashboard.json`. Everything else (uptime check,
email channel, alert policies) is defined in Terraform: see [`../infra`](../infra).

Open the dashboard: https://console.cloud.google.com/monitoring/dashboards/builder/cf717913-54db-4263-a4f3-fcc4085fc2c7?project=devops-playground-14386

| Alert | Fires when | Severity |
|---|---|---|
| `shipit: site down` | `/health` fails from 2+ regions | critical |
| `shipit: 5xx errors` | any 5xx response in 5 min | error |
| `shipit: slow responses` | p95 latency > 1 s for 10 min | warning |

To change the dashboard: edit `dashboard.json`, then run `terraform plan` / `apply` in `infra/`.
