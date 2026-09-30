import { Link } from "react-router-dom";
import { BrandMark } from "../BrandMark";

export default function Footer() {
  return (
    <footer className="border-t border-[#22302A] bg-[#0A0F0D] py-16 px-6">
      <div className="mx-auto max-w-7xl space-y-12">
        {/* Three Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Column 1: Logo & Description */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <BrandMark size={28} />
              <span className="font-serif font-bold text-lg text-[#E8EFE9]">AyuCTMS</span>
            </div>
            <p className="text-[14px] text-[#8FA398] max-w-xs leading-relaxed">
              Clinical trial management for Ayurvedic medicine.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-3">
            <div className="font-data text-[13px] uppercase tracking-wider text-[#C8A45C]">
              Navigation
            </div>
            <ul className="space-y-2 text-[14px] text-[#8FA398]">
              <li>
                <a href="#platform" className="hover:text-[#2FB39A] transition-colors">
                  Platform
                </a>
              </li>
              <li>
                <a href="#verify" className="hover:text-[#2FB39A] transition-colors">
                  Verify Chain
                </a>
              </li>
              <li>
                <a href="#roles" className="hover:text-[#2FB39A] transition-colors">
                  Seven Roles
                </a>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#2FB39A] transition-colors">
                  Sign In / Workspace
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Plain text affiliations */}
          <div className="space-y-3">
            <div className="font-data text-[13px] uppercase tracking-wider text-[#C8A45C]">
              Affiliation
            </div>
            <p className="text-[14px] text-[#8FA398] leading-relaxed">
              Ministry of Ayush · AIIA · Smart India Hackathon 2026 · PS 26046
            </p>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="pt-8 border-t border-[#22302A] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[13px] text-[#8FA398]">
            Built by <span className="text-[#E8EFE9] font-medium">JSON0xFF</span>
          </div>

          <div className="font-data text-[13px] text-[#56685F]">
            SHA-256 audit · FHIR R4 · CDISC SDTM
          </div>
        </div>
      </div>
    </footer>
  );
}
