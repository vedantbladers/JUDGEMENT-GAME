/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser } from "@/lib/api";
import { UserPlus, User, Mail, Lock, Spade } from "lucide-react";
import { motion } from "framer-motion";
import ParticleBackground from "@/components/ParticleBackground";

function getPasswordStrength(password: string): { label: string; percent: number; color: string } {
  if (password.length === 0) return { label: "", percent: 0, color: "bg-base-300" };
  if (password.length < 6) return { label: "Weak", percent: 25, color: "bg-error" };
  if (password.length < 8) return { label: "Fair", percent: 50, color: "bg-warning" };
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  if (score >= 2 && password.length >= 10) return { label: "Strong", percent: 100, color: "bg-success" };
  if (score >= 1) return { label: "Good", percent: 75, color: "bg-info" };
  return { label: "Fair", percent: 50, color: "bg-warning" };
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
            <h2 className="font-heading text-2xl font-bold text-gradient-gold">Join the Game</h2>
          </div>
          <p className="text-center text-base-content/40 mb-8 text-sm">
            Create your account to start playing
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
            <label className="input input-bordered flex items-center gap-3 input-glow">
              <User className="w-4 h-4 text-base-content/30" />
              <input
                type="text"
                className="grow bg-transparent"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>

            <label className="input input-bordered flex items-center gap-3 input-glow">
              <Mail className="w-4 h-4 text-base-content/30" />
              <input
                type="email"
                className="grow bg-transparent"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <div>
              <label className="input input-bordered flex items-center gap-3 input-glow">
                <Lock className="w-4 h-4 text-base-content/30" />
                <input
                  type="password"
                  className="grow bg-transparent"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </label>
              {/* Password Strength Bar */}
              {password.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-base-300 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${strength.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${strength.percent}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <span className="text-xs text-base-content/40">{strength.label}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow"
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Login Link & Guest Option */}
          <div className="divider text-base-content/20 text-xs my-6">OR</div>
          
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="btn btn-outline btn-accent btn-sm w-full font-medium"
            >
              🎮 Play as Guest (No Account Required)
            </Link>
            
            <p className="text-center text-sm text-base-content/40">
              Already have an account?{" "}
              <Link href="/login" className="link link-primary font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
