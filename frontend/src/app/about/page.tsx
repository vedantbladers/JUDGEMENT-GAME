/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Globe2, Sparkles } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#070a0f] flex flex-col relative overflow-hidden">
      <ParticleBackground />

      {/* Navbar */}
      <nav className="w-full p-6 flex justify-between items-center relative z-10">
        <Link href="/" className="btn btn-ghost btn-sm text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
      </nav>

      <main className="flex-1 flex flex-col items-center py-12 px-6 relative z-10 w-full max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-block p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 shadow-lg mb-6 shadow-cyan-500/10">
            <BookOpen className="w-10 h-10 text-cyan-400" />
          </div>
          <h1 className="font-heading text-5xl md:text-6xl font-extrabold text-gradient-cyan mb-6">
            Origins & Strategy
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Discover the rich history of the trick-taking game that requires exact prediction and masterful tactical execution.
          </p>
        </motion.div>

        <div className="space-y-8 w-full">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-3xl p-8 md:p-10 border-l-4 border-l-cyan-500 border-y border-r border-slate-800 shadow-2xl"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Globe2 className="w-5 h-5" />
              </div>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-slate-100">The Heritage</h2>
            </div>
            <p className="text-slate-300 text-base md:text-lg leading-relaxed mb-4">
              Judgement is a popular evolution of the classic card game family known internationally as <strong>Oh Hell!</strong>, which originated in the 1930s. In India and South Asia, the game developed into the beloved <strong>Kachuful</strong> (an acronym for the Gujarati names of the four suits: Kali, Charakat, Fulli, and Lali) or <strong>Judgement</strong>.
            </p>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
              Unlike traditional trick-taking games like Spades or Hearts where the objective is merely collecting as many tricks as possible, Judgement demands exact forecast accuracy. Winning one trick too many is as punishing as winning one trick too few—elevating every play into high-stakes tactical calculation.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-3xl p-8 md:p-10 border-r-4 border-r-indigo-500 border-y border-l border-slate-800 shadow-2xl"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-slate-100">The Modern Platform</h2>
            </div>
            <p className="text-slate-300 text-base md:text-lg leading-relaxed">
              This digital arena brings classic tabletop card play into the modern era. Crafted with deep obsidian materials, real-time WebSockets, intelligent bot heuristics, and tactical responsiveness, it recreates the tension of competitive live play while automating scoring and round progression.
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
