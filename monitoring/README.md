# Monitoring

Cloud Monitoring setup for the `shipit` Cloud Run service (project `devops-playground-14386`).

| Resource | ID |
|---|---|
| Dashboard "shipit — Cloud Run" | `cf717913-54db-4263-a4f3-fcc4085fc2c7` |
| Uptime check "shipit /health" (every 5 min, 3 US regions) | `shipit-health-mPyRhihDCZ4` |

Open the dashboard: https://console.cloud.google.com/monitoring/dashboards/builder/cf717913-54db-4263-a4f3-fcc4085fc2c7?project=devops-playground-14386

## Update the dashboard after editing `dashboard.json`

The API needs the current `etag`, so fetch it and update in one go:

```bash
ID=cf717913-54db-4263-a4f3-fcc4085fc2c7
ETAG=$(gcloud monitoring dashboards describe "$ID" --format='value(etag)')
jq --arg etag "$ETAG" '. + {etag: $etag}' monitoring/dashboard.json > /tmp/dashboard.json
gcloud monitoring dashboards update "$ID" --config-from-file=/tmp/dashboard.json
```

## Alerts

Sent to the "Alerts email" notification channel (`notificationChannels/11756930934441046895`).
Policies live in `alerts/`; incidents auto-close 30 min after recovery.

| Policy | Fires when | Severity |
|---|---|---|
| `shipit: site down` (`uptime-down.json`) | `/health` fails from 2+ regions | critical |
| `shipit: 5xx errors` (`5xx-errors.json`) | any 5xx response in 5 min | error |
| `shipit: slow responses` (`slow-p95.json`) | p95 latency > 1 s for 10 min | warning |

Create a policy from a file: `gcloud monitoring policies create --policy-from-file=monitoring/alerts/<file>.json`
