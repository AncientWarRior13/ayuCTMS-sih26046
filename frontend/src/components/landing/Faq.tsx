import { useState } from "react";

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: "Is this a blockchain?",
    a: "No. It is a SHA-256 hash chain with Merkle checkpoints. It is tamper-evident, and it does not use distributed consensus.",
  },
  {
    q: "How are serious adverse events tracked?",
    a: "AyuCTMS runs automated, hardware-precise 1Hz regulatory countdown timers configured under NDCT Rules 2019 and GCP Schedule Y: a 24-hour statutory clock for preliminary notification to the Licensing Authority (CDSCO) and Ethics Committee, a 7-day expedited report, and a 14-day comprehensive evaluation with standardized Naranjo causality scoring.",
  },
  {
    q: "How is participant data protected?",
    a: "Data protection is built into the architecture: PostgreSQL row-level security (RLS) policies isolate trial sites so Site 1 coordinators cannot access Site 2 data. Direct participant identifiers are encrypted with Fernet AES-128, requiring a typed justification to reveal PII. Under DPDP Act 2023, consent withdrawal immediately freezes future CRF data collection while preserving immutable past audit records.",
  },
  {
    q: "Which standards can I export to?",
    a: "The system provides native one-click export pipelines for HL7 FHIR R4 (generating ResearchStudy, ResearchSubject, Patient, and AdverseEvent resource bundles) and CDISC SDTM tabulation datasets (DM Demographics and AE Adverse Events domains mapped with CDISC controlled terminology).",
  },
  {
    q: "How are Ayurvedic parameters captured?",
    a: "AyuCTMS features standardized classical Ayurveda Case Report Forms (CRFs) capturing Prakriti, Vikriti, Agni, and Kostha phenotypic assessments directly mapped to CDISC CT codelists and Ayush morbidity codes for dual-coded pharmacovigilance reporting.",
  },
  {
    q: "Can I try it without setting anything up?",
    a: "Yes. All seven stakeholder personas (PI, Coordinator, Monitor, IEC, Pharmacovigilance, Admin, and Regulator) have pre-configured one-click demo accounts populated with synthetic clinical trial data on the /login page.",
  },
];

export default function Faq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx((curr) => (curr === idx ? null : idx));
  };

  return (
    <section id="faq" className="mx-auto max-w-7xl px-6 py-16 md:py-24">
      {/* Header */}
      <div className="max-w-3xl mb-12 space-y-4">
        <div className="font-data text-[13px] uppercase tracking-wider text-[#C8A45C]">
          Questions
        </div>
        <h2 className="font-display text-4xl sm:text-5xl leading-[1.05] text-[#E8EFE9]">
          What judges <em className="italic text-[#C8A45C]">usually ask.</em>
        </h2>
      </div>

      {/* Accordion Container */}
      <div className="max-w-4xl mx-auto space-y-3">
        {FAQ_ITEMS.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="rounded-xl border border-[#22302A] bg-[#101815] overflow-hidden transition-colors hover:border-[#2FB39A]/30"
            >
              <button
                type="button"
                id={`faq-btn-${idx}`}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${idx}`}
                onClick={() => toggle(idx)}
                className="w-full flex items-center justify-between p-5 text-left font-medium text-[16px] text-[#E8EFE9] gap-4"
              >
                <span>{item.q}</span>
                <span className="font-data text-[15px] text-[#56685F] shrink-0">
                  {isOpen ? "−" : "+"}
                </span>
              </button>

              {isOpen && (
                <div
                  id={`faq-answer-${idx}`}
                  role="region"
                  aria-labelledby={`faq-btn-${idx}`}
                  className="px-5 pb-5 pt-1 text-[15px] text-[#8FA398] leading-relaxed border-t border-[#22302A]/60"
                >
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
