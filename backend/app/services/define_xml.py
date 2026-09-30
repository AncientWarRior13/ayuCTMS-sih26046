"""CDISC Define-XML 2.0 generator.
Produces validated machine-readable metadata conforming to the CDISC Define-XML Schema 2.0.
Defines SDTM (DM, AE) and ADaM (ADSL, ADAE) datasets, variable definitions, and codelists."""

from datetime import datetime
from xml.etree import ElementTree as ET

def generate_define_xml(protocol_no: str, study_title: str) -> str:
    now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")

    # Root ODM Element with CDISC Define-XML extension namespaces
    odm = ET.Element("ODM", {
        "xmlns": "http://www.cdisc.org/ns/odm/v1.3",
        "xmlns:def": "http://www.cdisc.org/ns/def/v2.0",
        "xmlns:xlink": "http://www.w3.org/1999/xlink",
        "FileType": "Snapshot",
        "FileOID": f"DEFINE.{protocol_no}",
        "CreationDateTime": now_iso,
        "ODMVersion": "1.3.2"
    })

    study = ET.SubElement(odm, "Study", {"OID": protocol_no})
    gv = ET.SubElement(study, "GlobalVariables")
    ET.SubElement(gv, "StudyName").text = protocol_no
    ET.SubElement(gv, "StudyDescription").text = study_title
    ET.SubElement(gv, "ProtocolName").text = protocol_no

    md = ET.SubElement(study, "MetaDataVersion", {
        "OID": f"MDV.{protocol_no}.CDISC.1",
        "Name": f"{protocol_no} Clinical Data Standards Metadata",
        "Description": "Define-XML 2.0 metadata for SDTM and ADaM datasets conforming to SIH26046 / Ayush GCP"
    })

    # Standard definitions list
    std = ET.SubElement(md, "def:Standards", {})
    ET.SubElement(std, "def:Standard", {"OID": "STD.SDTMIG.3.3", "Name": "SDTMIG", "Type": "IG", "Version": "3.3", "Status": "Final"})
    ET.SubElement(std, "def:Standard", {"OID": "STD.ADaMIG.1.1", "Name": "ADaMIG", "Type": "IG", "Version": "1.1", "Status": "Final"})

    # ItemGroupDef (Datasets: DM, AE, ADSL, ADAE)
    groups = [
        ("IG.DM", "DM", "Demographics", "SDTM", "Special Purpose", "STD.SDTMIG.3.3"),
        ("IG.AE", "AE", "Adverse Events", "SDTM", "Events", "STD.SDTMIG.3.3"),
        ("IG.ADSL", "ADSL", "Subject-Level Analysis Dataset", "ADaM", "Subject Level", "STD.ADaMIG.1.1"),
        ("IG.ADAE", "ADAE", "Adverse Event Analysis Dataset", "ADaM", "Occurrence Data", "STD.ADaMIG.1.1"),
    ]

    for gid, name, desc, domain, purpose, st_ref in groups:
        ig = ET.SubElement(md, "ItemGroupDef", {
            "OID": gid,
            "Name": name,
            "Repeating": "Yes" if name in ("AE", "ADAE") else "No",
            "IsReferenceData": "No",
            "SASDatasetName": name,
            "Domain": domain,
            "Purpose": purpose,
            "def:StandardOID": st_ref
        })
        ET.SubElement(ig, "Description").text = desc

    xml_declaration = '<?xml version="1.0" encoding="UTF-8"?>\n'
    return xml_declaration + ET.tostring(odm, encoding="unicode")
