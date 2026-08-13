/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import { useState, useEffect } from "react";
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
  const [loading, setLoading] = useState(false);
  const [createdCode, setCreatedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [username, setUsername] = useState("Player");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUsername(localStorage.getItem("username") || "Player");
  }, []);

  const handleCreate = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await createLobby(maxPlayers);
      setCreatedCode(data.lobby.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create lobby");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (code: string) => {
    setError("");
    setLoading(true);
    try {
      await joinLobby(code);
      router.push(`/game/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join lobby");
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-100 relative overflow-hidden px-4 pt-16">
      <ParticleBackground />

      {/* Navbar */}
      <nav className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
        <Link href="/dashboard" className="btn btn-ghost btn-sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
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
            <Spade className="w-7 h-7 text-primary" />
            <h1 className="text-4xl font-heading font-bold text-gradient-gold">Game Lobby</h1>
          </div>
          <p className="text-base-content/40 text-sm">
            Welcome,{" "}
            <span className="text-primary font-semibold">{username}</span>
          </p>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="alert alert-error mb-6 text-sm error-shake"
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
            className="glass-card rounded-2xl p-6"
          >
            <h2 className="font-heading text-lg font-semibold flex items-center gap-2 mb-1">
              <Plus className="w-5 h-5 text-primary" /> Create Lobby
            </h2>
            <p className="text-xs text-base-content/40 mb-5">
              Start a new game and invite friends
            </p>

            <div className="w-full mb-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-300/90 mb-2">
                Max Players
              </label>
              <select
                className="select select-bordered w-full bg-slate-900/80 border-slate-700 text-slate-100 focus:border-amber-400"
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
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 text-center mt-6"
                >
                  <p className="text-xs text-slate-300 mb-2">Share this code:</p>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <motion.span
                      className="text-3xl font-mono font-bold text-gradient-gold tracking-[0.3em]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      {createdCode}
                    </motion.span>
                    <button onClick={handleCopy} className="btn btn-ghost btn-sm btn-circle text-slate-300">
                      {copied ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => handleJoin(createdCode)}
                    className="btn btn-primary btn-sm gap-1 mt-2"
                  >
                    <Sparkles className="w-3 h-3" /> Enter Lobby
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="create"
                  onClick={handleCreate}
                  className="btn btn-primary w-full mt-6 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all font-heading"
                  disabled={loading}
                  whileTap={{ scale: 0.97 }}
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Create Lobby
                    </>
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Join Lobby Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-2xl p-6 border border-emerald-400/30"
          >
            <h2 className="font-heading text-lg font-semibold flex items-center gap-2 mb-1 text-white">
              <LogIn className="w-5 h-5 text-emerald-400" /> Join Lobby
            </h2>
            <p className="text-xs text-slate-300/70 mb-5">
              Enter a code to join a friend&apos;s game
            </p>

            <div className="w-full mb-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-300/90 mb-2">
                Lobby Code
              </label>
              <input
                type="text"
                placeholder="E.G. ABCD12"
                className="input input-bordered w-full bg-slate-900/80 border-slate-700 font-mono uppercase tracking-[0.3em] text-center text-lg text-amber-300 placeholder:text-slate-600 focus:border-emerald-400"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
            </div>

            <motion.button
              onClick={() => handleJoin(joinCode)}
              className="btn btn-secondary w-full mt-6 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all font-heading"
              disabled={loading || joinCode.length < 4}
              whileTap={{ scale: 0.97 }}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Join Game
                </>
              )}
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
