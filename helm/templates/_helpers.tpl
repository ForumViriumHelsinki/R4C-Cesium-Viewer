{{/*
Expand the name of the chart.
*/}}
{{- define "r4c-cesium-viewer.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "r4c-cesium-viewer.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "r4c-cesium-viewer.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "r4c-cesium-viewer.labels" -}}
helm.sh/chart: {{ include "r4c-cesium-viewer.chart" . }}
{{ include "r4c-cesium-viewer.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "r4c-cesium-viewer.selectorLabels" -}}
app.kubernetes.io/name: {{ include "r4c-cesium-viewer.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Frontend Helpers
*/}}
{{- define "r4c-cesium-viewer.frontend.fullname" -}}
{{- printf "%s-frontend" (include "r4c-cesium-viewer.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "r4c-cesium-viewer.frontend.labels" -}}
{{ include "r4c-cesium-viewer.labels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{- define "r4c-cesium-viewer.frontend.selectorLabels" -}}
{{ include "r4c-cesium-viewer.selectorLabels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Backend Helpers
*/}}
{{- define "r4c-cesium-viewer.backend.fullname" -}}
{{- printf "%s-backend" (include "r4c-cesium-viewer.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "r4c-cesium-viewer.backend.labels" -}}
{{ include "r4c-cesium-viewer.labels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{- define "r4c-cesium-viewer.backend.selectorLabels" -}}
{{ include "r4c-cesium-viewer.selectorLabels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
PyGeoAPI Helpers
*/}}
{{- define "r4c-cesium-viewer.pygeoapi.fullname" -}}
{{- printf "%s-pygeoapi" (include "r4c-cesium-viewer.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "r4c-cesium-viewer.pygeoapi.labels" -}}
{{ include "r4c-cesium-viewer.labels" . }}
app.kubernetes.io/component: pygeoapi
{{- end }}

{{- define "r4c-cesium-viewer.pygeoapi.selectorLabels" -}}
{{ include "r4c-cesium-viewer.selectorLabels" . }}
app.kubernetes.io/component: pygeoapi
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "r4c-cesium-viewer.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "r4c-cesium-viewer.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
