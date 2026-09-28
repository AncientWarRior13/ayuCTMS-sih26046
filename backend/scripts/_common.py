import csv
import json
import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, text

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.core.config import get_settings  # noqa: E402

DATA_DIR = Path(os.environ.get("DATA_DIR", ROOT.parent / "data"))
RAW = DATA_DIR / "raw"
SEED = 26046


def owner_engine():
    s = get_settings()
    url = s.admin_database_url or s.database_url
    return create_engine(url, connect_args={"options": "-c timezone=GMT"})


def read_csv(name: str) -> list[dict]:
    with open(RAW / name, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def seed_audit(conn, entity_type: str, count: int, source: str) -> None:
    conn.execute(text("INSERT INTO audit_log (actor_role, action, entity_type, after_data, reason, prev_hash, row_hash)"
                      " VALUES ('SYSTEM', 'SEED', :e, CAST(:a AS jsonb), 'Synthetic demo data load', '', '')"),
                 {"e": entity_type, "a": json.dumps({"rows": count, "source": source})})


def provenance(conn, table: str, source: str, url: str | None, licence: str, notes: str) -> None:
    conn.execute(text("INSERT INTO data_provenance (table_name, source_name, source_url, accessed_on, licence_note,"
                      " is_synthetic, notes) VALUES (:t, :s, :u, current_date, :l, TRUE, :n)"),
                 {"t": table, "s": source, "u": url, "l": licence, "n": notes})
