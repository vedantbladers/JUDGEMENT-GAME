/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Globe2, Sparkles } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-base-100 flex flex-col relative overflow-hidden">
      <ParticleBackground />

      {/* Navbar */}
      <nav className="w-full p-6 flex justify-between items-center relative z-10">
        <Link href="/dashboard" className="btn btn-ghost btn-sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
      </nav>

      <main className="flex-1 flex flex-col items-center py-12 px-6 relative z-10 w-full max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-block p-4 rounded-full bg-accent/20 border-2 border-accent/30 shadow-lg mb-6 shadow-accent/20">
            <BookOpen className="w-12 h-12 text-accent" />
          </div>
          <h1 className="font-heading text-5xl md:text-6xl font-extrabold text-gradient-gold mb-6">
            About Judgement
          </h1>
          <p className="text-xl text-base-content/60 max-w-2xl mx-auto leading-relaxed">
            Discover the rich history of the trick-taking game that requires exact prediction and masterful execution.
          </p>
        </motion.div>

        <div className="space-y-8 w-full">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-3xl p-10 border-l-4 border-l-primary shadow-xl shadow-primary/5"
          >
            <div className="flex items-center gap-4 mb-4">
              <Globe2 className="w-8 h-8 text-primary" />
              <h2 className="font-heading text-3xl font-bold text-base-content">The Origin</h2>
            </div>
            <p className="text-base-content/70 text-lg leading-relaxed mb-4">
              Judgement is a popular variation of a classic card game family known internationally as <strong>Oh Hell!</strong>, which first appeared in the 1930s. In India and South Asia, the game evolved into what is widely known today as <strong>Kachuful</strong> (an acronym for the Gujarati names of the four suits: Kali, Charakat, Fulli, and Lali) or <strong>Judgement</strong>.
            </p>
            <p className="text-base-content/70 text-lg leading-relaxed">
              Unlike traditional trick-taking games like Spades or Hearts where the goal is simply to win as many tricks as possible, Judgement requires players to exactly predict how many tricks they will win. This subtle change completely transforms the strategy, turning it into a game of precise estimation and psychological warfare.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-3xl p-10 border-r-4 border-r-secondary shadow-xl shadow-secondary/5"
          >
            <div className="flex items-center gap-4 mb-4">
              <Sparkles className="w-8 h-8 text-secondary" />
              <h2 className="font-heading text-3xl font-bold text-base-content">The Digital Adaptation</h2>
            </div>
            <p className="text-base-content/70 text-lg leading-relaxed">
              This digital adaptation of Judgement brings the classic pen-and-paper scoring into the modern era. Designed with a gorgeous glassmorphic aesthetic, real-time WebSockets, and smooth casino-inspired animations, it aims to recreate the tension of a live card table while automating the complex scorekeeping.
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
