/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser } from "@/lib/api";
import { UserPlus, User, Mail, Lock, Spade, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import ParticleBackground from "@/components/ParticleBackground";

function getPasswordStrength(password: string): { label: string; percent: number; color: string } {
  if (password.length === 0) return { label: "", percent: 0, color: "bg-slate-700" };
  if (password.length < 6) return { label: "Weak", percent: 25, color: "bg-rose-500" };
  if (password.length < 8) return { label: "Fair", percent: 50, color: "bg-amber-500" };
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  if (score >= 2 && password.length >= 10) return { label: "Strong", percent: 100, color: "bg-emerald-400" };
  if (score >= 1) return { label: "Good", percent: 75, color: "bg-cyan-400" };
  return { label: "Fair", percent: 50, color: "bg-amber-500" };
}

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await registerUser(username, email, password);
      localStorage.setItem("jwt_token", data.token);
      localStorage.setItem("user_id", String(data.user.id));
      localStorage.setItem("username", data.user.username);
      localStorage.setItem("wins", "0");
      localStorage.setItem("losses", "0");
      localStorage.removeItem("is_guest");
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#070a0f] relative overflow-hidden px-4">
      <ParticleBackground />

      {/* Top Navbar */}
      <nav className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
        <Link href="/" className="btn btn-ghost btn-sm text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-card rounded-2xl p-8 border border-slate-800 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Spade className="w-5 h-5" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-gradient-cyan">Create Account</h2>
          </div>
          <p className="text-center text-slate-400 mb-8 text-sm">
            Join the tactical Judgement arena
          </p>

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="alert alert-error mb-5 text-sm error-shake bg-rose-500/20 border border-rose-500/40 text-rose-200"
            >
              <span>{error}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="w-full">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Username
              </label>
              <div className="flex items-center gap-3 px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl focus-within:border-cyan-400 transition-colors">
                <User className="w-4 h-4 text-cyan-400/80" />
                <input
                  type="text"
                  className="grow bg-transparent text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none"
                  placeholder="CardShark42"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={2}
                  maxLength={20}
                />
              </div>
            </div>

            <div className="w-full">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="flex items-center gap-3 px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl focus-within:border-cyan-400 transition-colors">
                <Mail className="w-4 h-4 text-cyan-400/80" />
                <input
                  type="email"
                  className="grow bg-transparent text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="w-full">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="flex items-center gap-3 px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl focus-within:border-cyan-400 transition-colors">
                <Lock className="w-4 h-4 text-cyan-400/80" />
                <input
                  type="password"
                  className="grow bg-transparent text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {/* Password Strength Bar */}
              {password.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${strength.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${strength.percent}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">{strength.label}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full mt-6 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 border-none text-white shadow-lg shadow-cyan-500/20 font-heading"
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Login Link & Guest Option */}
          <div className="divider text-slate-600 text-xs my-6">OR</div>
          
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="btn btn-outline btn-sm w-full border-slate-700 hover:border-cyan-500 hover:bg-slate-800/60 text-slate-200 font-medium"
            >
              🎮 Continue as Guest (Instant Play)
            </Link>
            
            <p className="text-center text-sm text-slate-400">
              Already have an account?{" "}
              <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
