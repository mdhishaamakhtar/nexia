"use client";

import Link from "next/link";
import { LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";

export default function Navbar() {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <motion.nav
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-0 z-50 w-full glass-panel border-b bg-white/80"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12">
          <Link
            href="/profiles"
            className="text-[15px] font-semibold tracking-tight"
            style={{ color: "var(--text-1)" }}
          >
            Nexia
          </Link>

          <div className="flex items-center gap-1">
            <Link
              href="/chat"
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl transition-all duration-150 hover:bg-[var(--fill)]"
              style={{ color: "var(--text-2)" }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask AI</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl transition-all duration-150 hover:bg-[var(--fill)]"
              style={{ color: "var(--text-2)" }}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
