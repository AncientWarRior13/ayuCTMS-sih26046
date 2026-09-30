import React, { useState } from "react";
import { Link } from "react-router-dom";

interface RoleDef {
  key: string;
  code: string;
  name: string;
  color: string;
  purpose: string;
  capabilities: string[];
  mockCard: React.ReactNode;
}

const ROLES: RoleDef[] = [
  {
    key: "pi",
    code: "PI",
    name: "Principal Investigator",
    color: "#2FB39A",
    purpose: "Trial protocol leadership, study transitions, and critical medical oversight.",
    capabilities: [
      "Manage My Studies portfolio and advance protocol lifecycle states.",
      "Authorize regulatory adverse event escalations and sign off on study milestones.",
      "Access pseudonymized subject cohorts and trigger interop export bundles.",
    ],
    mockCard: (
      <div className="bg-[#0A0F0D] border border-[#22302A] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-[13px] border-b border-[#22302A] pb-2">
          <span className="font-data text-[#2FB39A]">CTRI/2026/046 · Ashwagandha Anxiety Trial</span>
          <span className="font-data px-2 py-0.5 rounded bg-[#2FB39A]/15 text-[#2FB39A] border border-[#2FB39A]/30">ENROLLING</span>
        </div>
        <div className="flex items-center justify-between text-[13px] bg-[#16201C] p-2.5 rounded border border-[#E5484D]/30">
          <div className="space-y-0.5">
            <span className="font-semibold text-[#E8EFE9] text-[13px]">SAE #042 · Bradycardia Onset</span>
            <div className="font-data text-[#8FA398] text-[13px]">Site 01 · Patient P-0142</div>
          </div>
          <span className="font-data text-[13px] text-[#F2A93B] font-bold">18h 42m remaining</span>
        </div>
      </div>
    ),
  },
  {
    key: "coord",
    code: "COORD",
    name: "Clinical Coordinator",
    color: "#C8A45C",
    purpose: "Subject visit schedules, informed consent administration, and CRF data entry.",
    capabilities: [
      "Track daily participant visit schedule due lists and protocol milestone windows.",
      "Administer multilingual consent comprehension quizzes and enrol verified subjects.",
      "Record Prakriti, Vikriti, Agni, and laboratory observation CRF domains.",
    ],
    mockCard: (
      <div className="bg-[#0A0F0D] border border-[#22302A] rounded-xl p-4 space-y-2.5">
        <div className="flex items-center justify-between text-[13px] pb-2 border-b border-[#22302A]">
          <span className="font-data text-[#C8A45C]">Visits Due Today (Site 01)</span>
          <span className="font-data text-[#8FA398]">4 of 6 Completed</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[13px] p-2 bg-[#16201C] rounded border border-[#22302A]">
            <span className="font-data text-[#E8EFE9]">P-0018 · Visit 3 (Day 28)</span>
            <span className="font-data text-[#2FB39A]">CRF Submitted</span>
          </div>
          <div className="flex justify-between items-center text-[13px] p-2 bg-[#16201C] rounded border border-[#C8A45C]/40">
            <span className="font-data text-[#E8EFE9]">P-0024 · Visit 2 (Day 14)</span>
            <span className="font-data text-[#C8A45C]">Pending Agni CRF</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "monitor",
    code: "MONITOR",
    name: "Trial Monitor",
    color: "#7A8FB8",
    purpose: "Source Data Verification (SDV) and Risk-Based Monitoring (RBM).",
    capabilities: [
      "Review study risk heatmap evaluating deviation velocity and AE rates across sites.",
      "Verify participant CRF entries against electronic source documents (SDV).",
      "Formally close protocol deviation threads with corrective CAPA sign-offs.",
    ],
    mockCard: (
      <div className="bg-[#0A0F0D] border border-[#22302A] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-[13px] pb-2 border-b border-[#22302A]">
          <span className="font-data text-[#7A8FB8]">Site Risk Heatmap (ICH E6(R2))</span>
          <span className="font-data text-[#8FA398]">3 Sites Monitored</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center font-data text-[13px]">
          <div className="p-2.5 rounded bg-[#16201C] border border-[#2FB39A]/30">
            <div className="text-[#8FA398]">Site 01</div>
            <div className="text-[#2FB39A] font-bold mt-1">LOW (18)</div>
          </div>
          <div className="p-2.5 rounded bg-[#16201C] border border-[#F2A93B]/40">
            <div className="text-[#8FA398]">Site 02</div>
            <div className="text-[#F2A93B] font-bold mt-1">MEDIUM (52)</div>
          </div>
          <div className="p-2.5 rounded bg-[#16201C] border border-[#2FB39A]/30">
            <div className="text-[#8FA398]">Site 03</div>
            <div className="text-[#2FB39A] font-bold mt-1">LOW (24)</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "iec",
    code: "IEC",
    name: "Ethics Committee",
    color: "#6FA36B",
    purpose: "Independent participant safety oversight and ethical protocol review.",
    capabilities: [
      "Review study protocols, participant information sheets, and informed consent versions.",
      "Monitor continuing review approval validity windows (<30 days expiry warnings).",
      "Inspect informed consent comprehension quiz pass rates and safety deviations.",
    ],
    mockCard: (
      <div className="bg-[#0A0F0D] border border-[#22302A] rounded-xl p-4 space-y-2.5">
        <div className="flex items-center justify-between text-[13px] pb-2 border-b border-[#22302A]">
          <span className="font-data text-[#6FA36B]">Ethics Approvals Status</span>
          <span className="font-data text-[#F2A93B]">1 Expiring Soon</span>
        </div>
        <div className="p-2.5 bg-[#16201C] rounded border border-[#F2A93B]/40 flex justify-between items-center text-[13px]">
          <div>
            <div className="font-semibold text-[#E8EFE9]">IEC/AIIA/2025/112</div>
            <div className="font-data text-[#8FA398]">Brahmi Cognitive Trial</div>
          </div>
          <span className="font-data text-[#F2A93B] font-bold">Expires in 18d</span>
        </div>
      </div>
    ),
  },
  {
    key: "pv",
    code: "PV",
    name: "Pharmacovigilance",
    color: "#E0713A",
    purpose: "Adverse event statutory triage, herb-drug safety signals, and CIOMS generation.",
    capabilities: [
      "Manage real-time 24-hour statutory countdown timers for serious adverse events.",
      "Perform causality assessments via standardized 10-question Naranjo algorithms.",
      "Run statistical disproportionality analysis (PRR and ROR) for herb-drug safety signals.",
    ],
    mockCard: (
      <div className="bg-[#0A0F0D] border border-[#22302A] rounded-xl p-4 space-y-2 font-data text-[13px]">
        <div className="flex justify-between items-center pb-2 border-b border-[#22302A]">
          <span className="text-[#E0713A]">Statutory Clocks (NDCT Rules 2019)</span>
          <span className="text-[#8FA398]">SAE #042</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between p-2 rounded bg-[#16201C] border border-[#22302A]">
            <span className="text-[#E8EFE9]">24h Licensing Authority (CDSCO)</span>
            <span className="text-[#F2A93B] font-bold">18h 42m 10s</span>
          </div>
          <div className="flex justify-between p-2 rounded bg-[#16201C] border border-[#22302A]">
            <span className="text-[#E8EFE9]">7-Day Expedited Submission</span>
            <span className="text-[#2FB39A] font-bold">5d 14h 20m</span>
          </div>
          <div className="flex justify-between p-2 rounded bg-[#16201C] border border-[#22302A]">
            <span className="text-[#E8EFE9]">14-Day Detailed Report</span>
            <span className="text-[#39C8AD] font-bold">12d 08h 15m</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "admin",
    code: "ADMIN",
    name: "System Administrator",
    color: "#E5484D",
    purpose: "Cryptographic Merkle checkpoints, user provisioning, and compliance rule setup.",
    capabilities: [
      "Generate verifiable Merkle checkpoint roots anchoring trial audit log batches.",
      "Configure regulatory clock durations and statutory citation metadata.",
      "Manage role-based access permissions, tenant site allocations, and system integrity.",
    ],
    mockCard: (
      <div className="bg-[#0A0F0D] border border-[#22302A] rounded-xl p-4 space-y-3 font-data text-[13px]">
        <div className="flex justify-between items-center pb-2 border-b border-[#22302A]">
          <span className="text-[#E5484D]">Audit Hash Chain Status</span>
          <span className="text-[#2FB39A]">Chain Intact · 2,410 Logs</span>
        </div>
        <div className="flex items-center justify-between p-2.5 bg-[#16201C] rounded border border-[#22302A]">
          <div>
            <div className="text-[#E8EFE9]">Last Checkpoint: #142</div>
            <div className="text-[13px] text-[#8FA398]">Merkle Root: 7f8a9d...4b21</div>
          </div>
          <button
            type="button"
            className="px-3 py-1 rounded bg-[#2FB39A] text-[#0A0F0D] font-bold hover:bg-[#269984] transition-colors"
          >
            Create Root
          </button>
        </div>
      </div>
    ),
  },
  {
    key: "regulator",
    code: "REGULATOR",
    name: "Auditor, read-only",
    color: "#8FA398",
    purpose: "National regulatory inspection, cross-site safety signal audits, and verification.",
    capabilities: [
      "Inspect trial data with zero-write guarantees; all regulator views are audit-logged.",
      "Verify cryptographic SHA-256 hash chains and examine unalterable audit trails.",
      "Review national signal disproportionality alerts and compliance checklists.",
    ],
    mockCard: (
      <div className="bg-[#0A0F0D] border border-[#22302A] rounded-xl p-4 space-y-3 font-data text-[13px]">
        <div className="flex justify-between items-center pb-2 border-b border-[#22302A]">
          <span className="text-[#8FA398]">Regulator Inspection Console</span>
          <span className="px-2 py-0.5 rounded bg-[#16201C] text-[#39C8AD] border border-[#2FB39A]/40 font-bold">
            READ-ONLY
          </span>
        </div>
        <div className="p-2.5 bg-[#16201C] rounded border border-[#22302A] space-y-1">
          <div className="flex justify-between text-[#E8EFE9]">
            <span>Signal Alert: Ashwagandha + Beta-B</span>
            <span className="text-[#2FB39A]">EVANS ✓</span>
          </div>
          <div className="text-[13px] text-[#56685F]">Audit Trail Record: Inspector access verified at 10:42 UTC</div>
        </div>
      </div>
    ),
  },
];

export default function Roles() {
  const [activeIdx, setActiveIdx] = useState(0);
  const activeRole = ROLES[activeIdx];

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      setActiveIdx((index + 1) % ROLES.length);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      setActiveIdx((index - 1 + ROLES.length) % ROLES.length);
    }
  };

  return (
    <section id="roles" className="mx-auto max-w-7xl px-6 py-16 md:py-24">
      {/* Header */}
      <div className="max-w-3xl mb-12 space-y-4">
        <div className="font-data text-[13px] uppercase tracking-wider text-[#C8A45C]">
          Access
        </div>
        <h2 className="font-display text-4xl sm:text-5xl leading-[1.05] text-[#E8EFE9]">
          One system. <em className="italic text-[#C8A45C]">Seven roles.</em>
        </h2>
        <p className="text-[18px] text-[#8FA398] leading-relaxed">
          Every stakeholder operates in a tailored workspace with cryptographic controls strictly matching their regulatory obligations.
        </p>
      </div>

      {/* Desktop Layout: Vertical Tabs + Detail Panel */}
      <div className="hidden md:grid md:grid-cols-12 gap-8 items-start">
        {/* Left Column: 7 Vertical Tabs */}
        <div
          role="tablist"
          aria-label="Clinical Trial Roles"
          className="md:col-span-5 space-y-2 bg-[#101815] border border-[#22302A] rounded-xl p-3"
        >
          {ROLES.map((role, idx) => {
            const isSelected = activeIdx === idx;
            return (
              <button
                key={role.key}
                role="tab"
                id={`tab-${role.key}`}
                aria-selected={isSelected}
                aria-controls={`panel-${role.key}`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setActiveIdx(idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className={`w-full flex items-center justify-between p-3.5 rounded-lg text-left transition-all border ${
                  isSelected
                    ? "bg-[#16201C] border-[#2FB39A]/50 text-[#E8EFE9]"
                    : "border-transparent hover:bg-[#16201C]/50 text-[#8FA398]"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* 8px coloured dot per role */}
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: role.color }}
                  />
                  <div>
                    <span className="font-data text-[13px] font-bold text-[#E8EFE9] mr-2">
                      {role.code}
                    </span>
                    <span className="text-[14px] text-[#8FA398]">{role.name}</span>
                  </div>
                </div>
                <span className="font-data text-[13px] text-[#56685F]">{isSelected ? "→" : ""}</span>
              </button>
            );
          })}
        </div>

        {/* Right Column: Detail Panel */}
        <div
          role="tabpanel"
          id={`panel-${activeRole.key}`}
          aria-labelledby={`tab-${activeRole.key}`}
          className="md:col-span-7 bg-[#101815] border border-[#22302A] rounded-xl p-8 space-y-6"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: activeRole.color }}
              />
              <span className="font-data text-[13px] uppercase tracking-wider text-[#C8A45C]">
                {activeRole.code} Persona Workspace
              </span>
            </div>
            <h3 className="font-display text-[32px] text-[#E8EFE9] leading-tight">
              {activeRole.name}
            </h3>
            <p className="text-[15px] text-[#8FA398] mt-2 leading-relaxed">
              {activeRole.purpose}
            </p>
          </div>

          {/* Capabilities */}
          <div className="space-y-2.5 pt-1">
            <div className="font-data text-[13px] uppercase tracking-wider text-[#56685F]">
              Role-Specific Capabilities
            </div>
            <ul className="space-y-2">
              {activeRole.capabilities.map((cap, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[15px] text-[#E8EFE9] leading-relaxed">
                  <span className="text-[#2FB39A] mt-1 shrink-0">✓</span>
                  <span>{cap}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Role-Specific Mock Card */}
          <div className="pt-2">
            <div className="font-data text-[13px] uppercase tracking-wider text-[#56685F] mb-2">
              Live Interface Snapshot
            </div>
            {activeRole.mockCard}
          </div>
        </div>
      </div>

      {/* Mobile (<768px): Accordion, one open at a time */}
      <div className="md:hidden space-y-3">
        {ROLES.map((role, idx) => {
          const isOpen = activeIdx === idx;
          return (
            <div
              key={role.key}
              className="bg-[#101815] border border-[#22302A] rounded-xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setActiveIdx(isOpen ? -1 : idx)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: role.color }}
                  />
                  <span className="font-data text-[13px] font-bold text-[#E8EFE9]">{role.code}</span>
                  <span className="text-[14px] text-[#8FA398]">{role.name}</span>
                </div>
                <span className="font-data text-[13px] text-[#56685F]">{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div className="px-4 pb-5 pt-1 border-t border-[#22302A] space-y-4">
                  <p className="text-[14px] text-[#8FA398]">{role.purpose}</p>
                  <ul className="space-y-1.5">
                    {role.capabilities.map((cap, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-[#E8EFE9]">
                        <span className="text-[#2FB39A] mt-0.5">✓</span>
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-2">{role.mockCard}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Button */}
      <div className="mt-10 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 font-data text-[14px] px-6 py-3 rounded-xl border border-[#22302A] bg-[#101815] text-[#E8EFE9] hover:bg-[#16201C] hover:border-[#2FB39A]/40 transition-colors"
        >
          Explore as any role on /login →
        </Link>
      </div>
    </section>
  );
}
