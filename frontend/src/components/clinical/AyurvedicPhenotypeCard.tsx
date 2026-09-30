import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Droplets,
  Flame,
  History,
  Plus,
  Sparkles,
  Wind,
} from "lucide-react";
import { useState } from "react";
import { get, post } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import {
  Badge,
  Button,
  ErrorBox,
  Field,
  fmtDate,
  fmtDateTime,
  human,
  useToast,
} from "../ui";
import { ElectronicSignatureModal, EntitySignaturesList } from "../signatures/ElectronicSignatureModal";

const PRAKRITI_OPTIONS = [
  { value: "VATA", label: "Vata Pradhana", tone: "blue" },
  { value: "PITTA", label: "Pitta Pradhana", tone: "amber" },
  { value: "KAPHA", label: "Kapha Pradhana", tone: "green" },
  { value: "VATA_PITTA", label: "Vata-Pitta (Dvidoshaja)", tone: "purple" },
  { value: "PITTA_KAPHA", label: "Pitta-Kapha (Dvidoshaja)", tone: "purple" },
  { value: "VATA_KAPHA", label: "Vata-Kapha (Dvidoshaja)", tone: "purple" },
  { value: "SAMADOSHA", label: "Samadosha (Tridosha Balanced)", tone: "purple" },
] as const;

const AGNI_OPTIONS = [
  { value: "SAMA", label: "Sama Agni", desc: "Balanced digestive fire; normal digestion" },
  { value: "TIKSHNA", label: "Tikshna Agni", desc: "Hyperactive/sharp fire; quick digestion, acidity" },
  { value: "MANDA", label: "Manda Agni", desc: "Hypoactive/sluggish fire; heaviness, slow metabolism" },
  { value: "VISHAMA", label: "Vishama Agni", desc: "Irregular fire; fluctuating appetite and bloating" },
] as const;

const KOSHTHA_OPTIONS = [
  { value: "MRIDU", label: "Mridu Koshtha", desc: "Soft bowel; sensitive, easy elimination" },
  { value: "MADHYAMA", label: "Madhyama Koshtha", desc: "Medium bowel; normal regular elimination" },
  { value: "KRURA", label: "Krura Koshtha", desc: "Hard bowel; prone to dry stool / constipation" },
] as const;

const DHATU_LIST = [
  { key: "rasa", label: "Rasa", system: "Plasma & Chyle" },
  { key: "rakta", label: "Rakta", system: "Blood & Oxygenation" },
  { key: "mamsa", label: "Mamsa", system: "Muscle & Flesh" },
  { key: "meda", label: "Meda", system: "Adipose & Lubrication" },
  { key: "asthi", label: "Asthi", system: "Bone & Skeleton" },
  { key: "majja", label: "Majja", system: "Bone Marrow & Nerves" },
  { key: "shukra", label: "Shukra", system: "Reproductive & Vitality" },
] as const;

const SARA_LEVELS = ["PRAVARA", "MADHYAMA", "AVARA"] as const;

export interface AyurvedicPhenotypeProps {
  participant: any;
  study: any;
  visits: any[];
}

export function AyurvedicPhenotypeSection({
  participant,
  study,
  visits,
}: AyurvedicPhenotypeProps) {
  const { me, can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();

  const canWrite =
    can("phenotype.write") ||
    can("crf.write") ||
    can("study.update") ||
    me?.role === "PI" ||
    me?.role === "ADMIN" ||
    me?.role === "COORDINATOR";

  const [isEditing, setIsEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [signModalOpen, setSignModalOpen] = useState(false);

  // Form State
  const [prakriti, setPrakriti] = useState<string>("VATA_PITTA");
  const [vataPct, setVataPct] = useState<number>(40);
  const [pittaPct, setPittaPct] = useState<number>(35);
  const [kaphaPct, setKaphaPct] = useState<number>(25);
  const [agni, setAgni] = useState<string>("SAMA");
  const [koshtha, setKoshtha] = useState<string>("MADHYAMA");
  const [dhatuSarata, setDhatuSarata] = useState<Record<string, string>>({
    rasa: "MADHYAMA",
    rakta: "MADHYAMA",
    mamsa: "PRAVARA",
    meda: "MADHYAMA",
    asthi: "PRAVARA",
    majja: "MADHYAMA",
    shukra: "MADHYAMA",
  });
  const [vikriti, setVikriti] = useState<string>("");
  const [vikritiVata, setVikritiVata] = useState<number | "">("");
  const [vikritiPitta, setVikritiPitta] = useState<number | "">("");
  const [vikritiKapha, setVikritiKapha] = useState<number | "">("");
  const [namasteCode, setNamasteCode] = useState<string>("");
  const [icd11Code, setIcd11Code] = useState<string>("");
  const [visitId, setVisitId] = useState<number | "">("");
  const [reasonForChange, setReasonForChange] = useState<string>("");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["phenotype", participant.id],
    queryFn: () => get(`/participants/${participant.id}/phenotype`),
  });

  const current = data?.current_phenotype;
  const history: any[] = data?.history ?? [];

  const doshaSum = Number(vataPct) + Number(pittaPct) + Number(kaphaPct);
  const isDoshaSumValid = doshaSum === 100;

  const initEditForm = () => {
    if (current) {
      setPrakriti(current.prakriti);
      setVataPct(current.prakriti_vata_pct);
      setPittaPct(current.prakriti_pitta_pct);
      setKaphaPct(current.prakriti_kapha_pct);
      setAgni(current.agni);
      setKoshtha(current.koshtha);
      setDhatuSarata(current.dhatu_sarata ?? {
        rasa: "MADHYAMA",
        rakta: "MADHYAMA",
        mamsa: "MADHYAMA",
        meda: "MADHYAMA",
        asthi: "MADHYAMA",
        majja: "MADHYAMA",
        shukra: "MADHYAMA",
      });
      setVikriti(current.vikriti_assessment ?? "");
      setVikritiVata(current.vikriti_vata_pct ?? "");
      setVikritiPitta(current.vikriti_pitta_pct ?? "");
      setVikritiKapha(current.vikriti_kapha_pct ?? "");
      setNamasteCode(current.namaste_morbidity_code ?? "");
      setIcd11Code(current.icd11_tm2_code ?? "");
      setVisitId(current.visit_id ?? "");
      setReasonForChange("");
    }
    setIsEditing(true);
  };

  const submitM = useMutation({
    mutationFn: () => {
      const payload: any = {
        prakriti,
        prakriti_vata_pct: Number(vataPct),
        prakriti_pitta_pct: Number(pittaPct),
        prakriti_kapha_pct: Number(kaphaPct),
        agni,
        koshtha,
        dhatu_sarata: dhatuSarata,
        vikriti_assessment: vikriti.trim() || null,
        vikriti_vata_pct: vikritiVata === "" ? null : Number(vikritiVata),
        vikriti_pitta_pct: vikritiPitta === "" ? null : Number(vikritiPitta),
        vikriti_kapha_pct: vikritiKapha === "" ? null : Number(vikritiKapha),
        namaste_morbidity_code: namasteCode.trim() || null,
        icd11_tm2_code: icd11Code.trim() || null,
        visit_id: visitId === "" ? null : Number(visitId),
        reason_for_change: current ? reasonForChange.trim() : undefined,
      };
      return post(`/participants/${participant.id}/phenotype`, payload);
    },
    onSuccess: () => {
      toast(
        current
          ? "Ayurvedic phenotype updated (new version logged in audit trail)"
          : "Ayurvedic phenotype assessment recorded",
      );
      qc.invalidateQueries({ queryKey: ["phenotype", participant.id] });
      setIsEditing(false);
      setReasonForChange("");
    },
  });

  return (
    <section className="space-y-4 rounded-2xl border border-[#22302A] bg-[#16201C]/80 p-5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#22302A] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C8A45C]/15 text-[#C8A45C] border border-[#C8A45C]/30">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="font-mono text-xs uppercase tracking-wider text-[#C8A45C] font-semibold">
              Ayurvedic Phenotype CRF (Phase 4)
            </h3>
            <p className="text-[11px] text-[#8FA398]">
              Standardized Prakriti, Agni, Koshtha & Dhatu Sarata Assessment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 1 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History size={13} />
              v{current?.version ?? 1} ({history.length} revs)
              {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </Button>
          )}

          {canWrite &&
            participant.status !== "WITHDRAWN" &&
            !isEditing && (
              <Button size="sm" onClick={initEditForm}>
                {current ? "Update Assessment" : "+ Record Phenotype"}
              </Button>
            )}
        </div>
      </div>

      {isLoading && (
        <div className="py-6 text-center text-xs font-mono text-[#8FA398]">
          Loading Ayurvedic phenotype records...
        </div>
      )}

      {/* When no record exists yet and not in edit mode */}
      {!isLoading && !current && !isEditing && (
        <div className="rounded-xl border border-dashed border-[#22302A] bg-[#101815]/50 p-6 text-center">
          <Sparkles size={24} className="mx-auto text-[#C8A45C]/60 mb-2" />
          <p className="text-xs text-[#CBDAD0] font-medium">
            No Ayurvedic phenotype profile recorded for this subject.
          </p>
          <p className="text-[11px] text-[#8FA398] mt-1">
            Phenotyping enables personalized stratification, dosha baseline tracking, and CDISC ADSL extensions.
          </p>
          {canWrite && participant.status !== "WITHDRAWN" && (
            <div className="mt-4">
              <Button size="sm" onClick={() => setIsEditing(true)}>
                <Plus size={14} /> Record Baseline Phenotype
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Current Phenotype Display View */}
      {!isLoading && current && !isEditing && (
        <div className="space-y-4">
          {/* Prakriti & Dosha Ratio Bar */}
          <div className="rounded-xl border border-[#22302A] bg-[#101815] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[#8FA398] uppercase">Prakriti Dominance:</span>
                <Badge tone="purple" className="px-2.5 py-1 text-xs font-bold tracking-wide">
                  {human(current.prakriti)}
                </Badge>
              </div>
              <div className="font-mono text-xs text-[#8FA398]">
                Assessed: {fmtDate(current.assessed_at)} by {current.assessed_by_name ?? "Clinical Investigator"}
              </div>
            </div>

            {/* Dosha Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#38bdf8] flex items-center gap-1">
                  <Wind size={12} /> Vata {current.prakriti_vata_pct}%
                </span>
                <span className="text-[#fbbf24] flex items-center gap-1">
                  <Flame size={12} /> Pitta {current.prakriti_pitta_pct}%
                </span>
                <span className="text-[#34d399] flex items-center gap-1">
                  <Droplets size={12} /> Kapha {current.prakriti_kapha_pct}%
                </span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#16201C] border border-[#22302A]">
                <div
                  style={{ width: `${current.prakriti_vata_pct}%` }}
                  className="bg-[#38bdf8] transition-all"
                  title={`Vata: ${current.prakriti_vata_pct}%`}
                />
                <div
                  style={{ width: `${current.prakriti_pitta_pct}%` }}
                  className="bg-[#fbbf24] transition-all"
                  title={`Pitta: ${current.prakriti_pitta_pct}%`}
                />
                <div
                  style={{ width: `${current.prakriti_kapha_pct}%` }}
                  className="bg-[#34d399] transition-all"
                  title={`Kapha: ${current.prakriti_kapha_pct}%`}
                />
              </div>
            </div>
          </div>

          {/* Diagnostic Profile Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[#22302A] bg-[#101815] p-3">
              <span className="font-mono text-[10px] uppercase text-[#8FA398] block">Agni (Digestive Fire)</span>
              <div className="mt-1 font-semibold text-xs text-[#E8EFE9] flex items-center gap-1.5">
                <Flame size={13} className="text-[#fbbf24]" />
                {human(current.agni)}
              </div>
            </div>

            <div className="rounded-xl border border-[#22302A] bg-[#101815] p-3">
              <span className="font-mono text-[10px] uppercase text-[#8FA398] block">Koshtha (Bowel Habit)</span>
              <div className="mt-1 font-semibold text-xs text-[#E8EFE9] flex items-center gap-1.5">
                <Activity size={13} className="text-[#39C8AD]" />
                {human(current.koshtha)}
              </div>
            </div>

            <div className="rounded-xl border border-[#22302A] bg-[#101815] p-3">
              <span className="font-mono text-[10px] uppercase text-[#8FA398] block">NAMASTE Morbidity</span>
              <div className="mt-1 font-mono text-xs text-[#C8A45C]">
                {current.namaste_morbidity_code || "—"}
              </div>
            </div>

            <div className="rounded-xl border border-[#22302A] bg-[#101815] p-3">
              <span className="font-mono text-[10px] uppercase text-[#8FA398] block">ICD-11 TM-2</span>
              <div className="mt-1 font-mono text-xs text-[#39C8AD]">
                {current.icd11_tm2_code || "—"}
              </div>
            </div>
          </div>

          {/* Dhatu Sarata Assessment */}
          {current.dhatu_sarata && (
            <div className="rounded-xl border border-[#22302A] bg-[#101815] p-3.5 space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#8FA398]">
                Dhatu Sarata (Tissue Excellence)
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {DHATU_LIST.map(({ key, label }) => {
                  const val = current.dhatu_sarata[key];
                  const tone = val === "PRAVARA" ? "green" : val === "MADHYAMA" ? "gray" : "amber";
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-lg bg-[#16201C] border border-[#22302A] px-2.5 py-1.5 text-xs"
                    >
                      <span className="text-[#CBDAD0] font-mono text-[11px]">{label}</span>
                      <Badge tone={tone} className="text-[10px] font-mono">
                        {val ?? "—"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vikriti Assessment Notes */}
          {current.vikriti_assessment && (
            <div className="rounded-xl border border-[#22302A] bg-[#101815] p-3.5 space-y-1.5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#8FA398]">
                Vikriti Clinical Evaluation (Current Morbidity State)
              </div>
              <p className="text-xs text-[#CBDAD0] leading-relaxed">
                {current.vikriti_assessment}
              </p>
              {(current.vikriti_vata_pct != null ||
                current.vikriti_pitta_pct != null ||
                current.vikriti_kapha_pct != null) && (
                <div className="flex gap-4 font-mono text-[11px] text-[#8FA398] pt-1">
                  {current.vikriti_vata_pct != null && <span>Vata: {current.vikriti_vata_pct}%</span>}
                  {current.vikriti_pitta_pct != null && <span>Pitta: {current.vikriti_pitta_pct}%</span>}
                  {current.vikriti_kapha_pct != null && <span>Kapha: {current.vikriti_kapha_pct}%</span>}
                </div>
              )}
            </div>
          )}

          {/* Signatures for Phenotype Record */}
          <div className="rounded-xl border border-[#22302A] bg-[#101815] p-3.5">
            <EntitySignaturesList
              entityType="PHENOTYPE"
              entityId={current.id}
              canSign={(can("signature.sign") || me?.role === "PI" || me?.role === "ADMIN" || me?.role === "COORDINATOR") && participant.status !== "WITHDRAWN"}
              onOpenSign={() => setSignModalOpen(true)}
            />
          </div>
        </div>
      )}

      {/* Phenotype Edit / Create Form */}
      {isEditing && (
        <form
          className="space-y-4 rounded-xl border border-[#C8A45C]/40 bg-[#101815] p-4.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!isDoshaSumValid) return;
            submitM.mutate();
          }}
        >
          <div className="flex items-center justify-between border-b border-[#22302A] pb-2">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#C8A45C]">
              {current ? `Update Phenotype (Creating Version ${current.version + 1})` : "New Ayurvedic Phenotype Assessment"}
            </span>
            <Button
              size="sm"
              variant="secondary"
              type="button"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          </div>

          {/* Dominant Prakriti & Dosha Ratio */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Dominant Prakriti *" hint="Constitution at birth">
              <select
                className="input"
                value={prakriti}
                onChange={(e) => setPrakriti(e.target.value)}
              >
                {PRAKRITI_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Visit Association (Optional)" hint="Link assessment to a protocol visit">
              <select
                className="input"
                value={visitId}
                onChange={(e) => setVisitId(e.target.value === "" ? "" : Number(e.target.value))}
              >
                <option value="">Baseline / Independent Assessment</option>
                {visits.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.visit_name} ({fmtDate(v.planned_date)})
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Dosha Percentage Inputs */}
          <div className="space-y-2 rounded-xl border border-[#22302A] bg-[#16201C] p-3.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold uppercase text-[#E8EFE9]">
                Prakriti Dosha Ratio (Must sum exactly to 100%)
              </span>
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                  isDoshaSumValid
                    ? "bg-[#2FB39A]/20 text-[#39C8AD]"
                    : "bg-[#E5484D]/20 text-[#E5484D]"
                }`}
              >
                Total: {doshaSum}% {isDoshaSumValid ? "✓" : "(!)"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Vata %">
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  className="input font-mono"
                  value={vataPct}
                  onChange={(e) => setVataPct(Number(e.target.value))}
                />
              </Field>
              <Field label="Pitta %">
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  className="input font-mono"
                  value={pittaPct}
                  onChange={(e) => setPittaPct(Number(e.target.value))}
                />
              </Field>
              <Field label="Kapha %">
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  className="input font-mono"
                  value={kaphaPct}
                  onChange={(e) => setKaphaPct(Number(e.target.value))}
                />
              </Field>
            </div>

            {!isDoshaSumValid && (
              <p className="text-[11px] text-[#E5484D] flex items-center gap-1">
                <AlertCircle size={12} /> Sum is {doshaSum}%. Must equal 100% to conform with the Ayurvedic phenotype database constraint.
              </p>
            )}
          </div>

          {/* Agni & Koshtha */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Agni (Digestive Fire) *">
              <select
                className="input"
                value={agni}
                onChange={(e) => setAgni(e.target.value)}
              >
                {AGNI_OPTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label} — {a.desc}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Koshtha (Bowel Tendency) *">
              <select
                className="input"
                value={koshtha}
                onChange={(e) => setKoshtha(e.target.value)}
              >
                {KOSHTHA_OPTIONS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label} — {k.desc}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Dhatu Sarata */}
          <div className="space-y-2 rounded-xl border border-[#22302A] bg-[#16201C] p-3.5">
            <span className="font-mono text-xs font-semibold uppercase text-[#E8EFE9]">
              Dhatu Sarata (Tissue Excellence)
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DHATU_LIST.map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <label className="font-mono text-[10px] text-[#8FA398] uppercase">{label}</label>
                  <select
                    className="input text-xs font-mono py-1"
                    value={dhatuSarata[key] ?? "MADHYAMA"}
                    onChange={(e) =>
                      setDhatuSarata({ ...dhatuSarata, [key]: e.target.value })
                    }
                  >
                    {SARA_LEVELS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Morbidity Coding */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="NAMASTE Morbidity Code" hint="e.g. AYU-MOR-0482">
              <input
                className="input font-mono"
                placeholder="AYU-MOR-XXXX"
                value={namasteCode}
                onChange={(e) => setNamasteCode(e.target.value)}
              />
            </Field>

            <Field label="WHO ICD-11 TM-2 Code" hint="Traditional Medicine Module 2">
              <input
                className="input font-mono"
                placeholder="TM2-SD-XX"
                value={icd11Code}
                onChange={(e) => setIcd11Code(e.target.value)}
              />
            </Field>
          </div>

          {/* Vikriti Assessment Notes */}
          <Field
            label="Vikriti Assessment"
            hint="Clinical evaluation of current doshic morbidity or pathology"
          >
            <textarea
              className="input min-h-[70px] text-xs"
              placeholder="e.g. Subject presents with secondary Pitta aggravation due to dietary factors; mild Ama accumulation..."
              value={vikriti}
              onChange={(e) => setVikriti(e.target.value)}
            />
          </Field>

          {/* Reason for change (required when updating an existing assessment) */}
          {current && (
            <Field
              label="Reason for Change (Required by Ayush GCP) *"
              hint="Mandatory clinical justification recorded into the cryptographic audit trail"
            >
              <input
                className="input"
                required
                minLength={3}
                placeholder="e.g. Re-assessed post 4-week Shodhana protocol; updated Agni classification"
                value={reasonForChange}
                onChange={(e) => setReasonForChange(e.target.value)}
              />
            </Field>
          )}

          <ErrorBox error={submitM.error} />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditing(false)}
              disabled={submitM.isPending}
            >
              Cancel
            </Button>
            <Button
              disabled={
                submitM.isPending ||
                !isDoshaSumValid ||
                (current && reasonForChange.trim().length < 3)
              }
            >
              {submitM.isPending
                ? "Saving Assessment..."
                : current
                ? "Save New Version"
                : "Record Phenotype"}
            </Button>
          </div>
        </form>
      )}

      {/* Longitudinal Assessment History Accordion */}
      {showHistory && history.length > 0 && (
        <div className="space-y-2 border-t border-[#22302A] pt-4">
          <div className="font-mono text-xs uppercase tracking-wider text-[#C8A45C]">
            Longitudinal Assessment History (Audit Trail)
          </div>
          <ul className="space-y-2">
            {history.map((h: any) => (
              <li
                key={h.id}
                className="rounded-xl border border-[#22302A] bg-[#101815] p-3 text-xs font-mono space-y-1.5"
              >
                <div className="flex items-center justify-between text-[#8FA398]">
                  <span className="font-semibold text-[#CBDAD0]">
                    Version {h.version} · {h.visit_name ?? "Independent Assessment"}
                  </span>
                  <span>{fmtDateTime(h.assessed_at)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <Badge tone="purple">{human(h.prakriti)}</Badge>
                  <span className="text-[#38bdf8]">V:{h.prakriti_vata_pct}%</span>
                  <span className="text-[#fbbf24]">P:{h.prakriti_pitta_pct}%</span>
                  <span className="text-[#34d399]">K:{h.prakriti_kapha_pct}%</span>
                  <span className="text-[#CBDAD0]">Agni: {human(h.agni)}</span>
                  <span className="text-[#CBDAD0]">Koshtha: {human(h.koshtha)}</span>
                </div>
                {h.reason_for_change && (
                  <div className="text-[11px] text-[#C8A45C]/90 italic">
                    Reason: {h.reason_for_change}
                  </div>
                )}
                <div className="text-[10px] text-[#8FA398]">
                  Assessed by {h.assessed_by_name ?? `User #${h.assessed_by}`}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Electronic Signature Modal */}
      {current && (
        <ElectronicSignatureModal
          open={signModalOpen}
          onClose={() => setSignModalOpen(false)}
          studyId={study.id}
          entityType="PHENOTYPE"
          entityId={current.id}
          title={`Electronic Signature — Ayurvedic Phenotype v${current.version}`}
          onSigned={() => {
            qc.invalidateQueries({ queryKey: ["phenotype", participant.id] });
          }}
        />
      )}
    </section>
  );
}
