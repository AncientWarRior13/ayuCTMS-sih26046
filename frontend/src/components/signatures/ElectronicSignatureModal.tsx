import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, FileSignature, KeyRound, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { get, post } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { Badge, Button, ErrorBox, Field, fmtDateTime, Modal, useToast } from "../ui";

export interface ElectronicSignatureModalProps {
  open: boolean;
  onClose: () => void;
  studyId: number;
  entityType: string;
  entityId: number;
  title?: string;
  onSigned?: (sig: any) => void;
}

const MEANINGS = [
  { value: "AUTHORSHIP", label: "Authorship", desc: "I am the author/clinician who recorded this clinical data" },
  { value: "APPROVAL", label: "Approval", desc: "I have reviewed and approved this clinical record" },
  { value: "REVIEW", label: "Review", desc: "I have monitored and verified this data for trial compliance" },
  { value: "VERIFICATION", label: "Verification", desc: "I have source-data verified this entry against original hospital records" },
] as const;

export function ElectronicSignatureModal({
  open,
  onClose,
  studyId,
  entityType,
  entityId,
  title = "Electronic Signature Sign-Off",
  onSigned,
}: ElectronicSignatureModalProps) {
  const { me } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [meaning, setMeaning] = useState<"AUTHORSHIP" | "APPROVAL" | "REVIEW" | "VERIFICATION">("AUTHORSHIP");
  const [reason, setReason] = useState("");

  const signM = useMutation({
    mutationFn: () =>
      post("/signatures/verify-sign", {
        study_id: studyId,
        entity_type: entityType,
        entity_id: entityId,
        password,
        totp: totp.trim() || undefined,
        meaning,
        reason: reason.trim(),
      }),
    onSuccess: (sig) => {
      toast("Electronic signature recorded into cryptographic audit trail");
      qc.invalidateQueries({ queryKey: ["signatures", entityType, entityId] });
      setPassword("");
      setTotp("");
      setReason("");
      onSigned?.(sig);
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form
        className="space-y-4 text-left"
        onSubmit={(e) => {
          e.preventDefault();
          signM.mutate();
        }}
      >
        <div className="flex items-center gap-2 rounded-xl border border-[#2FB39A]/30 bg-[#2FB39A]/10 p-3 text-xs text-[#CBDAD0]">
          <ShieldCheck size={18} className="text-[#39C8AD] shrink-0" />
          <span>
            <strong>21 CFR Part 11 & GCP Compliant Signature.</strong> Re-authenticate with your credentials to seal this record with an immutable HMAC-SHA256 signature token.
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#22302A] bg-[#16201C] p-3 text-xs">
          <div>
            <span className="font-mono uppercase text-[#8FA398] text-[10px]">Signer</span>
            <div className="font-medium text-[#E8EFE9] mt-0.5">{me?.full_name}</div>
          </div>
          <div>
            <span className="font-mono uppercase text-[#8FA398] text-[10px]">Role</span>
            <div className="font-medium text-[#E8EFE9] mt-0.5">{me?.role}</div>
          </div>
        </div>

        <Field label="Signature Meaning" hint="Select the regulatory intent of your sign-off">
          <select
            className="input"
            value={meaning}
            onChange={(e) => setMeaning(e.target.value as any)}
          >
            {MEANINGS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label} — {m.desc}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Reason for Signing"
          hint="Clinical context (min 3 characters, logged in audit chain)"
        >
          <input
            className="input"
            required
            minLength={3}
            placeholder="e.g. Protocol baseline visit clinical assessment verified"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>

        <Field label="Password Re-authentication" hint="Enter your account password to confirm identity">
          <input
            className="input"
            type="password"
            required
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {me?.totp_enabled && (
          <Field label="TOTP Two-Factor Authenticator Code" hint="6-digit verification code from your authenticator app">
            <input
              className="input font-mono tracking-widest text-center"
              maxLength={6}
              required
              placeholder="123456"
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
            />
          </Field>
        )}

        <div className="text-[11px] text-[#8FA398] leading-relaxed border-t border-[#22302A] pt-3">
          By signing, you certify that this electronic execution is legally binding under 21 CFR Part 11, ICH GCP E6(R2), and the Indian Information Technology Act 2000.
        </div>

        <ErrorBox error={signM.error} />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={signM.isPending}>
            Cancel
          </Button>
          <Button disabled={signM.isPending || !password || reason.trim().length < 3}>
            <FileSignature size={15} />
            {signM.isPending ? "Sealing Signature..." : "Sign & Seal"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function EntitySignaturesList({
  entityType,
  entityId,
  onOpenSign,
  canSign = false,
}: {
  entityType: string;
  entityId: number;
  onOpenSign?: () => void;
  canSign?: boolean;
}) {
  const { data } = useQuery<any>({
    queryKey: ["signatures", entityType, entityId],
    queryFn: () => get(`/signatures/entity/${entityType}/${entityId}`),
    enabled: !!entityId,
  });

  const sigs = data?.signatures ?? [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[#8FA398] flex items-center gap-1.5">
          <FileSignature size={13} className="text-[#39C8AD]" />
          Electronic Signatures ({sigs.length})
        </span>
        {canSign && onOpenSign && (
          <button
            type="button"
            onClick={onOpenSign}
            className="flex items-center gap-1 text-[11px] font-mono text-[#39C8AD] hover:underline"
          >
            <KeyRound size={12} /> Sign Record
          </button>
        )}
      </div>

      {sigs.length === 0 ? (
        <div className="text-[11px] font-mono text-[#8FA398] italic">
          No electronic signatures recorded yet.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {sigs.map((s: any) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#101815] border border-[#22302A] px-3 py-1.5 text-xs font-mono"
            >
              <div className="flex items-center gap-2">
                {s.is_valid ? (
                  <CheckCircle2 size={13} className="text-[#39C8AD] shrink-0" />
                ) : (
                  <AlertTriangle size={13} className="text-[#E5484D] shrink-0" />
                )}
                <span className="text-[#E8EFE9] font-medium">{s.signer_name}</span>
                <span className="text-[#8FA398]">({s.signer_role})</span>
                <Badge tone="purple" className="text-[10px] uppercase">
                  {s.signature_meaning}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-[#8FA398]">{fmtDateTime(s.signed_at)}</span>
                <Badge tone={s.is_valid ? "green" : "red"} className="text-[10px]">
                  {s.is_valid ? "Verified Intact" : "Altered"}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
