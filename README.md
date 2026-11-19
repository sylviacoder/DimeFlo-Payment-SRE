# DimeFlo

**A payments platform on AWS EKS, built and operated to SRE standards.**


## The problem

A simulated incident starts the project: during a database failover, client retries caused 37 customers to be charged twice, and no alert fired. The work below answers three questions:

1. What does "reliable" mean for a payments system, in numbers?
2. Can we measure it and get paged before customers notice?
3. Can we prove the double charge can't happen again?

## Architecture

```text
Client --> ALB (TLS) --> EKS: payments-api --> RDS Postgres (Multi-AZ)
                              reconciler   --> ledger vs processor check
                              Datadog agent --> APM, logs, SLOs, monitors
```

| Layer | Tooling |
| --- | --- |
| Infrastructure | Terraform modules (network, eks, rds), S3 remote state |
| Compute | Amazon EKS, managed node group |
| Data | RDS Postgres, password managed in Secrets Manager |
| Observability | Datadog APM, logs, SLOs and monitors as code |
| Reliability testing | Chaos experiments, k6 load tests |
| CI | GitHub Actions: fmt, validate, plan |

## Service level objectives

| SLI | Target (28 days) |
| --- | --- |
| Transfer availability (non-5xx on `POST /transfers`) | 99.9% |
| Transfer latency under 300 ms | 99% |
| Duplicate transfers per idempotency key | 0 |
| Ledger reconciled with processor within 5 minutes | 99.95% |

Details: [docs/slo.md](docs/slo.md) and [docs/error-budget-policy.md](docs/error-budget-policy.md).

## Roadmap

- [ ] SRE-101 Define SLOs and error budgets
- [ ] SRE-102 Instrument services and deploy observability
- [ ] SRE-103 Burn-rate alerting and runbooks
- [ ] SRE-104 Reproduce duplicate transfers during database failover
- [ ] SRE-105 Postmortem and idempotency fix, chaos test rerun
- [ ] SRE-106 Error budget policy

## Repository layout

```text
terraform/      modules/ (network, eks, rds) and envs/dev
services/       payments-api, reconciler
k8s/            Kubernetes manifests
observability/  Datadog SLOs, monitors, dashboards as code
chaos/          chaos experiments and k6 load tests
runbooks/       one runbook per alert
postmortems/    blameless incident write-ups
docs/           SLOs, error budget policy, architecture decisions
```

## Run it

```bash
cd terraform/envs/dev
cp terraform.tfvars.example terraform.tfvars   # set your IP
terraform init
terraform plan
terraform apply
```

This creates billable AWS resources (EKS, NAT gateway, RDS). Run `terraform destroy` when you finish.

## Credits

The infrastructure approach was informed by the Utrains SRE-LAB training lab. DimeFlo is a separate codebase focused on payments reliability.
