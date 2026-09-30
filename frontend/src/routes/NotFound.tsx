import { Link } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-[#0A0F0D] text-[#E8EFE9] text-center overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-[#2FB39A]/10 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-[#C8A45C]/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-md w-full p-8 rounded-2xl bg-[#101815] border border-[#22302A] shadow-2xl flex flex-col items-center">
        <BrandMark size={56} className="mb-6 shadow-[0_0_24px_rgba(47,179,154,0.35)]" />

        <div className="font-mono text-xs uppercase tracking-widest text-[#C8A45C] mb-2">
          Error 404 · Unanchored Route
        </div>

        <h1 className="text-3xl font-serif font-medium text-[#E8EFE9] mb-3">
          Page Not Found
        </h1>

        <p className="text-[14px] text-[#8FA398] mb-8 leading-relaxed">
          The clinical trial record, cryptographic verification block, or workspace view you requested does not exist or has been relocated.
        </p>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            to="/"
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#2FB39A] text-[#0A0F0D] hover:bg-[#269984] hover:shadow-[0_0_16px_rgba(47,179,154,0.3)] transition-all font-sans"
          >
            ← Back to Home
          </Link>
          <Link
            to="/login"
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-sm font-semibold border border-[#22302A] bg-[#16201C] text-[#E8EFE9] hover:bg-[#1D2A24] hover:border-[#2FB39A]/40 transition-all font-sans"
          >
            Access Gateway
          </Link>
        </div>
      </div>
    </div>
  );
}
