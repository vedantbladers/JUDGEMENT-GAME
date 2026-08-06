/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { PlayCircle, Info, FileText, User, LogOut, Spade, Crown, Shield, Flame } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 24, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 280, damping: 22 },
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>("Player");
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    if (!token) {
      router.push("/login");
      return;
    }
    const storedName = localStorage.getItem("username");
    if (storedName) {
      setUsername(storedName);
    }
    setIsChecking(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    router.push("/");
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#091410] flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-amber-400"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#091410] text-slate-100 flex flex-col relative overflow-hidden">
      <ParticleBackground />

      {/* Top Bar Navigation */}
      <nav className="w-full px-6 py-4 flex justify-between items-center relative z-10 border-b border-white/5 backdrop-blur-md bg-black/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-emerald-500/20 flex items-center justify-center border border-amber-400/30 shadow-lg shadow-amber-500/10">
            <User className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="text-xs text-amber-400/70 font-mono uppercase tracking-wider">Player Account</div>
            <div className="font-heading font-bold text-lg tracking-wide text-white">
              {username}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="btn btn-ghost btn-sm text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-white/10"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </button>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 w-full max-w-6xl mx-auto py-12">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <h1 className="flex items-center justify-center gap-3 font-heading text-5xl md:text-7xl font-extrabold text-gradient-gold tracking-tight drop-shadow-2xl mb-4">
            <Spade className="w-10 h-10 md:w-14 md:h-14 text-amber-400 drop-shadow-lg" fill="currentColor" />
            Judgement Suite
          </h1>
          <p className="text-base sm:text-lg text-slate-300/80 max-w-xl mx-auto leading-relaxed">
            Select a game mode below to enter a lobby, create a table, or study the bidding strategy.
          </p>
        </motion.div>

        {/* Action Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full"
        >
          {/* Play Game Card */}
          <motion.div variants={itemVariants} className="group h-full">
            <Link href="/lobby" className="block h-full">
              <div className="glass-card h-full p-6 rounded-3xl border border-amber-400/30 hover:border-amber-400/80 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/20 hover:-translate-y-1.5 flex flex-col justify-between relative overflow-hidden text-left">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-400/15 flex items-center justify-center border border-amber-400/30 shrink-0 group-hover:scale-105 transition-transform duration-300 shadow-lg shadow-amber-500/10">
                      <PlayCircle className="w-6 h-6 text-amber-300" />
                    </div>
                    <h2 className="font-heading text-xl md:text-2xl font-bold text-white group-hover:text-amber-300 transition-colors leading-tight">
                      Enter Game Lobby
                    </h2>
                  </div>
                  <p className="text-slate-300/80 text-sm leading-relaxed">
                    Create a new game table or join friends with a 6-character room code.
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Rules Card */}
          <motion.div variants={itemVariants} className="group h-full">
            <Link href="/rules" className="block h-full">
              <div className="glass-card h-full p-6 rounded-3xl border border-emerald-400/30 hover:border-emerald-400/80 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-1.5 flex flex-col justify-between relative overflow-hidden text-left">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-400/15 flex items-center justify-center border border-emerald-400/30 shrink-0 group-hover:scale-105 transition-transform duration-300 shadow-lg shadow-emerald-500/10">
                      <FileText className="w-6 h-6 text-emerald-300" />
                    </div>
                    <h2 className="font-heading text-xl md:text-2xl font-bold text-white group-hover:text-emerald-300 transition-colors leading-tight">
                      Rules & Strategy
                    </h2>
                  </div>
                  <p className="text-slate-300/80 text-sm leading-relaxed">
                    Master trump suits, exact bidding requirements, and trick-taking scoring rules.
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* About Card */}
          <motion.div variants={itemVariants} className="group h-full">
            <Link href="/about" className="block h-full">
              <div className="glass-card h-full p-6 rounded-3xl border border-cyan-400/30 hover:border-cyan-400/80 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/20 hover:-translate-y-1.5 flex flex-col justify-between relative overflow-hidden text-left">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-cyan-400/15 flex items-center justify-center border border-cyan-400/30 shrink-0 group-hover:scale-105 transition-transform duration-300 shadow-lg shadow-cyan-500/10">
                      <Info className="w-6 h-6 text-cyan-300" />
                    </div>
                    <h2 className="font-heading text-xl md:text-2xl font-bold text-white group-hover:text-cyan-300 transition-colors leading-tight">
                      About Kachuful
                    </h2>
                  </div>
                  <p className="text-slate-300/80 text-sm leading-relaxed">
                    Discover the history of the classic South Asian Kachuful & Judgement card game.
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
