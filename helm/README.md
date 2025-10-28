# Helm Chart for R4C Cesium Viewer

## Production Use Only

This Helm chart is used for **production deployments** via the CI/CD pipeline.

For **local development**, use the plain Kubernetes manifests in the `skaffold/` directory instead. See `skaffold/README.md` for details.

## Why Keep Both?

- **Production (this Helm chart)**: Provides flexible configuration, Helm hooks, and integration with existing deployment pipelines
- **Local Development (skaffold/ manifests)**: Simpler, plain Kubernetes manifests with less abstraction for easier local testing and debugging

This separation helps identify issues caused by Helm templating vs. application code, and reduces maintenance overhead for local development.

## Usage

This chart is deployed automatically by the CI/CD pipeline. For manual deployment:

```bash
helm install r4c-cesium-viewer ./helm \
  --values ./helm/values.yaml \
  --set image.repository=ghcr.io/forumviriumhelsinki/r4c-cesium-viewer \
  --set image.tag=latest
```

## Chart Details

See `Chart.yaml` and `values.yaml` for configuration options.

For local development, see the plain K8s manifests in `../skaffold/` instead.
