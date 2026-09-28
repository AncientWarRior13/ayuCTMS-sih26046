"""Derive participant baselines from Synthea FHIR R4 patient bundles, if present.

Download the 100-patient FHIR R4 sample from https://synthea.mitre.org/downloads and unzip it to
data/raw/synthea_fhir_r4/. Only gender, age and condition/medication text are used; names,
addresses, telecom, identifiers and birth dates are discarded on read."""
import json
from datetime import date

from _common import RAW


def profiles() -> list[dict]:
    folder = RAW / "synthea_fhir_r4"
    if not folder.is_dir():
        return []
    out = []
    today = date.today()
    for f in sorted(folder.glob("*.json")):
        try:
            bundle = json.loads(f.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        prof = {"conditions": [], "medications": []}
        for e in bundle.get("entry", []):
            r = e.get("resource", {})
            t = r.get("resourceType")
            if t == "Patient":
                b = r.get("birthDate")
                if b:
                    b = date.fromisoformat(b[:10])
                    prof["age"] = today.year - b.year - ((today.month, today.day) < (b.month, b.day))
                prof["sex"] = {"male": "M", "female": "F"}.get(r.get("gender"), "U")
            elif t == "Condition":
                prof["conditions"].append((r.get("code") or {}).get("text"))
            elif t == "MedicationRequest":
                prof["medications"].append((r.get("medicationCodeableConcept") or {}).get("text"))
        if 18 <= prof.get("age", 0) <= 75:
            prof["conditions"] = [c for c in prof["conditions"] if c][:3]
            prof["medications"] = [m for m in prof["medications"] if m][:3]
            out.append(prof)
    return out


if __name__ == "__main__":
    p = profiles()
    print(f"{len(p)} adult profiles derived from Synthea" if p else "No Synthea data found; generator will be used")
