/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Lightbulb, Target, Trophy, Crown } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import PlayingCard from "@/components/PlayingCard";

export default function RulesPage() {
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

      <main className="flex-1 flex flex-col items-center py-12 px-6 relative z-10 w-full max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-block p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 shadow-lg mb-6 shadow-cyan-500/10">
            <Lightbulb className="w-10 h-10 text-cyan-400" />
          </div>
          <h1 className="font-heading text-5xl md:text-6xl font-extrabold text-gradient-cyan mb-6">
            Rules of the Arena
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Master the art of prediction. In Judgement, winning every trick isn&apos;t the goal—winning exactly what you predicted is.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {/* Phase 1: Dealing */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-3xl p-8 border-t-4 border-t-cyan-500 border-x border-b border-slate-800"
          >
            <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-3 text-slate-100">
              <span className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 font-mono flex items-center justify-center text-sm font-bold">1</span>
              The Deal
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              The game is played in rounds. In the first round, players are dealt the maximum possible cards depending on the player count:
            </p>
            <ul className="list-disc list-inside text-slate-300 mb-4 space-y-2 font-medium">
              <li>2 Players: 26 cards each</li>
              <li>3 Players: 17 cards each</li>
              <li>4 Players: 13 cards each</li>
            </ul>
            <p className="text-slate-400 text-sm leading-relaxed">
              After each round finishes, the number of cards dealt in the next round decreases by 1, escalating tension until players compete with just 1 card.
            </p>
          </motion.div>

          {/* Phase 2: Bidding */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-3xl p-8 border-t-4 border-t-indigo-500 border-x border-b border-slate-800"
          >
            <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-3 text-slate-100">
              <span className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 font-mono flex items-center justify-center text-sm font-bold">2</span>
              Tactical Bidding
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              After evaluating their hand and the active Trump suit, each player must declare exactly how many tricks they forecast winning.
            </p>
            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-700/80">
              <p className="text-xs text-indigo-300 flex items-start gap-2">
                <Target className="w-4 h-4 mt-0.5 shrink-0 text-indigo-400" />
                <span>Any bid amount is allowed! You are completely free to bid any number of tricks between 0 and your total cards in hand. Total bids are permitted to equal the cards dealt.</span>
              </p>
            </div>
          </motion.div>

          {/* Phase 3: Playing */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-3xl p-8 border-t-4 border-t-purple-500 border-x border-b border-slate-800 md:col-span-2"
          >
            <h2 className="font-heading text-2xl font-bold mb-6 flex items-center gap-3 text-slate-100">
              <span className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 font-mono flex items-center justify-center text-sm font-bold">3</span>
              Playing the Tricks
            </h2>
            
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1 space-y-4">
                <p className="text-slate-300 leading-relaxed">
                  The player to the left of the dealer leads the first trick. Other players <strong className="text-cyan-400">must follow suit</strong> if they hold a card of the lead suit.
                </p>
                <p className="text-slate-300 leading-relaxed">
                  <strong className="text-amber-400">Trump Lead Restriction:</strong> You <em>cannot</em> lead a trick with a Trump card unless all non-trump cards in your hand have been exhausted.
                </p>
                <p className="text-slate-300 leading-relaxed">
                  If you hold no cards of the lead suit, you may play a <strong className="text-amber-400">Trump</strong> to ruff and capture the trick, or slough any off-suit junk card.
                </p>
                <p className="text-slate-400 text-sm leading-relaxed">
                  The trick is won by the highest Trump card, or if no trumps were played, the highest card of the suit led.
                </p>
              </div>
              
              <div className="flex gap-[-20px] bg-slate-900/90 border border-slate-800 p-6 rounded-2xl">
                {/* Visual example of a trick */}
                <div className="transform -rotate-12 translate-x-4">
                  <PlayingCard card={{ suit: "HEARTS", rank: "K" }} small disabled />
                </div>
                <div className="transform z-10 -translate-y-2.5">
                  <PlayingCard card={{ suit: "HEARTS", rank: "A" }} small />
                </div>
                <div className="transform rotate-12 -translate-x-4">
                  <PlayingCard card={{ suit: "SPADES", rank: "2" }} small trumpSuit="SPADES" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Phase 4: Scoring */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-3xl p-8 border-t-4 border-t-amber-500 border-x border-b border-slate-800 md:col-span-2"
          >
            <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-3 text-slate-100">
              <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-mono flex items-center justify-center text-sm font-bold">4</span>
              Scoring System
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-emerald-500/10 p-6 rounded-2xl border border-emerald-500/30">
                <h3 className="font-bold text-emerald-400 text-xl mb-2 flex items-center gap-2">
                  <Trophy className="w-5 h-5" /> Exact Forecast Match
                </h3>
                <p className="text-slate-300">
                  If you win <strong>exactly</strong> the number of tricks you bid, you earn:
                  <br /><span className="font-mono font-bold text-3xl mt-2 block text-emerald-300">10 + Bid</span>
                </p>
              </div>
              <div className="bg-rose-500/10 p-6 rounded-2xl border border-rose-500/30">
                <h3 className="font-bold text-rose-400 text-xl mb-2 flex items-center gap-2">
                  <Crown className="w-5 h-5" /> Broken Prediction
                </h3>
                <p className="text-slate-300">
                  If you win even 1 trick more or less than your forecast, you earn:
                  <br /><span className="font-mono font-bold text-3xl mt-2 block text-rose-300">0 Pts</span>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
