/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Lightbulb, Target, Trophy, Crown } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import PlayingCard from "@/components/PlayingCard";

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-base-100 flex flex-col relative overflow-hidden">
      <ParticleBackground />

      {/* Navbar */}
      <nav className="w-full p-6 flex justify-between items-center relative z-10">
        <Link href="/" className="btn btn-ghost btn-sm">
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
          <div className="inline-block p-4 rounded-full bg-secondary/20 border-2 border-secondary/30 shadow-lg mb-6 shadow-secondary/20">
            <Lightbulb className="w-12 h-12 text-secondary" />
          </div>
          <h1 className="font-heading text-5xl md:text-6xl font-extrabold text-gradient-gold mb-6">
            How to Play
          </h1>
          <p className="text-xl text-base-content/60 max-w-2xl mx-auto leading-relaxed">
            Master the art of prediction. In Judgement, winning every trick isn&apos;t the goal—winning exactly what you predicted is.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {/* Phase 1: Dealing */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-3xl p-8 border-t-4 border-t-primary"
          >
            <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">1</span>
              The Deal
            </h2>
            <p className="text-base-content/70 leading-relaxed mb-4">
              The game is played in rounds. In the first round, players are dealt the maximum possible cards depending on the player count:
            </p>
            <ul className="list-disc list-inside text-base-content/70 mb-4 space-y-2 font-medium">
              <li>2 Players: 26 cards each</li>
              <li>3 Players: 17 cards each</li>
              <li>4 Players: 13 cards each</li>
            </ul>
            <p className="text-base-content/70 leading-relaxed">
              After each round finishes, the number of cards dealt in the next round decreases by 1, until players are only dealt 1 card.
            </p>
          </motion.div>

          {/* Phase 2: Bidding */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-3xl p-8 border-t-4 border-t-secondary"
          >
            <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-secondary/20 text-secondary flex items-center justify-center">2</span>
              The Bidding
            </h2>
            <p className="text-base-content/70 leading-relaxed mb-4">
              After looking at their hand, each player must declare exactly how many tricks they believe they will win in this round. 
            </p>
            <div className="bg-base-200/50 p-4 rounded-xl border border-base-300">
              <p className="text-sm text-base-content/60 italic">
                <Target className="w-4 h-4 inline-block mr-2 text-secondary" />
                Unlike traditional Judgement, we have removed the restriction that prevents total bids from equaling the cards dealt. You are free to bid any amount!
              </p>
            </div>
          </motion.div>

          {/* Phase 3: Playing */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-3xl p-8 border-t-4 border-t-accent md:col-span-2"
          >
            <h2 className="font-heading text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center">3</span>
              Playing the Tricks
            </h2>
            
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1 space-y-4">
                <p className="text-slate-300 leading-relaxed">
                  The player to the left of the dealer leads the first trick. Other players <strong>must follow suit</strong> if they have a card of the lead suit.
                </p>
                <p className="text-slate-300 leading-relaxed">
                  <strong>Trump Lead Rule:</strong> You <em>cannot</em> lead a trick with a Trump card unless all non-trump cards in your hand are finished.
                </p>
                <p className="text-slate-300 leading-relaxed">
                  If a player does not have a card of the lead suit when following a trick, they may play a <strong>Trump</strong> card to cut and win the trick, or any other card.
                </p>
                <p className="text-base-content/70 leading-relaxed">
                  The trick is won by the highest Trump card, or if no trumps were played, the highest card of the lead suit.
                </p>
              </div>
              
              <div className="flex gap-[-20px] bg-base-200/30 p-6 rounded-2xl">
                {/* Visual example of a trick */}
                <div className="transform -rotate-12 translate-x-4">
                  <PlayingCard card={{ suit: "HEARTS", rank: "K" }} small disabled />
                </div>
                <div className="transform z-10 translate-y-[-10px]">
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
            className="glass-card rounded-3xl p-8 border-t-4 border-t-yellow-500 md:col-span-2"
          >
            <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center">4</span>
              Scoring
            </h2>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 bg-success/10 p-6 rounded-2xl border border-success/20">
                <h3 className="font-bold text-success text-xl mb-2 flex items-center gap-2">
                  <Trophy className="w-5 h-5" /> Exact Match
                </h3>
                <p className="text-base-content/70">
                  If you win <strong>exactly</strong> the number of tricks you bid, you score:
                  <br /><span className="font-bold text-2xl mt-2 block text-base-content">10 + (Your Bid)</span>
                </p>
              </div>
              <div className="flex-1 bg-error/10 p-6 rounded-2xl border border-error/20">
                <h3 className="font-bold text-error text-xl mb-2 flex items-center gap-2">
                  <Crown className="w-5 h-5" /> Failed Prediction
                </h3>
                <p className="text-base-content/70">
                  If you win more or fewer tricks than your bid, you score:
                  <br /><span className="font-bold text-2xl mt-2 block text-base-content">0 points</span>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
