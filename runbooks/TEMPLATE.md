# Runbook: <alert name>

**Alert:** link to monitor definition in `observability/monitors/`
**SLO affected:**

## What it means
One sentence on the user impact when this fires.

## First checks (5 minutes)
1. Dashboard:
2. Recent deploys: `kubectl rollout history deploy/<name> -n <ns>`
3. Pod health: `kubectl get pods -n <ns>`

## Mitigation
- Roll back:
- Scale:
- Fail over:

## Escalate if
