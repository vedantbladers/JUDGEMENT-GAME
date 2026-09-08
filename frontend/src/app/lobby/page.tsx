/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createLobby, joinLobby } from "@/lib/api";
import Link from "next/link";
import { Plus, LogIn, Spade, Copy, Check, Sparkles, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ParticleBackground from "@/components/ParticleBackground";

export default function LobbyPage() {
  const router = useRouter();
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const submittingRef = useRef(false);
  const [createdCode, setCreatedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [username, setUsername] = useState("Player");

  useEffect(() => {
    const timer = setTimeout(() => {
      const token = localStorage.getItem("jwt_token");
      const userId = localStorage.getItem("user_id");
      if (!token || !userId) {
        router.replace("/login");
        return;
      }
      const saved = localStorage.getItem("username");
      if (saved) {
        setUsername(saved);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [router]);

  const handleCreate = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    try {
      const data = await createLobby(maxPlayers);
      setCreatedCode(data.lobby.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create lobby");
    } finally {
      submittingRef.current = false;
    }
  };

  const handleJoin = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      setError("Lobby code must be exactly 6 characters");
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    try {
      await joinLobby(cleanCode);
      router.push(`/game/${cleanCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join lobby");
      submittingRef.current = false;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#070a0f] relative overflow-hidden px-4 pt-16">
      <ParticleBackground />

      {/* Navbar */}
      <nav className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
        <Link href="/" className="btn btn-ghost btn-sm text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
      </nav>

      <motion.div
        className="relative z-10 w-full max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Spade className="w-5 h-5" />
            </div>
            <h1 className="text-4xl font-heading font-bold text-gradient-cyan">Strategy Arena</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Welcome,{" "}
            <span className="text-cyan-400 font-semibold">{username}</span>
          </p>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="alert alert-error mb-6 text-sm error-shake bg-rose-500/20 border border-rose-500/40 text-rose-200"
            >
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Lobby Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-6 border border-slate-800"
          >
            <h2 className="font-heading text-lg font-semibold flex items-center gap-2 mb-1 text-slate-100">
              <Plus className="w-5 h-5 text-cyan-400" /> Create Lobby
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Host a new game and invite players or AI bots
            </p>

            <div className="w-full mb-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Max Players
              </label>
              <select
                className="select select-bordered w-full bg-slate-900/90 border-slate-700 text-slate-100 focus:border-cyan-400"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
              >
                <option value={2}>2 Players</option>
                <option value={3}>3 Players</option>
                <option value={4}>4 Players</option>
              </select>
            </div>

            <AnimatePresence mode="wait">
              {createdCode ? (
                <motion.div
                  key="code"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-center mt-6"
                >
                  <p className="text-xs text-slate-400 mb-2">Share this invite code:</p>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <motion.span
                      className="text-3xl font-mono font-bold text-cyan-400 tracking-[0.3em]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      {createdCode}
                    </motion.span>
                    <button onClick={handleCopy} className="btn btn-ghost btn-sm btn-circle text-slate-300 hover:text-cyan-400">
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => handleJoin(createdCode)}
                    className="btn btn-primary btn-sm gap-1.5 mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 border-none text-white hover:from-cyan-400 hover:to-blue-500"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Enter Arena
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="create"
                  onClick={handleCreate}
                  className="btn btn-primary w-full mt-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 border-none text-white shadow-lg shadow-cyan-500/20 font-heading"
                  whileTap={{ scale: 0.97 }}
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Create Lobby
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Join Lobby Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-2xl p-6 border border-slate-800"
          >
            <h2 className="font-heading text-lg font-semibold flex items-center gap-2 mb-1 text-slate-100">
              <LogIn className="w-5 h-5 text-indigo-400" /> Join Lobby
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Enter an existing code to join a match
            </p>

            <div className="w-full mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Lobby Code
              </label>
              <input
                type="text"
                placeholder="E.G. ABCD12"
                className="input input-bordered w-full bg-slate-900/90 border-slate-700 font-mono uppercase tracking-[0.3em] text-center text-lg text-cyan-300 placeholder:text-slate-600 focus:border-indigo-400"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && joinCode.trim().length === 6) {
                    handleJoin(joinCode);
                  }
                }}
                maxLength={6}
              />
              <div className="flex justify-between items-center mt-1.5 px-1">
                <span className="text-[10px] text-slate-500">6-character match code</span>
                <span className={`text-[10px] font-mono transition-colors ${joinCode.length === 6 ? "text-cyan-400 font-bold" : "text-slate-500"}`}>
                  {joinCode.length}/6
                </span>
              </div>
            </div>

            <motion.button
              onClick={() => handleJoin(joinCode)}
              className={`btn w-full mt-4 font-heading border-none text-white transition-all duration-300 flex items-center justify-center gap-1.5 ${
                joinCode.trim().length === 6
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/30 cursor-pointer"
                  : "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-50 shadow-none hover:bg-slate-800"
              }`}
              disabled={joinCode.trim().length !== 6}
              whileTap={joinCode.trim().length === 6 ? { scale: 0.97 } : undefined}
            >
              <LogIn className="w-4 h-4 mr-1.5" /> Join Match
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
