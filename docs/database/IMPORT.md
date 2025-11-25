# Database Import from Production

This guide explains how to import a production database dump into your local Skaffold-managed PostgreSQL instance for testing.

## Prerequisites

- Google Cloud SDK installed and authenticated (`gcloud auth login`)
- Access to the `regions4climate` GCS bucket
- Skaffold and kubectl configured for local development

## Download the Database Dump

The production database export is stored in Google Cloud Storage:

```bash
# Create tmp directory if it doesn't exist
mkdir -p tmp

# Download the database dump (approximately 17.5 GiB)
gsutil cp gs://regions4climate/database-export tmp/database-export.sql
```

**Note:** The download takes approximately 3-5 minutes depending on your connection speed.

## Start Skaffold with Database Services

Launch Skaffold with the local services profile that includes PostgreSQL:

```bash
skaffold dev --profile=local-with-services --port-forward
```

Wait for the PostgreSQL pod to be ready:

```bash
kubectl wait --for=condition=ready pod -l app=postgresql -n regions4climate --timeout=120s
```

## Import the Database Dump

### Option A: Direct Import via kubectl exec (Recommended)

```bash
kubectl exec -i -n regions4climate postgresql-0 -- \
  psql -U regions4climate_user -d regions4climate < tmp/database-export.sql
```

### Option B: Import via Port Forward

If you prefer using a local PostgreSQL client:

```bash
# In one terminal, set up port forwarding
kubectl port-forward -n regions4climate svc/postgresql 5432:5432

# In another terminal, import the dump
PGPASSWORD=regions4climate_pass psql \
  -h localhost \
  -U regions4climate_user \
  -d regions4climate \
  -f tmp/database-export.sql
```

## Database Credentials

| Parameter | Value                                                       |
| --------- | ----------------------------------------------------------- |
| Database  | `regions4climate`                                           |
| Username  | `regions4climate_user`                                      |
| Password  | `regions4climate_pass`                                      |
| Host      | `postgresql.regions4climate.svc.cluster.local` (in-cluster) |
| Port      | `5432`                                                      |

## Verify the Import

Connect to the database and check the tables:

```bash
kubectl exec -it -n regions4climate postgresql-0 -- \
  psql -U regions4climate_user -d regions4climate -c "\dt"
```

Check row counts for key tables:

```bash
kubectl exec -it -n regions4climate postgresql-0 -- \
  psql -U regions4climate_user -d regions4climate -c "
    SELECT 'building' as table_name, COUNT(*) FROM building
    UNION ALL
    SELECT 'tree_f', COUNT(*) FROM tree_f
    UNION ALL
    SELECT 'postal_code', COUNT(*) FROM postal_code;
  "
```

## Troubleshooting

### Permission Denied Errors

If you see permission errors during import, ensure the `regions4climate_user` has appropriate privileges:

```bash
kubectl exec -it -n regions4climate postgresql-0 -- \
  psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE regions4climate TO regions4climate_user;"
```

### Connection Refused

Ensure the PostgreSQL pod is running:

```bash
kubectl get pods -n regions4climate -l app=postgresql
```

### Import Takes Too Long

For very large dumps, consider:

- Running the import in the background: `nohup kubectl exec ... &`
- Checking import progress by monitoring PostgreSQL logs:
  ```bash
  kubectl logs -f -n regions4climate postgresql-0
  ```

## Cleanup

After testing, you can remove the downloaded dump to free disk space:

```bash
rm tmp/database-export.sql
```

The `tmp/` directory is git-ignored and won't be committed.
