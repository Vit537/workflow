"""Exporta la colección `tramites` de MongoDB a JSON Lines para entrenar los modelos.

Uso:
    python ml/data/export_tramites.py                     # -> ml/data/tramites_export.jsonl
    MONGO_URI=mongodb://host:27017/workflow_db python ml/data/export_tramites.py

Dependencias: pymongo (ver requirements-ml.txt)
"""
from __future__ import annotations

import argparse
import json
import os
from datetime import datetime


def _serial(o):
    if isinstance(o, datetime):
        return o.isoformat()
    return str(o)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mongo-uri", default=os.getenv("MONGO_URI", "mongodb://localhost:27017/workflow_db"))
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "tramites_export.jsonl"))
    args = ap.parse_args()

    from pymongo import MongoClient
    client = MongoClient(args.mongo_uri)
    db = client.get_default_database()

    n = 0
    with open(args.out, "w", encoding="utf-8") as f:
        for t in db.tramites.find({}):
            t["_id"] = str(t.get("_id"))
            f.write(json.dumps(t, ensure_ascii=False, default=_serial) + "\n")
            n += 1

    print(f">> {n} tramites exportados a {args.out}")


if __name__ == "__main__":
    main()
