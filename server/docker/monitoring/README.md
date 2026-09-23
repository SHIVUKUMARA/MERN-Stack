# Monitoring

This README documents the **actual monitoring implementation** added to the backend and Docker production environment.

The monitoring stack uses:

- **Prometheus** — collects and stores metrics.
- **Grafana** — visualizes metrics and dashboards.
- **cAdvisor** — collects Docker container resource metrics.
- **Alertmanager** — receives Prometheus alerts and sends notifications.
- **Mailtrap** — used as the SMTP destination for alert emails.

---

# 1. What We Added

The monitoring implementation required changes in two areas:

```text
Application code
    └── exposes application metrics

Docker monitoring
    ├── Prometheus
    ├── Grafana
    ├── cAdvisor
    └── Alertmanager
```

The application exposes metrics, Prometheus collects them, Grafana displays them, and Alertmanager handles alert notifications.

---

# 2. New Application Files

## `server/config/metrics.js`

This is the central application metrics configuration.

It was added to define the Prometheus metrics used by the backend.

It contains:

### Default Node.js metrics

```js
client.collectDefaultMetrics();
```

These provide process/runtime metrics such as:

- CPU usage
- Memory usage
- Event loop/runtime information
- Node.js process information

### HTTP request counter

```text
http_requests_total
```

Tracks the total number of HTTP requests.

Labels:

```text
method
route
status_code
```

### HTTP request duration histogram

```text
http_request_duration_seconds
```

Measures API response time and provides histogram buckets that can be used to calculate values such as p95 latency.

Labels:

```text
method
route
status_code
```

### Active request gauge

```text
http_active_requests
```

Tracks how many requests are currently being processed.

---

## `server/routes/metrics.routes.js`

This is the Prometheus metrics endpoint.

It exposes:

```text
/metrics
```

The route:

1. Sets the Prometheus content type.
2. Reads the metrics from `prom-client`.
3. Returns them in Prometheus text format.

Prometheus scrapes this endpoint.

---

## `server/middleware/monitoring.middleware.js`

This middleware records HTTP monitoring information for the backend.

For every monitored request it:

1. Starts a high-resolution timer.
2. Increments active requests.
3. Waits for the response to finish.
4. Determines the route.
5. Records the HTTP method.
6. Records the response status code.
7. Records total request count.
8. Records request duration.
9. Decrements active requests.

The `/metrics` endpoint itself is excluded from application request monitoring so that Prometheus scraping does not continuously increase the HTTP request metrics.

The middleware uses route templates where Express provides them, rather than using arbitrary dynamic URLs as labels. This helps control Prometheus label cardinality.

---

# 3. Existing Application Files Modified

## `server/routes/index.js`

The monitoring endpoint was registered:

```js
router.use("/metrics", require("./metrics.routes"));
```

This makes the metrics endpoint available through:

```text
/metrics
```

The existing health and API routes remain unchanged.

---

## `server/app.js`

The monitoring middleware was registered in the Express application:

```js
app.use(monitoringMiddleware);
```

This allows the middleware to observe HTTP requests across the backend.

The monitoring middleware is placed in the application middleware chain so request metrics can be collected before the request reaches the route handlers.

---

## `server/package.json`

The monitoring implementation added the Prometheus client dependency:

```text
prom-client
```

This package provides the Node.js client used to create counters, gauges, histograms, and expose metrics in Prometheus format.

---

## `server/package-lock.json`

The lock file was updated when `prom-client` was installed.

This keeps dependency installation reproducible in Docker and CI/CD.

---

# 4. Metrics We Added

The backend now provides these custom application metrics:

```text
http_requests_total
http_request_duration_seconds
http_active_requests
```

It also exposes the default Node.js/process metrics provided by `prom-client`.

Examples of useful PromQL queries include:

### Request rate

```promql
sum(rate(http_requests_total[5m]))
```

### 5xx error rate

```promql
(
  sum(rate(http_requests_total{status_code=~"5.."}[5m]))
  /
  sum(rate(http_requests_total[5m]))
) * 100
or vector(0)
```

### Active requests

```promql
http_active_requests
```

### p95 response time

```promql
histogram_quantile(
  0.95,
  sum by (le) (
    rate(http_request_duration_seconds_bucket[5m])
  )
)
```

---

# 5. Monitoring Docker Files

The monitoring-specific Docker configuration is located under:

```text
server/docker/monitoring/
```

Current structure:

```text
server/
└── docker/
    └── monitoring/
        ├── compose.yaml
        ├── health-monitor.sh
        ├── README.md
        └── prometheus/
            ├── prometheus.yml
            ├── alerts.yml
            └── alertmanager.yml
```

No additional top-level monitoring folders were introduced.

---

# 6. `docker/monitoring/compose.yaml`

This is the main Docker Compose file for the monitoring stack.

It defines four services:

```text
prometheus
grafana
cadvisor
alertmanager
```

## Prometheus

Purpose:

- Scrapes application metrics.
- Scrapes cAdvisor metrics.
- Evaluates alert rules.
- Sends alerts to Alertmanager.
- Stores metrics used by Grafana.

## Grafana

Purpose:

- Connects to Prometheus.
- Displays metrics in dashboards.
- Provides graphs, tables, and other visualizations.

## cAdvisor

Purpose:

- Collects Docker container resource metrics.
- Provides container CPU, memory, network, and related metrics.

## Alertmanager

Purpose:

- Receives alerts from Prometheus.
- Groups/routes alerts.
- Sends notification emails.
- Sends resolved notifications when configured.

---

# 7. Production Docker Network

The monitoring stack is connected to the existing production Docker network:

```text
backend-production_default
```

This allows services to communicate using Docker service/container DNS names.

Examples:

```text
backend:5000
prometheus:9090
cadvisor:8080
alertmanager:9093
```

The monitoring Compose file uses the network as an external network:

```yaml
networks:
  backend-production_default:
    external: true
```

The production application Compose stack creates this network.

---

# 8. Production Monitoring Security

The monitoring Compose file intentionally does **not** publish host ports for:

```text
Prometheus   9090
Grafana      3000
cAdvisor     8080
Alertmanager 9093
```

They are available only inside the Docker network.

The public entry point remains Nginx.

The production application architecture is:

```text
Internet
   |
   v
Nginx :80
   |
   v
Backend :5000
```

Monitoring stays internal:

```text
Prometheus
    |
    +--> Backend :5000
    |
    +--> cAdvisor :8080
    |
    +--> Alertmanager :9093

Grafana
    |
    +--> Prometheus :9090
```

Do not add public `ports:` mappings to the monitoring services unless there is a deliberate security requirement.

---

# 9. `docker/monitoring/prometheus/prometheus.yml`

This is the main Prometheus configuration.

It defines:

## Scrape interval

```yaml
scrape_interval: 15s
```

Prometheus collects metrics every 15 seconds.

## Evaluation interval

```yaml
evaluation_interval: 15s
```

Prometheus evaluates alert rules every 15 seconds.

## Alertmanager

Prometheus sends alerts to:

```text
alertmanager:9093
```

## Rule file

Prometheus loads:

```text
alerts.yml
```

## Backend target

```text
backend:5000
```

This is the production backend Compose service.

## cAdvisor target

```text
cadvisor:8080
```

This collects Docker container metrics.

---

# 10. `docker/monitoring/prometheus/alerts.yml`

This file contains the Prometheus alert rules.

The implemented alerts are:

## `BackendDown`

Detects when Prometheus cannot reach the backend.

Condition:

```promql
up{job="backend"} == 0
```

The alert fires after the configured duration.

---

## `High5xxErrorRate`

Detects when the percentage of HTTP 5xx responses becomes too high.

The rule uses:

```text
http_requests_total
```

and calculates the 5xx percentage using `rate()`.

---

## `HighResponseTime`

Detects when the p95 HTTP response time becomes too high.

It uses:

```text
http_request_duration_seconds_bucket
```

with:

```promql
histogram_quantile()
```

---

## `HighContainerMemory`

Detects high memory usage for the backend Docker container using cAdvisor metrics.

The rule monitors:

```text
backend-prod
```

---

# 11. `docker/monitoring/prometheus/alertmanager.yml`

This is the Alertmanager configuration.

It defines:

- SMTP server
- Sender
- SMTP authentication
- Recipient
- Firing email notifications
- Resolved email notifications

The current implementation uses:

```text
Mailtrap SMTP
```

The SMTP password is not written directly into the Alertmanager configuration.

Instead, Docker Secrets are used.

---

# 12. Docker Secret for Email Password

The monitoring Compose configuration provides the Mailtrap password through a Docker Secret:

```yaml
secrets:
  mailtrap_password:
    environment: EMAIL_PASS
```

Alertmanager reads:

```text
/run/secrets/mailtrap_password
```

This keeps the SMTP password out of:

```text
alertmanager.yml
```

The production `.env` supplies:

```text
EMAIL_PASS
```

The actual password should never be committed to Git.

---

# 13. `docker/monitoring/health-monitor.sh`

This file is reserved for monitoring/health-related helper scripting in the monitoring directory.

It is separate from the Prometheus/Grafana configuration and does not replace Prometheus, Grafana, cAdvisor, or Alertmanager.

---

# 14. Grafana Dashboard

The Grafana dashboard was configured through the Grafana UI rather than as a repository JSON file.

Dashboard:

```text
Backend Monitoring
```

Prometheus datasource:

```text
http://prometheus:9090
```

Panels configured include:

1. Request Rate
2. 5xx Error Rate
3. Active Requests
4. Response Time P95
5. Node.js CPU
6. Node.js Memory
7. Request Rate by Method
8. Request Rate by Status
9. Docker Container Memory
10. Docker Container CPU
11. Docker Network Receive
12. Docker Network Transmit
13. Monitoring Targets

Important: these dashboard panels are Grafana UI configuration; they are not separate source-code files in the repository.

---

# 15. Development

There is currently **no separate development monitoring Compose stack**.

The development backend can expose its metrics endpoint directly:

```text
http://localhost:5000/metrics
```

This is useful for verifying application metrics while working in development.

The current Prometheus/Grafana/cAdvisor/Alertmanager Compose setup is connected to:

```text
backend-production_default
```

Therefore, it is the monitoring stack for the production Docker environment.

Do not document it as a separate development monitoring stack unless a development-specific monitoring network/configuration is added later.

---

# 16. Production: Start Monitoring

Run from the `server/` directory:

```bash
docker compose \
  --env-file docker/production/.env \
  -f docker/monitoring/compose.yaml \
  up -d
```

This starts:

```text
prometheus
grafana
cadvisor
alertmanager
```

---

# 17. Production: Check Monitoring Status

```bash
docker compose \
  -f docker/monitoring/compose.yaml \
  ps
```

Or:

```bash
docker ps
```

You should see:

```text
prometheus
grafana
cadvisor
alertmanager
```

---

# 18. Production: Inspect Logs

Prometheus:

```bash
docker logs prometheus --tail 30
```

Grafana:

```bash
docker logs grafana --tail 30
```

cAdvisor:

```bash
docker logs cadvisor --tail 30
```

Alertmanager:

```bash
docker logs alertmanager --tail 30
```

Follow logs:

```bash
docker logs -f prometheus
```

Stop following with:

```text
Ctrl + C
```

---

# 19. Production: Inspect the Docker Network

```bash
docker network inspect backend-production_default
```

The network should contain the production and monitoring services that need to communicate.

Typical containers include:

```text
backend-prod
redis-prod
nginx-prod
prometheus
grafana
cadvisor
alertmanager
```

---

# 20. Production: Verify Backend Metrics

Run:

```bash
docker exec prometheus wget -qO- http://backend:5000/metrics | head
```

This verifies that Prometheus can reach the backend metrics endpoint.

You should see Prometheus-formatted metrics such as:

```text
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
```

---

# 21. Production: Verify Prometheus

Run:

```bash
docker exec grafana wget -qO- http://prometheus:9090/-/ready
```

Expected:

```text
Prometheus Server is Ready.
```

---

# 22. Production: Verify Alertmanager

Run:

```bash
docker exec alertmanager wget -qO- http://alertmanager:9093/-/ready
```

Expected:

```text
OK
```

---

# 23. Production: Check Prometheus Targets

Use the PromQL query:

```promql
up
```

Healthy targets normally return:

```text
1
```

A target that Prometheus cannot scrape returns:

```text
0
```

---

# 24. Production: Restart Monitoring

Restart the entire monitoring stack:

```bash
docker compose \
  -f docker/monitoring/compose.yaml \
  restart
```

Restart an individual service:

```bash
docker restart prometheus
```

```bash
docker restart grafana
```

```bash
docker restart cadvisor
```

```bash
docker restart alertmanager
```

---

# 25. Production: Stop Monitoring

```bash
docker compose \
  -f docker/monitoring/compose.yaml \
  down
```

This stops and removes the monitoring containers.

The named Grafana volume is normally preserved.

Do **not** use:

```bash
docker compose down -v
```

unless you intentionally want to remove the monitoring volumes and their stored data.

---

# 26. Production: Apply Configuration Changes

After changing:

```text
docker/monitoring/compose.yaml
docker/monitoring/prometheus/prometheus.yml
docker/monitoring/prometheus/alerts.yml
docker/monitoring/prometheus/alertmanager.yml
```

apply the changes with:

```bash
docker compose \
  --env-file docker/production/.env \
  -f docker/monitoring/compose.yaml \
  up -d
```

For changes that require container recreation:

```bash
docker compose \
  --env-file docker/production/.env \
  -f docker/monitoring/compose.yaml \
  up -d --force-recreate
```

Then inspect:

```bash
docker compose -f docker/monitoring/compose.yaml ps
```

and check logs.

---

# 27. Full Monitoring File Summary

## New application files

| File                                         | Purpose                                                           |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `server/config/metrics.js`                   | Defines Node.js and custom Prometheus metrics                     |
| `server/routes/metrics.routes.js`            | Exposes `/metrics` for Prometheus scraping                        |
| `server/middleware/monitoring.middleware.js` | Records HTTP request count, duration, status, and active requests |

## Modified application files

| File                       | Change                              |
| -------------------------- | ----------------------------------- |
| `server/routes/index.js`   | Registers `/metrics`                |
| `server/app.js`            | Registers the monitoring middleware |
| `server/package.json`      | Adds `prom-client`                  |
| `server/package-lock.json` | Locks the new dependency            |

## Monitoring Docker files

| File                                                   | Purpose                                                 |
| ------------------------------------------------------ | ------------------------------------------------------- |
| `server/docker/monitoring/compose.yaml`                | Defines Prometheus, Grafana, cAdvisor, and Alertmanager |
| `server/docker/monitoring/prometheus/prometheus.yml`   | Prometheus scrape, alerting, and rule configuration     |
| `server/docker/monitoring/prometheus/alerts.yml`       | Prometheus alert rules                                  |
| `server/docker/monitoring/prometheus/alertmanager.yml` | Alertmanager SMTP/email routing configuration           |
| `server/docker/monitoring/health-monitor.sh`           | Monitoring/health helper script                         |
| `server/docker/monitoring/README.md`                   | Documentation for this monitoring setup                 |

## Manual Grafana configuration

The Grafana dashboard and panels were created through Grafana itself and are not currently stored as repository files.

---

# 28. Quick Command Reference

### Start

```bash
docker compose --env-file docker/production/.env -f docker/monitoring/compose.yaml up -d
```

### Status

```bash
docker compose -f docker/monitoring/compose.yaml ps
```

### Logs

```bash
docker logs prometheus --tail 30
docker logs grafana --tail 30
docker logs cadvisor --tail 30
docker logs alertmanager --tail 30
```

### Network

```bash
docker network inspect backend-production_default
```

### Backend metrics

```bash
docker exec prometheus wget -qO- http://backend:5000/metrics | head
```

### Prometheus readiness

```bash
docker exec grafana wget -qO- http://prometheus:9090/-/ready
```

### Alertmanager readiness

```bash
docker exec alertmanager wget -qO- http://alertmanager:9093/-/ready
```

### Restart

```bash
docker compose -f docker/monitoring/compose.yaml restart
```

### Stop

```bash
docker compose -f docker/monitoring/compose.yaml down
```

---

# 29. Final Architecture

```text
                         INTERNET
                            |
                            v
                       NGINX :80/443
                            |
                            v
                       BACKEND :5000
                            |
                            | /metrics
                            v
                       PROMETHEUS
                       /    |     \
                      /     |      \
                     v      v       v
                Backend  cAdvisor Alertmanager
                                      |
                                      v
                                   Mailtrap

                     Grafana
                        |
                        v
                   Prometheus
```

Application metrics:

```text
Node.js Backend
      |
      v
prom-client
      |
      v
/metrics
      |
      v
Prometheus
      |
      v
Grafana
```

Docker resource metrics:

```text
Docker
   |
   v
cAdvisor
   |
   v
Prometheus
   |
   v
Grafana
```

Alert flow:

```text
Prometheus
   |
   | alert rule
   v
Alertmanager
   |
   | SMTP
   v
Mailtrap
```
