from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import JSONResponse, Response

from ..core.deps import User, db, require
from ..core.permissions import allowed
from ..services import audit, fhir, sdtm
from ..services.common import study_or_404

router = APIRouter(tags=["interoperability"])


def _export_scope(user: User, study: dict, domain: str) -> None:
    """Full study export: ADMIN, REGULATOR, or the study's own PI. PV officers may export safety data only."""
    if allowed(user.role, "export.study"):
        if user.role == "PI" and study["pi_user_id"] != user.id:
            raise HTTPException(403, "PI can only export own studies")
        return
    if domain == "AE" and allowed(user.role, "export.safety"):
        return
    raise HTTPException(403, f"Role {user.role} may not export {domain} data")


@router.get("/export/fhir/study/{sid}")
def export_fhir(sid: int, user: User = Depends(require("export.safety")), conn=Depends(db)):
    s = study_or_404(conn, sid)
    full = allowed(user.role, "export.study") and not (user.role == "PI" and s["pi_user_id"] != user.id)
    if not full and user.role != "PV":
        raise HTTPException(403, "PI can only export own studies")
    bundle = fhir.study_bundle(conn, sid, safety_only=not full)
    audit.write(conn, user, "EXPORT", "study", sid, after={"format": "FHIR", "entries": len(bundle["entry"]),
                                                           "safety_only": not full})
    return JSONResponse(bundle, media_type="application/fhir+json",
                        headers={"Content-Disposition": f'attachment; filename="{s["protocol_no"]}-fhir.json"'})


@router.get("/export/sdtm/study/{sid}/{domain}")
def export_sdtm(sid: int, domain: str, user: User = Depends(require("export.safety")), conn=Depends(db)):
    domain = domain.upper()
    s = study_or_404(conn, sid)
    _export_scope(user, s, domain)
    body = sdtm.to_csv(domain, conn, sid)
    audit.write(conn, user, "EXPORT", "study", sid, after={"format": f"SDTM-{domain}", "rows": body.count("\n") - 1})
    return Response(body, media_type="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="{s["protocol_no"]}-{domain.lower()}.csv"'})


@router.post("/import/fhir", status_code=202)
def import_fhir(bundle: dict = Body(...), user: User = Depends(require("import.fhir")), conn=Depends(db)):
    result = fhir.deidentify_import(bundle)
    audit.write(conn, user, "IMPORT", "fhir_bundle", None,
                after={"accepted": result["accepted"], "skipped": result["skipped_non_patient"]},
                reason="HIS integration: identifiers discarded on receipt")
    return result
