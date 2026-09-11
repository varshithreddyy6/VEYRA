"""Batch upload tests: validation, job lifecycle, worker task execution."""
from __future__ import annotations

import io

import pytest

from app.core.config import settings


def make_csv(rows: int = 5, with_labels: bool = True, bad: bool = False) -> bytes:
    header = ["Time", *[f"V{i}" for i in range(1, 29)], "Amount", "Class"]
    lines = [",".join(header)]
    for i in range(rows):
        vals = [str(round(0.5 * (i % 3) - 0.5, 4)) for _ in range(28)]
        amount = str(100 + i * 25)
        cls = str(i % 2) if with_labels else ""
        if bad and i == 0:
            vals[0] = "not-a-number"
        lines.append(",".join([f"{i * 60}", *vals, amount, cls]))
    return ("\n".join(lines) + "\n").encode()


@pytest.fixture()
def absorb_enqueue(monkeypatch):
    """Prevent broker enqueue and background-thread execution in these tests."""
    import app.api.routes.batch as batch_routes

    class _StubPool:
        def submit(self, *a, **k):
            return None

    monkeypatch.setattr(batch_routes, "_executor", _StubPool())
    # Force the .delay() path to fail fast → route falls back to the stub pool.
    monkeypatch.setattr("app.workers.tasks.process_batch_file.delay",
                        lambda *a, **k: (_ for _ in ()).throw(ConnectionRefusedError("no broker")))


def test_upload_rejects_wrong_extension(client, registered_user):
    headers, _ = registered_user
    res = client.post("/api/v1/batch",
                      files={"file": ("data.txt", io.BytesIO(b"a,b\n1,2"), "text/plain")},
                      headers=headers)
    assert res.status_code == 422


def test_upload_rejects_oversized_file(client, registered_user, monkeypatch):
    headers, _ = registered_user
    monkeypatch.setattr(settings, "max_upload_mb", 0)
    res = client.post("/api/v1/batch",
                      files={"file": ("big.csv", io.BytesIO(b"x" * 1024), "text/csv")},
                      headers=headers)
    assert res.status_code == 422
    assert "limit" in res.json()["detail"].lower()


def test_upload_rejects_missing_columns(client, registered_user):
    headers, _ = registered_user
    res = client.post("/api/v1/batch",
                      files={"file": ("bad.csv", io.BytesIO(b"Time,V1,Amount\n0,1,5"), "text/csv")},
                      headers=headers)
    assert res.status_code == 422
    assert "Missing required column" in res.json()["detail"]


def test_upload_rejects_non_numeric(client, registered_user):
    headers, _ = registered_user
    res = client.post("/api/v1/batch",
                      files={"file": ("bad2.csv", io.BytesIO(make_csv(bad=True)), "text/csv")},
                      headers=headers)
    assert res.status_code == 422


def test_upload_rejects_card_numbers(client, registered_user):
    headers, _ = registered_user
    header = "Time," + ",".join(f"V{i}" for i in range(1, 29)) + ",Amount,external_ref"
    row = ",".join(["0", *["0"] * 28, "25.50", "4111 1111 1111 1111"])
    csv = (header + "\n" + row).encode()
    res = client.post("/api/v1/batch",
                      files={"file": ("cards.csv", io.BytesIO(csv), "text/csv")},
                      headers=headers)
    assert res.status_code == 422
    assert "card" in str(res.json()["detail"]).lower()


def test_upload_creates_queued_job(client, registered_user, absorb_enqueue):
    headers, _ = registered_user
    res = client.post("/api/v1/batch",
                      files={"file": ("ok.csv", io.BytesIO(make_csv()), "text/csv")},
                      headers=headers)
    assert res.status_code == 202, res.text
    body = res.json()
    assert body["job"]["status"] == "queued"
    assert body["job"]["total_rows"] == 5

    job = client.get(f"/api/v1/batch/{body['job']['id']}", headers=headers)
    assert job.status_code == 200
    assert job.json()["filename"] == "ok.csv"


def test_screen_batch_alias_matches_canonical_endpoint(client, registered_user, absorb_enqueue):
    """POST /api/v1/screen/batch must behave exactly like POST /api/v1/batch (spec alias)."""
    headers, _ = registered_user
    res = client.post("/api/v1/screen/batch",
                      files={"file": ("alias.csv", io.BytesIO(make_csv(rows=3)), "text/csv")},
                      headers=headers)
    assert res.status_code == 202, res.text
    body = res.json()
    assert body["job"]["status"] == "queued"
    assert body["job"]["total_rows"] == 3
    assert body["job"]["filename"] == "alias.csv"
    # The job must be visible through the canonical GET /api/v1/batch/{id} path.
    job = client.get(f"/api/v1/batch/{body['job']['id']}", headers=headers)
    assert job.status_code == 200
    assert job.json()["filename"] == "alias.csv"


def test_batch_worker_runs_and_completes(client, registered_user, absorb_enqueue, patch_model):
    """Synchronous execution of the Celery task body (identical code path)."""
    headers, _ = registered_user

    import app.api.routes.batch as batch_routes
    from app.workers.tasks import process_batch_file

    res = client.post("/api/v1/batch",
                      files={"file": ("work.csv", io.BytesIO(make_csv(rows=6, with_labels=False)), "text/csv")},
                      headers=headers)
    job_id = res.json()["job"]["id"]
    upload_path = batch_routes._tmp_root / f"job_{job_id}.csv"
    assert upload_path.exists()

    outcome = process_batch_file.run(job_id, str(upload_path))
    assert outcome["status"] == "done"

    job = client.get(f"/api/v1/batch/{job_id}", headers=headers)
    assert job.status_code == 200
    body = job.json()
    assert body["status"] == "done"
    assert body["processed_rows"] == 6
    assert body["flagged_rows"] >= 0
    assert body["result_path"]

    download = client.get(f"/api/v1/batch/{job_id}/download", headers=headers)
    assert download.status_code == 200
    assert "text/csv" in download.headers["content-type"]
    assert "fraud_probability" in download.text


def test_batch_listing(client, registered_user, absorb_enqueue):
    headers, _ = registered_user
    client.post("/api/v1/batch",
                files={"file": ("list.csv", io.BytesIO(make_csv()), "text/csv")}, headers=headers)
    res = client.get("/api/v1/batch", headers=headers)
    assert res.status_code == 200
    assert res.json()["total"] >= 1
