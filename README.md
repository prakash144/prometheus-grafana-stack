# 🚀 Prometheus + Grafana + Loki Observability Stack

> **Production-grade monitoring for Node.js applications**

[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green?logo=node.js)](https://nodejs.org/)
[![Prometheus](https://img.shields.io/badge/Prometheus-Metrics-orange?logo=prometheus)](https://prometheus.io/)
[![Grafana](https://img.shields.io/badge/Grafana-Dashboards-red?logo=grafana)](https://grafana.com/)

---

## 📖 Table of Contents

- [What This Is](#-what-this-is)
- [Architecture](#%EF%B8%8F-architecture)
- [Repository Structure](#-repository-structure)
- [Quick Start](#-quick-start)
- [What We Monitor](#-what-we-monitor)
- [Observability Stack](#-observability-stack)
- [Alert Philosophy](#-alert-philosophy)
- [Development Workflow](#%EF%B8%8F-development-workflow)
- [Debugging](#-debugging)
- [Learning Path](#-learning-path)
- [Key Concepts](#-key-concepts)
- [Resources](#-resources)

---

## 🎯 What This Is

Hands-on observability stack demonstrating:

- **Metrics** → Prometheus (requests, latency, resources)
- **Logs** → Loki (structured logging)
- **Visualization** → Grafana (dashboards + alerts)
- **App** → Node.js Express API with instrumentation

**Philosophy:** Understand **why monitoring exists**, not just how to install tools.

---

## 🏗️ Architecture

```
┌─────────┐
│ Client  │
└────┬────┘
     │
     ↓
┌──────────────────────┐
│  Node.js (Express)   │
├──────────────────────┤
│  /metrics            │ ← Prometheus scrapes
│  /health             │
│  /api/*              │
│  Structured logs     │ ← Loki reads
└──────┬───────────────┘
       │
       ↓
┌──────────────┐     ┌──────────────┐
│  Prometheus  │────→│   Grafana    │
│ (Time-series)│     │ (Dashboards  │
└──────────────┘     │  & Alerts)   │
                     └──────┬───────┘
                            ↑
                     ┌──────┴───────┐
                     │     Loki     │
                     │    (Logs)    │
                     └──────────────┘
```

---

## 📁 Repository Structure

```
prometheus-grafana-stack/
│
├── README.md                           # ← You are here
│
├── docs/                               # 📚 Learning materials
│   ├── grafana-prometheus-notes.md
│   ├── prometheus-grafana-core.md
│   └── architecture.md
│
├── docker/                             # 🐳 Runtime infrastructure
│   ├── docker-compose.yml              # One command deployment
│   │
│   ├── prod-server/
|   |   |── Dockerfile                  # Node.js Express app
│   │   ├── index.js
│   │   ├── util.js
│   │   ├── package.json
│   │   └── package-lock.json
│   │
│   ├── prometheus/
│   │   └── prometheus.yml              # Scrape config
│   │
│   └── grafana/
│       └── provisioning/
│           ├── datasources/
│           │   └── datasource.yml
│           └── dashboards/
│               └── dashboards.yml
```

**Organization:**

- `docs/` → Theory & concepts
- `docker/` → Infrastructure & runtime
- `prod-server/` → Application code

---

## 🚀 Quick Start

### Option 1: Run App Locally

```bash
cd docker/prod-server
npm install
node index.js
```

**Access:** [http://localhost:8000](http://localhost:8000)

---

### Option 2: Run Full Stack (Docker) ⭐ **Recommended**

```bash
cd docker
docker-compose up -d
```

#### 🌐 Service Access

| Service              | URL                                         | Credentials       |
| -------------------- | ------------------------------------------- | ----------------- |
| **Node App**   | [http://localhost:8000](http://localhost:8000) | -                 |
| **Prometheus** | [http://localhost:9090](http://localhost:9090) | -                 |
| **Grafana**    | [http://localhost:3000](http://localhost:3000) | `admin / admin` |
| **Loki**       | [http://localhost:3100](http://localhost:3100) | -                 |

---

## 🔍 What We Monitor

### 📊 Infrastructure Metrics

- CPU usage
- Memory consumption
- Event loop lag (Node.js specific)
- Garbage collection

### 📈 Application Metrics

- **Request rate** → Requests/second by endpoint
- **Latency** → P50, P95, P99 percentiles
- **Error rate** → 4xx/5xx responses
- **Throughput** → Bytes in/out

### 💼 Business Metrics

- Orders placed
- Failed transactions
- Login success ratio
- Custom domain events

---

## 📊 Observability Stack

### 🔥 Prometheus (Metrics)

**What:** Time-series database for metrics

**Scrape Configuration:**

```yaml
scrape_configs:
  - job_name: 'node-app'
    static_configs:
      - targets: ['node-app:8000']
```

**Example Queries (PromQL):**

```promql
# Request rate
rate(http_requests_total[5m])

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_requests_total{status=~"5.."}[5m])
```

---

### 📉 Grafana (Visualization)

**Pre-configured:**

- ✅ Datasource: Prometheus + Loki
- ✅ Dashboards: Auto-provisioned
- ✅ Alerts: Latency & error rate

**Create Custom Dashboard:**

1. Navigate to [http://localhost:3000](http://localhost:3000)
2. Click **Create** → **Dashboard**
3. **Add Panel** → Choose metric
4. Select visualization (graph, gauge, stat)

---

### 📝 Loki (Logs)

**Structured Logging Example:**

```javascript
logger.info({
  method: req.method,
  path: req.path,
  duration_ms: 123,
  status_code: 200
});
```

**Query Logs (LogQL):**

```logql
{job="node-app"} |= "error" | json | status_code >= 500
```

---

## 🚨 Alert Philosophy

### ❌ Bad Alerts (Resource-based)

```
CPU > 80%
Memory > 90%
Disk > 85%
```

**Problem:** Noisy, not actionable, causes alert fatigue

---

### ✅ Good Alerts (Symptom-based)

```
P95 latency > 500ms for 5 minutes
Error rate > 1% for 2 minutes
Request success rate < 99.9%
```

**Why Better:** User-facing, actionable, correlated to actual problems

---

### 📋 Alert Example (Grafana)

```yaml
alert: HighLatency
expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
for: 5m
annotations:
  summary: "API latency P95 is {{ $value }}s"
```

---

## 🛠️ Development Workflow

### ➕ Add New Metric

**1. Instrument code (`prod-server/index.js`):**

```javascript
const orderCounter = new promClient.Counter({
  name: 'orders_total',
  help: 'Total orders placed',
  labelNames: ['status']
});

app.post('/orders', (req, res) => {
  // Business logic
  orderCounter.inc({ status: 'success' });
  res.json({ order_id: '123' });
});
```

**2. Query in Prometheus:**

```promql
rate(orders_total{status="success"}[5m])
```

**3. Visualize in Grafana:**

- Panel → Add Query → `rate(orders_total[5m])`
- Visualization: Time series graph

---

### 📄 Add New Log

```javascript
logger.info({
  event: 'order_created',
  order_id: '123',
  user_id: 'user_456',
  amount: 99.99
});
```

**Query in Loki:**

```logql
{job="node-app"} | json | event="order_created"
```

---

## 🐛 Debugging

### 🔍 Check Service Health

```bash
# Node app logs
docker logs -f node-app

# Prometheus logs
docker logs -f prometheus

# Grafana logs
docker logs -f grafana

# Loki logs
docker logs -f loki
```

---

### 🖥️ Exec into Container

```bash
docker exec -it node-app sh
docker exec -it prometheus sh
```

---

### ✅ Verify Metrics Endpoint

```bash
curl http://localhost:8000/metrics
```

**Expected output:**

```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/users",status="200"} 42
```

---

### 🎯 Check Prometheus Targets

1. Navigate to [http://localhost:9090/targets](http://localhost:9090/targets)
2. Verify `node-app` is **UP** (green)

---

### ⚠️ Common Issues

| Issue                   | Solution                                   |
| ----------------------- | ------------------------------------------ |
| Grafana shows "No data" | Check Prometheus datasource configuration  |
| Metrics not appearing   | Verify `/metrics` endpoint is accessible |
| Logs not in Loki        | Check Loki datasource + log format (JSON)  |
| Container crashes       | Run `docker-compose logs <service>`      |

---

## 📚 Learning Path

### 🟢 Beginner

1. Read `docs/grafana-prometheus-notes.md`
2. Run `docker-compose up`
3. Generate traffic: `curl http://localhost:8000/api/test`
4. Explore Grafana dashboards

---

### 🟡 Intermediate

1. Read `docs/prometheus-grafana-core.md`
2. Create custom dashboard
3. Write PromQL queries
4. Configure alerts

---

### 🔴 Advanced

1. Add custom metrics to Node app
2. Design SLO-based alerts
3. Implement distributed tracing
4. Set up long-term storage (Thanos/Cortex)

---

## 🎓 Key Concepts

### 📊 The Four Golden Signals (Google SRE)

1. **Latency** → Time to serve requests
2. **Traffic** → Demand on system (RPS)
3. **Errors** → Failed requests
4. **Saturation** → Resource utilization

> **This stack monitors all four.**

---

### 🔴 RED Method (for requests)

- **Rate** → Requests/second
- **Errors** → Failed requests
- **Duration** → Latency distribution

---

### 🟦 USE Method (for resources)

- **Utilization** → % time busy
- **Saturation** → Queue depth
- **Errors** → Error count

---

## 📖 Documentation

| Document                             | Focus                         |
| ------------------------------------ | ----------------------------- |
| `docs/grafana-prometheus-notes.md` | Quick reference & cheat sheet |
| `docs/prometheus-grafana-core.md`  | Deep dive concepts            |
| `docs/architecture.md`             | System design & patterns      |

---

## 🚧 Roadmap

- [ ] Add distributed tracing (Jaeger/Tempo)
- [ ] Implement alerting (Alertmanager)
- [ ] Add service mesh (Istio)
- [ ] Long-term storage (Thanos)
- [ ] Multi-environment setup (dev/staging/prod)
- [ ] SLO/SLA tracking
- [ ] Anomaly detection

---

## 🤝 Contributing

This is a learning repository. Feel free to:

- ➕ Add new metrics
- 📊 Create dashboards
- 📝 Improve documentation
- 💡 Share findings

---

## 🔗 Resources

### Youtube Videos:

- [Server Monitoring with Grafana Prometheus and Loki](https://www.youtube.com/watch?v=ddZjhv66o_o)
- [Open Telemetry and Logging](https://www.youtube.com/watch?v=U2O0saEXhDg)
- [What is Application Performance Monitoring in Node.js](https://www.youtube.com/watch?v=Rzz8uf_j0uM)
- [Youtube Doc](docs/Youtube-Lecture.md) 

### 📘 Official Documentation

- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs/)
- [Loki Docs](https://grafana.com/docs/loki/latest/)
- [Node.js Metrics](https://nodejs.org/api/perf_hooks.html)

### 📚 Books

- **Site Reliability Engineering** (Google)
- **Observability Engineering** (Honeycomb)
- **Prometheus: Up & Running** (O'Reilly)

### 🛠️ Tools

- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)
- [Grafana Dashboard Gallery](https://grafana.com/grafana/dashboards/)
- [Awesome Prometheus](https://github.com/roaldnefs/awesome-prometheus)

---

## 💡 Tips

> **Good observability is about asking the right questions, not collecting all possible data.**

**Key Principles:**

- Monitor **symptoms**, not causes
- Alert on **user impact**, not resource usage
- Keep dashboards **focused** and **actionable**
- Logs are for **debugging**, metrics are for **alerting**

---

<div align="center">

**⭐ Star this repo if you found it helpful!**

Made with ❤️ for learning observability

</div>
