import { useState } from "react";
import {
  Button,
  Card,
  Badge,
  Modal,
  Field,
  Empty,
  Loading,
  ErrorBox,
  Tabs,
  useToast,
  type Tone,
} from "../components/ui";
import { KpiCard, ClockRing, SaeClockChip, LifecycleStepper } from "../components/widgets";

export default function DevKit() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"primitives" | "signatures" | "typography">("primitives");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedState, setSelectedState] = useState("ENROLLING");

  const tones: Tone[] = ["gray", "green", "teal", "amber", "red", "blue", "purple"];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6 sm:p-10 max-w-6xl mx-auto space-y-10">
      <header className="border-b border-[var(--border)] pb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--brand)]/15 text-[var(--brand)] border border-[var(--brand)]/30">
              DEV ONLY
            </span>
            <h1 className="font-display text-3xl font-bold tracking-tight">AyuCTMS Living Design Kit</h1>
          </div>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-1">
            Design tokens, primitives, signature widgets, and typography in current theme.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const html = document.documentElement;
              if (html.classList.contains("light")) {
                html.classList.remove("light");
                html.classList.add("dark");
              } else {
                html.classList.remove("dark");
                html.classList.add("light");
              }
            }}
          >
            Toggle Theme
          </Button>
          <Button variant="primary" size="sm" onClick={() => toast("Test notification triggered!", "ok")}>
            Trigger Toast
          </Button>
        </div>
      </header>

      <Tabs
        tabs={[
          ["primitives", "UI Primitives"],
          ["signatures", "Signature Domain Widgets"],
          ["typography", "Type Scale & Tokens"],
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "primitives" && (
        <div className="space-y-8">
          {/* Buttons */}
          <Card title="Buttons & Variants">
            <div className="flex flex-wrap gap-3 items-center">
              <Button variant="primary">Primary Action</Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="brass">Antique Brass</Button>
              <Button variant="danger">Critical Danger</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="primary" disabled>Disabled State</Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 items-center">
              <Button size="sm">Small Button</Button>
              <Button size="md">Medium Button</Button>
              <Button size="lg">Large Hero Button</Button>
              <Button size="sm" variant="secondary" onClick={() => setModalOpen(true)}>
                Open Modal Test
              </Button>
            </div>
          </Card>

          {/* Badges */}
          <Card title="Semantic Badges & Tones">
            <div className="flex flex-wrap gap-2.5 items-center">
              {tones.map((t) => (
                <Badge key={t} tone={t}>
                  {t.toUpperCase()} TONE
                </Badge>
              ))}
            </div>
          </Card>

          {/* Form Fields */}
          <Card title="Input Fields & Form Elements">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <Field label="Protocol Code" hint="Unique CTRI trial identifier">
                <input
                  type="text"
                  placeholder="e.g. CTRI/2026/09/012345"
                  className="input font-mono"
                  defaultValue="CTRI/2026/09/012345"
                />
              </Field>
              <Field label="Clinical Severity">
                <select className="select">
                  <option>MILD</option>
                  <option>MODERATE</option>
                  <option>SEVERE (Triggers 24h SAE Clock)</option>
                </select>
              </Field>
            </div>
          </Card>

          {/* States: Loading, Empty, Error */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Empty State">
              <Empty
                action={
                  <Button size="sm" variant="secondary">
                    Enrol Participant
                  </Button>
                }
              >
                No active participants enrolled under this clinical cohort yet.
              </Empty>
            </Card>

            <Card title="Error State">
              <div className="space-y-3">
                <ErrorBox error={new Error("Causality adjudication verification failed: cryptographic digest mismatch at block #120.")} />
                <Loading />
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "signatures" && (
        <div className="space-y-8">
          <Card title="KPI Metric Tiles">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Active Protocols" value="12" sub="8 actively enrolling" />
              <KpiCard label="SAE Regulatory Clocks" value="2 Overdue" tone="danger" sub="24h preliminary report" />
              <KpiCard label="Chain Status" value="Intact" tone="ok" sub="SHA-256 block #4,812" />
              <KpiCard label="Aging Queries" value="17" tone="warn" sub="Past 5-day SLA" />
            </div>
          </Card>

          <Card title="Regulatory SAE Countdown Clocks">
            <div className="flex flex-wrap gap-6 items-center">
              <ClockRing
                clock={{
                  id: 1,
                  rule_key: "24h_preliminary",
                  started_at: new Date(Date.now() - 36e5 * 6).toISOString(),
                  due_at: new Date(Date.now() + 36e5 * 18).toISOString(),
                  status: "RUNNING",
                }}
              />
              <ClockRing
                clock={{
                  id: 2,
                  rule_key: "7d_expedited",
                  started_at: new Date(Date.now() - 864e5 * 5).toISOString(),
                  due_at: new Date(Date.now() + 864e5 * 2).toISOString(),
                  status: "RUNNING",
                }}
              />
              <ClockRing
                clock={{
                  id: 3,
                  rule_key: "14d_comprehensive",
                  started_at: new Date(Date.now() - 864e5 * 15).toISOString(),
                  due_at: new Date(Date.now() - 864e5).toISOString(),
                  status: "RUNNING",
                }}
              />
              <SaeClockChip
                clock={{
                  id: 4,
                  rule_key: "24h_preliminary",
                  started_at: new Date(Date.now() - 36e5 * 2).toISOString(),
                  due_at: new Date(Date.now() + 36e5 * 22).toISOString(),
                  status: "RUNNING",
                }}
              />
            </div>
          </Card>

          <Card title="Lifecycle Stepper / Vine">
            <div className="space-y-4">
              <div className="flex gap-2">
                {["DRAFT", "PROTOCOL_APPROVED", "EC_APPROVED", "CTRI_REGISTERED", "SITE_ACTIVE", "ENROLLING", "FOLLOW_UP", "CLOSED"].map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={selectedState === s ? "primary" : "secondary"}
                    onClick={() => setSelectedState(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
              <LifecycleStepper state={selectedState} blockers={selectedState === "DRAFT" ? ["Protocol not approved by IEC", "CTRI registration pending"] : undefined} />
            </div>
          </Card>
        </div>
      )}

      {activeTab === "typography" && (
        <div className="space-y-6">
          <Card title="Typography Samples">
            <div className="space-y-6">
              <div>
                <span className="text-xs font-mono text-[var(--text-muted)] block mb-1">Display (Fraunces Serif)</span>
                <h1 className="font-display text-4xl font-bold">Ayurvedic Clinical Trial Protocol Management</h1>
              </div>
              <div>
                <span className="text-xs font-mono text-[var(--text-muted)] block mb-1">UI Sans (Inter Variable)</span>
                <p className="text-base text-[var(--text)] leading-relaxed">
                  Adverse Event reports trigger strict regulatory clocks under CDSCO and Ministry of Ayush clinical trial standards. All data entry events are committed to a cryptographic Merkle tree.
                </p>
              </div>
              <div>
                <span className="text-xs font-mono text-[var(--text-muted)] block mb-1">Data / Hashes (JetBrains Mono)</span>
                <p className="font-mono text-sm text-[var(--brand-text)]">
                  7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069 · 10,482 subjects enrolled
                </p>
              </div>
              <div>
                <span className="text-xs font-mono text-[var(--text-muted)] block mb-1">Indic Script (Noto Sans Devanagari)</span>
                <p className="font-hindi text-base text-[var(--text)]">
                  अखिल भारतीय आयुर्वेद संस्थान (AIIA) - नैदानिक परीक्षण सहमति प्रपत्र एवं सुरक्षा निगरानी।
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Test Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Test Diagnostic Modal">
        <p className="text-sm text-[var(--text-muted)] mb-4">
          This accessible modal confirms backdrop blur, focus handling, and layout rendering in the chosen theme.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              toast("Modal action confirmed", "ok");
              setModalOpen(false);
            }}
          >
            Confirm
          </Button>
        </div>
      </Modal>
    </div>
  );
}
