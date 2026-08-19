/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginUser } from "@/lib/api";
import { LogIn, Mail, Lock, Spade } from "lucide-react";
import { motion } from "framer-motion";
import ParticleBackground from "@/components/ParticleBackground";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await loginUser(email, password);
      localStorage.setItem("jwt_token", data.token);
      localStorage.setItem("user_id", String(data.user.id));
      localStorage.setItem("username", data.user.username);
      localStorage.setItem("wins", String(data.user.wins || 0));
      localStorage.setItem("losses", String(data.user.losses || 0));
      localStorage.removeItem("is_guest");
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100 relative overflow-hidden">
      <ParticleBackground />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass-card rounded-2xl p-8">
          {/* Header */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <motion.div
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Spade className="w-6 h-6 text-primary" />
            </motion.div>
            <h2 className="font-heading text-2xl font-bold text-gradient-gold">Welcome Back</h2>
          </div>
          <p className="text-center text-base-content/40 mb-8 text-sm">
            Sign in to join the table
          </p>

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="alert alert-error mb-5 text-sm error-shake"
            >
              <span>{error}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="w-full">
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-300/90 mb-1.5">
                Email Address
              </label>
              <div className="flex items-center gap-3 px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl focus-within:border-amber-400">
                <Mail className="w-4 h-4 text-amber-400/80" />
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-300/90 mb-1.5">
                Password
              </label>
              <div className="flex items-center gap-3 px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl focus-within:border-amber-400">
                <Lock className="w-4 h-4 text-amber-400/80" />
                <input
                  type="password"
                  className="grow bg-transparent text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full mt-6 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all font-heading"
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-1" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Register Link & Guest Option */}
          <div className="divider text-base-content/20 text-xs my-6">OR</div>

          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="btn btn-outline btn-accent btn-sm w-full font-medium"
            >
              🎮 Play as Guest (No Account Required)
            </Link>

            <p className="text-center text-sm text-base-content/40">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="link link-primary font-medium">
                Create one
              </Link>
            </p>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
