from __future__ import annotations

from datetime import datetime, timezone

from src.tools.databricks.clusters import list_clusters
from src.tools.databricks.connection import ping_databricks_api
from src.tools.databricks.jobs import list_jobs
from src.tools.databricks.pipelines import list_pipelines


def _now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def _severity_sort(alert: dict) -> tuple[int, str]:
    order = {"critical": 0, "warning": 1, "info": 2}
    return (order.get(str(alert.get("severity")), 3), str(alert.get("timestamp") or ""))


def build_monitoring_alerts() -> dict:
    """Build live monitoring alerts from current Databricks resource state."""

    alerts: list[dict] = []
    sources: dict[str, bool] = {}

    ping = ping_databricks_api()
    sources["databricksPing"] = bool(ping.get("ok"))
    if not ping.get("ok"):
        alerts.append(
            {
                "id": "databricks-connection",
                "severity": "critical",
                "title": "Databricks API is not reachable",
                "message": ping.get("message") or ping.get("error") or "Databricks ping failed.",
                "resource": "databricks",
                "timestamp": _now_iso(),
                "acknowledged": False,
                "type": "connection",
            }
        )

    jobs = list_jobs()
    sources["jobs"] = bool(jobs.get("ok"))
    if jobs.get("ok"):
        for job in jobs.get("jobs") or []:
            status = str(job.get("status") or "").upper()
            job_id = str(job.get("id") or "")
            name = job.get("name") or job_id or "Unnamed job"
            duration = job.get("duration")
            timestamp = job.get("lastRun") or _now_iso()

            if status == "FAILED":
                alerts.append(
                    {
                        "id": f"job-failed-{job_id}",
                        "severity": "critical",
                        "title": f"Job failed: {name}",
                        "message": "The latest Databricks job run ended in a failed state.",
                        "resource": f"job:{job_id}",
                        "timestamp": timestamp,
                        "acknowledged": False,
                        "type": "job",
                    }
                )
            elif status == "RUNNING":
                alerts.append(
                    {
                        "id": f"job-running-{job_id}",
                        "severity": "info",
                        "title": f"Job running: {name}",
                        "message": "A Databricks job is currently running.",
                        "resource": f"job:{job_id}",
                        "timestamp": timestamp,
                        "acknowledged": False,
                        "type": "job",
                    }
                )

            if isinstance(duration, int) and duration >= 1800:
                alerts.append(
                    {
                        "id": f"job-sla-{job_id}",
                        "severity": "warning",
                        "title": f"SLA watch: {name}",
                        "message": f"Latest run duration was {duration}s, above the 1800s monitoring target.",
                        "resource": f"job:{job_id}",
                        "timestamp": timestamp,
                        "acknowledged": False,
                        "type": "sla",
                    }
                )
    else:
        alerts.append(
            {
                "id": "jobs-unavailable",
                "severity": "warning",
                "title": "Jobs status unavailable",
                "message": jobs.get("message") or "Could not load Databricks jobs.",
                "resource": "jobs",
                "timestamp": _now_iso(),
                "acknowledged": False,
                "type": "job",
            }
        )

    pipelines = list_pipelines()
    sources["pipelines"] = bool(pipelines.get("ok"))
    if pipelines.get("ok"):
        for pipeline in pipelines.get("pipelines") or []:
            status = str(pipeline.get("status") or "").upper()
            pipeline_id = str(pipeline.get("id") or "")
            name = pipeline.get("name") or pipeline_id or "Unnamed pipeline"
            timestamp = pipeline.get("lastUpdated") or _now_iso()

            if status == "FAILED":
                alerts.append(
                    {
                        "id": f"pipeline-failed-{pipeline_id}",
                        "severity": "critical",
                        "title": f"Pipeline failed: {name}",
                        "message": "The latest DLT pipeline update is in a failed state.",
                        "resource": f"pipeline:{pipeline_id}",
                        "timestamp": timestamp,
                        "acknowledged": False,
                        "type": "pipeline",
                    }
                )
            elif status == "RUNNING":
                alerts.append(
                    {
                        "id": f"pipeline-running-{pipeline_id}",
                        "severity": "info",
                        "title": f"Pipeline running: {name}",
                        "message": "A DLT pipeline update is currently running.",
                        "resource": f"pipeline:{pipeline_id}",
                        "timestamp": timestamp,
                        "acknowledged": False,
                        "type": "pipeline",
                    }
                )
    else:
        alerts.append(
            {
                "id": "pipelines-unavailable",
                "severity": "warning",
                "title": "Pipeline status unavailable",
                "message": pipelines.get("message") or "Could not load Databricks pipelines.",
                "resource": "pipelines",
                "timestamp": _now_iso(),
                "acknowledged": False,
                "type": "pipeline",
            }
        )

    clusters = list_clusters()
    sources["clusters"] = bool(clusters.get("ok"))
    if clusters.get("ok"):
        for cluster in clusters.get("clusters") or []:
            state = str(cluster.get("state") or "").upper()
            if state in {"ERROR", "TERMINATING"}:
                cluster_id = str(cluster.get("id") or "")
                name = cluster.get("name") or cluster_id or "Unnamed cluster"
                alerts.append(
                    {
                        "id": f"cluster-{state.lower()}-{cluster_id}",
                        "severity": "warning" if state == "TERMINATING" else "critical",
                        "title": f"Cluster {state.lower()}: {name}",
                        "message": f"Databricks cluster state is {state}.",
                        "resource": f"cluster:{cluster_id}",
                        "timestamp": _now_iso(),
                        "acknowledged": False,
                        "type": "cluster",
                    }
                )
    else:
        alerts.append(
            {
                "id": "clusters-unavailable",
                "severity": "warning",
                "title": "Cluster status unavailable",
                "message": clusters.get("message") or "Could not load Databricks clusters.",
                "resource": "clusters",
                "timestamp": _now_iso(),
                "acknowledged": False,
                "type": "cluster",
            }
        )

    alerts.sort(key=_severity_sort)
    return {
        "ok": True,
        "alerts": alerts,
        "sources": sources,
        "counts": {
            "critical": len([a for a in alerts if a.get("severity") == "critical"]),
            "warning": len([a for a in alerts if a.get("severity") == "warning"]),
            "info": len([a for a in alerts if a.get("severity") == "info"]),
        },
    }

