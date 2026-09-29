import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--bg)] text-[var(--text)] text-center">
      <div className="w-16 h-16 rounded-2xl bg-[var(--brand)]/10 border border-[var(--brand)]/30 flex items-center justify-center text-[var(--brand)] font-display text-2xl font-bold mb-4">
        404
      </div>
      <h1 className="text-2xl font-display font-bold mb-2">Page Not Found</h1>
      <p className="text-sm text-[var(--text-muted)] max-w-sm mb-6 leading-relaxed">
        The clinical trials view or cryptographic record you requested does not exist or has been relocated.
      </p>
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--brand)] text-[#0A0F0D] hover:bg-[var(--brand-hover)] transition-all"
        >
          Return to Landing
        </Link>
        <Link
          to="/login"
          className="px-4 py-2 rounded-lg text-sm font-semibold border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-3)] transition-all"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
