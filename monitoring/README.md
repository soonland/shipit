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
