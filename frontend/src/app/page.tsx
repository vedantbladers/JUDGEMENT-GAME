/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Spade, ChevronRight, BookOpen, Info, User, LogOut, LogIn, Award, Percent, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ParticleBackground from "@/components/ParticleBackground";
import { guestLogin } from "@/lib/api";



const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 220, damping: 22 },
  },
};

export default function HomePage() {
  const router = useRouter();
  const [isRegistered, setIsRegistered] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [username, setUsername] = useState("");
  const [guestNameInput, setGuestNameInput] = useState("");
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    const storedUsername = localStorage.getItem("username");
    const storedIsGuest = localStorage.getItem("is_guest") === "true";
    const savedGuestName = localStorage.getItem("guest_name") || "";

    if (savedGuestName && !storedUsername) {
      setGuestNameInput(savedGuestName);
    } else if (storedUsername) {
      setGuestNameInput(storedUsername);
    }

    if (token && storedUsername) {
      setUsername(storedUsername);
      if (storedIsGuest) {
        setIsGuest(true);
      } else {
        setIsRegistered(true);
        const storedWins = parseInt(localStorage.getItem("wins") || "0", 10);
        const storedLosses = parseInt(localStorage.getItem("losses") || "0", 10);
        setWins(storedWins);
        setLosses(storedLosses);
      }
    }
  }, []);

  const handleGuestPlay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = guestNameInput.trim();
    if (!trimmed) {
      setError("Please enter a nickname");
      return;
    }

    setLoading(true);
    try {
      const data = await guestLogin(trimmed);
      localStorage.setItem("jwt_token", data.token);
      localStorage.setItem("user_id", String(data.user.id));
      localStorage.setItem("username", data.user.username);
      localStorage.setItem("is_guest", "true");
      localStorage.setItem("guest_name", data.user.username);
      
      // Stay on main home page and update UI state
      setUsername(data.user.username);
      setIsGuest(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Guest login failed. Name might be taken!");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    localStorage.removeItem("is_guest");
    setIsRegistered(false);
    setIsGuest(false);
    setUsername("");
  };

  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-100 relative overflow-x-hidden px-4 py-12">
      <ParticleBackground />

      <motion.div
        className="relative z-10 flex flex-col items-center max-w-5xl mx-auto w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Main Big Hero Title */}
        <motion.div variants={itemVariants} className="text-center mb-10">
          <div className="flex items-center justify-center gap-4 mb-4">
            <motion.div
              animate={{ rotate: [0, -12, 12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Spade className="w-12 h-12 text-primary drop-shadow-xl" fill="currentColor" />
            </motion.div>

            <h1 className="text-6xl sm:text-7xl md:text-8xl font-heading font-extrabold text-gradient-gold tracking-tight drop-shadow-2xl">
              Judgement
            </h1>

            <motion.div
              animate={{ rotate: [0, 12, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            >
              <Spade className="w-12 h-12 text-primary drop-shadow-xl" fill="currentColor" />
            </motion.div>
          </div>

          <p className="text-lg md:text-xl text-base-content/70 max-w-xl mx-auto leading-relaxed">
            Master the art of prediction and card control.
            <br />
            <span className="text-amber-200/90 font-medium">
              Bid accurately. Outplay opponents. Claim victory.
            </span>
          </p>
        </motion.div>

        {/* Dynamic Main Action Card */}
        <motion.div
          variants={itemVariants}
          className="w-full max-w-md glass-card rounded-3xl p-8 mb-12 border border-white/15 shadow-2xl text-center"
        >
          {isRegistered ? (
            /* Registered User View */
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <User className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-semibold text-slate-300">
                  Logged in as <strong className="text-amber-300">{username}</strong>
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 my-6">
                <div className="bg-slate-900/80 rounded-2xl p-3 border border-emerald-500/20">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-emerald-400 mb-0.5">
                    <Award className="w-3.5 h-3.5" /> Wins
                  </div>
                  <div className="text-2xl font-extrabold text-white font-mono">{wins}</div>
                </div>

                <div className="bg-slate-900/80 rounded-2xl p-3 border border-rose-500/20">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-rose-400 mb-0.5">
                    <LogOut className="w-3.5 h-3.5" /> Losses
                  </div>
                  <div className="text-2xl font-extrabold text-white font-mono">{losses}</div>
                </div>

                <div className="bg-slate-900/80 rounded-2xl p-3 border border-cyan-500/20">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-cyan-400 mb-0.5">
                    <Percent className="w-3.5 h-3.5" /> Win Rate
                  </div>
                  <div className="text-2xl font-extrabold text-white font-mono">{winRate}%</div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href="/lobby"
                  className="btn btn-primary w-full shadow-lg shadow-amber-500/25 hover:shadow-amber-500/50 font-heading tracking-wide"
                >
                  Enter Game Lobby <ChevronRight className="w-4 h-4" />
                </Link>

                <button
                  onClick={handleLogout}
                  className="btn btn-ghost btn-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10"
                >
                  <LogOut className="w-4 h-4 mr-1" /> Sign Out
                </button>
              </div>
            </div>
          ) : isGuest ? (
            /* Active Guest User View */
            <div>
              <div className="flex items-center justify-center gap-2 mb-4">
                <User className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-semibold text-slate-300">
                  Playing as <strong className="text-cyan-300">{username} (Guest)</strong>
                </span>
              </div>

              <div className="flex flex-col gap-3 my-4">
                <Link
                  href="/lobby"
                  className="btn btn-primary w-full shadow-lg shadow-amber-500/25 hover:shadow-amber-500/50 font-heading tracking-wide"
                >
                  Enter Game Lobby <ChevronRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/login"
                  className="btn btn-outline btn-secondary w-full font-heading"
                >
                  <LogIn className="w-4 h-4 mr-1" /> Sign In to Save Stats
                </Link>

                <button
                  onClick={handleLogout}
                  className="btn btn-ghost btn-xs text-slate-400 hover:text-slate-200 mt-2"
                >
                  Change Guest Nickname
                </button>
              </div>
            </div>
          ) : (
            /* Visitor / Not Logged In View */
            <div>
              <h2 className="text-xl font-heading font-bold text-white mb-1 flex items-center justify-center gap-2">
                <User className="w-5 h-5 text-amber-400" /> Play as Guest
              </h2>
              <p className="text-xs text-slate-300/70 mb-5">
                Enter your nickname to jump straight into a game in seconds!
              </p>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="alert alert-error text-xs mb-4 flex items-center gap-2 p-3"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleGuestPlay} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-300/90 mb-1.5 text-left">
                    Your Display Name
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full bg-slate-900/80 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-amber-400 text-sm font-medium"
                    placeholder="e.g. CardMaster"
                    value={guestNameInput}
                    onChange={(e) => setGuestNameInput(e.target.value)}
                    maxLength={20}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 font-heading tracking-wide"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <>
                      Play as Guest <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="divider text-slate-500 text-xs my-4">OR</div>

              <div className="flex gap-3">
                <Link href="/login" className="btn btn-outline btn-secondary btn-sm flex-1 font-heading">
                  Sign In
                </Link>
                <Link href="/register" className="btn btn-outline btn-accent btn-sm flex-1 font-heading">
                  Create Account
                </Link>
              </div>
            </div>
          )}
        </motion.div>



        {/* Secondary Nav Links */}
        <motion.div variants={itemVariants} className="flex items-center gap-6 text-sm text-base-content/60">
          <Link href="/rules" className="flex items-center gap-1.5 hover:text-amber-300 transition-colors">
            <BookOpen className="w-4 h-4" /> Game Rules
          </Link>
          <span className="text-base-content/20">•</span>
          <Link href="/about" className="flex items-center gap-1.5 hover:text-amber-300 transition-colors">
            <Info className="w-4 h-4" /> About Judgement
          </Link>
        </motion.div>

        {/* System Footer */}
        <motion.p
          variants={itemVariants}
          className="mt-14 text-xs text-slate-400/60 tracking-widest uppercase font-mono"
        >
          Judgement Card Game
        </motion.p>
      </motion.div>
    </div>
  );
}
