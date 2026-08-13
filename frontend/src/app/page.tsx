/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import Link from "next/link";
import { Spade, Crown, Users, Zap, ChevronRight, BookOpen, Info } from "lucide-react";
import { motion } from "framer-motion";
import ParticleBackground from "@/components/ParticleBackground";

const featureCards = [
  {
    icon: Users,
    color: "text-amber-400",
    title: "Real-time Multiplayer",
    desc: "2–4 players with instantaneous WebSocket state synchronization",
  },
  {
    icon: Crown,
    color: "text-emerald-400",
    title: "Tactile Trump Mechanics",
    desc: "Strategic bidding rounds with dynamically declared trumps",
  },
  {
    icon: Zap,
    color: "text-cyan-400",
    title: "Frictionless Lobbies",
    desc: "Create private game tables, share room codes, play immediately",
  },
];

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
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-100 relative overflow-x-hidden px-4 py-12">
      <ParticleBackground />

      <motion.div
        className="relative z-10 flex flex-col items-center max-w-5xl mx-auto w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Header */}
        <motion.div variants={itemVariants} className="text-center mb-12">
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

        {/* Feature Cards Grid */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 w-full max-w-4xl"
        >
          {featureCards.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="glass-card glass-card-hover rounded-2xl p-6 text-left border border-white/10"
            >
              <div className="flex items-center gap-3.5 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <h3 className="font-heading font-semibold text-slate-100 text-base md:text-lg leading-tight">
                  {feature.title}
                </h3>
              </div>
              <p className="text-sm text-slate-300/70 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Interactive Fan Preview */}
        <motion.div variants={itemVariants} className="flex items-center justify-center gap-1 mb-12">
          {[
            { suit: "♠", color: "text-slate-900", rank: "A" },
            { suit: "♥", color: "text-red-600", rank: "K" },
            { suit: "♦", color: "text-red-600", rank: "Q" },
            { suit: "♣", color: "text-slate-900", rank: "J" },
          ].map((card, i) => (
            <motion.div
              key={card.suit}
              className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl bg-linear-to-b from-slate-50 to-slate-100 shadow-2xl flex flex-col items-center justify-between p-2 font-bold border border-slate-300 select-none relative"
              style={{
                transform: `rotate(${(i - 1.5) * 10}deg)`,
                marginLeft: i > 0 ? "-16px" : "0",
              }}
              animate={{
                y: [0, -6, 0],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 0.25,
                ease: "easeInOut",
              }}
            >
              <span className={`text-xs ${card.color} self-start font-extrabold`}>{card.rank}</span>
              <span className={`text-3xl ${card.color}`}>{card.suit}</span>
              <span className={`text-xs ${card.color} self-end font-extrabold rotate-180`}>{card.rank}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Action Controls */}
        <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-4 mb-8">
          <Link
            href="/login"
            className="btn btn-primary btn-lg px-8 gap-2 shadow-xl shadow-primary/25 hover:shadow-primary/50 transition-all font-heading tracking-wide"
          >
            Play Now
            <ChevronRight className="w-5 h-5" />
          </Link>
          <Link
            href="/register"
            className="btn btn-outline btn-secondary btn-lg px-8 hover:bg-secondary/10 transition-all font-heading"
          >
            Create Account
          </Link>
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
