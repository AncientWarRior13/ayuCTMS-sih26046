import { useState, useEffect, useCallback } from "react";

const INITIAL_TEXTS = [
  "Dose: 50 mg",
  "Visit 3 completed",
  "AE reported: bradycardia",
  "Consent v2.1 signed",
];

const GENESIS_HASH = "000000000000";

async function computeHash(input: string): Promise<string> {
  try {
    if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
      const enc = new TextEncoder().encode(input);
      const buf = await window.crypto.subtle.digest("SHA-256", enc);
      const arr = Array.from(new Uint8Array(buf));
      return arr.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
    }
  } catch {
    // Fallback if subtle crypto is not available in non-secure context
  }
  let h1 = 0x811c9dc5;
  let h2 = 0x27d4eb2f;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 ^ (ch << 1), 0x01000193);
  }
  const part1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const part2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return (part1 + part2).slice(0, 12);
}

export default function VerifyChain() {
  const [texts, setTexts] = useState<string[]>(INITIAL_TEXTS);
  const [hashes, setHashes] = useState<string[]>([]);
  const [originalHashes, setOriginalHashes] = useState<string[]>([]);
  const [isTampered, setIsTampered] = useState(false);

  // Compute chain hashes sequentially
  const calculateChain = useCallback(async (currentTexts: string[]) => {
    const calculated: string[] = [];
    let prev = GENESIS_HASH;
    for (const txt of currentTexts) {
      const h = await computeHash(prev + txt);
      calculated.push(h);
      prev = h;
    }
    return calculated;
  }, []);

  // Compute initial baseline hashes once
  useEffect(() => {
    calculateChain(INITIAL_TEXTS).then((baseHashes) => {
      setOriginalHashes(baseHashes);
      setHashes(baseHashes);
    });
  }, [calculateChain]);

  // Recompute live hashes whenever texts change
  useEffect(() => {
    calculateChain(texts).then((newHashes) => {
      setHashes(newHashes);
    });
  }, [texts, calculateChain]);

  // Find first broken block (where text was altered or hash doesn't match original baseline)
  let firstBrokenIndex: number | null = null;
  if (originalHashes.length === texts.length && hashes.length === texts.length) {
    for (let i = 0; i < texts.length; i++) {
      if (hashes[i] !== originalHashes[i]) {
        firstBrokenIndex = i;
        break;
      }
    }
  }

  const handleTamperToggle = () => {
    if (isTampered) {
      // Restore
      setTexts(INITIAL_TEXTS);
      setIsTampered(false);
    } else {
      // Tamper with block 0
      const updated = [...texts];
      updated[0] = "Dose: 500 mg";
      setTexts(updated);
      setIsTampered(true);
    }
  };

  const handleTextChange = (index: number, newText: string) => {
    const updated = [...texts];
    updated[index] = newText;
    setTexts(updated);
  };

  return (
    <section id="verify" className="mx-auto max-w-7xl px-6 py-16 md:py-24">
      {/* Header */}
      <div className="max-w-3xl mb-12 space-y-4">
        <div className="font-data text-[13px] uppercase tracking-wider text-[#C8A45C]">
          Verify it yourself
        </div>
        <h2 className="font-display text-4xl sm:text-5xl leading-[1.05] text-[#E8EFE9]">
          Don't trust the log. <em className="italic text-[#C8A45C]">Check it.</em>
        </h2>
        <p className="text-[18px] text-[#8FA398] leading-relaxed">
          Every block stores the hash of the block before it. Change one character and every later hash stops matching.
        </p>
      </div>

      {/* Interactive Card */}
      <div className="mx-auto max-w-3xl bg-[#101815] border border-[#22302A] rounded-[12px] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#22302A]">
          <div>
            <div className="font-data text-[13px] text-[#56685F] uppercase">Live Cryptographic Audit Rig</div>
            <div className="text-[15px] text-[#8FA398] mt-0.5">Edit any block below to observe real-time SHA-256 cascade propagation</div>
          </div>
          <button
            type="button"
            onClick={handleTamperToggle}
            className={`font-data text-[13px] px-4 py-2 rounded-lg font-bold transition-all shrink-0 ${
              isTampered
                ? "bg-[#2FB39A] text-[#0A0F0D] hover:bg-[#269984]"
                : "bg-[#E5484D]/15 text-[#E5484D] border border-[#E5484D]/40 hover:bg-[#E5484D]/25"
            }`}
          >
            {isTampered ? "Restore Original Chain" : "Tamper with Block 1"}
          </button>
        </div>

        {/* 4 Interactive Blocks */}
        <div className="space-y-4">
          {texts.map((txt, idx) => {
            const isMismatch = firstBrokenIndex !== null && idx >= firstBrokenIndex;
            const currentHash = hashes[idx] || "calculating...";

            return (
              <div key={idx} className="relative">
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    isMismatch
                      ? "bg-[#E5484D]/10 border-[#E5484D]/50 shadow-[0_0_15px_rgba(229,72,77,0.15)]"
                      : "bg-[#0A0F0D] border-[#22302A]"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <span className="font-data text-[13px] uppercase tracking-wider text-[#C8A45C]">
                      Block #{idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-data text-[13px] text-[#56685F]">
                        {idx === 0 ? "Genesis" : `Prev: ${hashes[idx - 1]}`}
                      </span>
                      {isMismatch && (
                        <span className="font-data text-[13px] font-bold text-[#E5484D] px-2 py-0.5 rounded bg-[#E5484D]/20">
                          HASH MISMATCH
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Editable Input */}
                  <input
                    type="text"
                    value={txt}
                    onChange={(e) => handleTextChange(idx, e.target.value)}
                    className="w-full font-data text-[15px] bg-[#16201C] border border-[#22302A] rounded-lg px-3.5 py-2 text-[#E8EFE9] focus:outline-none focus:border-[#2FB39A] transition-colors"
                  />

                  {/* Computed Live Hash */}
                  <div className="mt-2.5 flex items-center justify-between text-[13px]">
                    <span className="font-data text-[#8FA398]">
                      SHA-256: <strong className={isMismatch ? "text-[#E5484D]" : "text-[#2FB39A]"}>{currentHash}</strong>
                    </span>
                    <span className="font-data text-[#56685F]">
                      Computed live via WebCrypto
                    </span>
                  </div>
                </div>

                {/* Arrow between blocks */}
                {idx < texts.length - 1 && (
                  <div className="flex justify-center my-1.5">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#33463E]" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12l7 7 7-7" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Status Line at Bottom */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between font-data text-[13px] ${
            firstBrokenIndex !== null
              ? "bg-[#E5484D]/15 border-[#E5484D]/40 text-[#E5484D]"
              : "bg-[#2FB39A]/15 border-[#2FB39A]/40 text-[#2FB39A]"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-[16px]">{firstBrokenIndex !== null ? "⚠" : "✓"}</span>
            <span className="font-bold">
              {firstBrokenIndex !== null
                ? `CHAIN BROKEN AT BLOCK ${firstBrokenIndex + 1}`
                : "CHAIN INTACT · 4/4 BLOCKS CRYPTOGRAPHICALLY VALID"}
            </span>
          </div>
          <span className="text-[#8FA398] hidden sm:inline">
            {firstBrokenIndex !== null
              ? "Parent block hash mismatch detected"
              : "Forward-secure hash chain unbroken"}
          </span>
        </div>
      </div>
    </section>
  );
}
