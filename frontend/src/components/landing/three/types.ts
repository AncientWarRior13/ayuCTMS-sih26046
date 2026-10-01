export interface KeyframeRange {
  start: number;
  end: number;
  label: string;
}

export const SCROLL_KEYFRAMES: readonly KeyframeRange[] = [
  { start: 0.0, end: 0.12, label: "Lotus Idle" },
  { start: 0.12, end: 0.28, label: "Lotus → Chain" },
  { start: 0.28, end: 0.4, label: "Chain → Corridor" },
  { start: 0.4, end: 0.85, label: "Corridor Fly-through" },
  { start: 0.85, end: 1.0, label: "Corridor → Verified Lotus" },
] as const;

export interface Station {
  index: number;
  progress: number;
  title: string;
  badge: string;
  description: string;
  readoutType: "consent" | "ecrf" | "sae" | "audit" | "interop";
  readoutData: {
    label: string;
    value: string;
    subtext: string;
  };
}

export const STATIONS: readonly Station[] = [
  {
    index: 0,
    progress: 0.4,
    title: "1. Protocol & Informed Consent",
    badge: "DPDP 2023 · CDISC PRO",
    description: "Multi-lingual electronic consent with cryptographic SHA-256 fingerprinting and withdrawal freeze.",
    readoutType: "consent",
    readoutData: {
      label: "CONSENT HASH",
      value: "sha256:7f83b165...9b82",
      subtext: "Version 2.1 · Form 44 Compliant",
    },
  },
  {
    index: 1,
    progress: 0.51,
    title: "2. Classical Ayush eCRF & Assessment",
    badge: "Prakriti · Vikriti · Agni",
    description: "Dual-assessment CRF capturing classical Ayurvedic parameters alongside modern vital telemetry.",
    readoutType: "ecrf",
    readoutData: {
      label: "DOSHA PROFILE",
      value: "Vata: 42% · Pitta: 38% · Kapha: 20%",
      subtext: "Agni: Mandagni · Nadi: Kaphaja",
    },
  },
  {
    index: 2,
    progress: 0.62,
    title: "3. Pharmacovigilance & SAE Clocks",
    badge: "GCP Schedule Y · 24h Clock",
    description: "Hard real-time countdown clocks notifying CDSCO, Sponsor, and Ethics Committee within 24 hours.",
    readoutType: "sae",
    readoutData: {
      label: "SAE CLOCK ACTIVE",
      value: "18h 42m 10s remaining",
      subtext: "Recipient: CDSCO / PvPI / IEC",
    },
  },
  {
    index: 3,
    progress: 0.73,
    title: "4. Tamper-Evident Audit Ledger",
    badge: "21 CFR Part 11 · HMAC Chain",
    description: "Every single state change is cryptographically anchored. Tampering breaks the forward hash sequence immediately.",
    readoutType: "audit",
    readoutData: {
      label: "LEDGER STATE",
      value: "audit_verify() = INTACT (0x0)",
      subtext: "3,892 verified row transactions",
    },
  },
  {
    index: 4,
    progress: 0.85,
    title: "5. Standards & Regulatory Export",
    badge: "CDISC SDTM · FHIR R4 · ABDM",
    description: "One-click generation of FDA/CDSCO submission-ready CDISC SDTM datasets, FHIR bundles, and PDF dossiers.",
    readoutType: "interop",
    readoutData: {
      label: "SUBMISSION READY",
      value: "SDTM DM/AE + FHIR R4 Bundle",
      subtext: "ABDM Ayush Suraksha Gateway",
    },
  },
] as const;

export interface TamperState {
  tamperedIndex: number | null;
  restoredFromIndex: number | null;
  tamperTime: number;
  restoreTime: number;
}
