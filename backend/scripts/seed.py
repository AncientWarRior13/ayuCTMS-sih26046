"""Load the complete synthetic demo dataset.

    python scripts/seed.py            # seed an empty (schema-only) database
    python scripts/seed.py --reset    # drop everything, recreate schema + app role, then seed

Uses ADMIN_DATABASE_URL (the schema owner). Run order follows docs/07:
build_cdisc_ct -> seed_studies_from_ctri -> seed_from_synthea -> gen_trial_events."""
import argparse
import os
import sys
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent))

import build_cdisc_ct  # noqa: E402
import gen_trial_events  # noqa: E402
import seed_studies_from_ctri  # noqa: E402
from _common import ROOT, owner_engine  # noqa: E402

SCHEMA = ROOT / "db" / "schema.sql"
APP_ROLE = ROOT / "db" / "app_role.sql"


def reset(engine, app_password: str) -> None:
    with engine.begin() as c:
        c.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
        raw = c.connection.driver_connection  # plain psycopg: no placeholder parsing of the DDL
        raw.execute(SCHEMA.read_text(encoding="utf-8"))
        role_sql = APP_ROLE.read_text(encoding="utf-8").replace(":app_password", "'" + app_password.replace("'", "''") + "'")
        raw.execute(role_sql)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--reset", action="store_true", help="drop and recreate the schema first")
    args = ap.parse_args()
    eng = owner_engine()
    if args.reset:
        reset(eng, os.environ.get("APP_DB_PASSWORD", "change_me"))
        print("Schema recreated")
    with eng.begin() as c:
        if c.execute(text("SELECT count(*) FROM users")).scalar():
            sys.exit("Database already has users; run with --reset to rebuild the demo data")
        build_cdisc_ct.run(c)
        ctx = seed_studies_from_ctri.run(c)
        gen_trial_events.run(c, ctx)
    with eng.begin() as c:
        broken = c.execute(text("SELECT audit_verify()")).scalar()
        print("Audit chain:", "intact" if broken is None else f"BROKEN at {broken}")
    print(f"Demo accounts: pi@, pi2@, coord@, coord2@, monitor@, iec@, pv@, admin@, regulator@ demo.test"
          f" / password {seed_studies_from_ctri.DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
