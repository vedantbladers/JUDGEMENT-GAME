/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { connectToLobby, sendEvent } from "@/lib/websocket";
import { GameState, Suit, Card } from "@/lib/types";
import { getSuitSymbol } from "@/lib/cardUtils";
import PlayingCard from "@/components/PlayingCard";
import Confetti from "@/components/Confetti";
import ParticleBackground from "@/components/ParticleBackground";
import {
  Spade,
  Crown,
  AlertCircle,
  Play,
  Users,
  Trophy,
  Wifi,
  WifiOff,
  LogOut,
  Bot,
  UserPlus,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function GamePage() {
  const params = useParams();
  const lobbyId = params.lobbyId as string;

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [bidInput, setBidInput] = useState(0);
  const [cardsPerPlayer, setCardsPerPlayer] = useState(5);
  const [playerLeftAlert, setPlayerLeftAlert] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const router = useRouter();

  const [userId, setUserId] = useState<number>(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const storedId = localStorage.getItem("user_id");
      if (storedId) {
        setUserId(Number(storedId));
        setIsReady(true);
      } else {
        router.push("/login");
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [router]);

  const handleStateUpdate = useCallback((state: GameState) => {
    setGameState(state);
    setError("");
  }, []);

  const handleError = useCallback((message: string) => {
    setError(message);
    setTimeout(() => setError(""), 4000);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const ws = connectToLobby(
      lobbyId,
      handleStateUpdate,
      handleError,
      () => setConnected(true),
      () => setConnected(false),
      undefined,
      (notification) => {
        setPlayerLeftAlert(`${notification.username} has left the game.`);
        setTimeout(() => setPlayerLeftAlert(""), 4000);
      }
    );
    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [lobbyId, handleStateUpdate, handleError, isReady]);

  useEffect(() => {
    if (gameState?.phase === "finished") {
      const timer = setTimeout(() => {
        setCardsPerPlayer((prev) => Math.max(1, prev - 1));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [gameState?.phase]);

  const TRUMP_SEQUENCE: Suit[] = ["HEARTS", "SPADES", "DIAMONDS", "CLUBS"];
  const nextTrumpSuit: Suit =
    !gameState || !gameState.trump_suit
      ? "HEARTS"
      : TRUMP_SEQUENCE[(TRUMP_SEQUENCE.indexOf(gameState.trump_suit) + 1) % TRUMP_SEQUENCE.length];

  const handleStartGame = () => {
    if (!wsRef.current) return;
    sendEvent(wsRef.current, {
      type: "START_GAME",
      payload: {
        cards_per_player: cardsPerPlayer,
        trump_suit: nextTrumpSuit,
      },
    });
  };

  const handleAddBot = () => {
    if (!wsRef.current) return;
    sendEvent(wsRef.current, {
      type: "ADD_BOT",
    });
  };

  const handleRemoveBot = (botId?: number) => {
    if (!wsRef.current) return;
    sendEvent(wsRef.current, {
      type: "REMOVE_BOT",
      payload: botId ? { bot_id: botId } : undefined,
    });
  };

  const handlePlaceBid = () => {
    if (!wsRef.current) return;
    sendEvent(wsRef.current, {
      type: "PLACE_BID",
      payload: { bid: bidInput },
    });
  };

  const handlePlayCard = (card: Card) => {
    if (!wsRef.current) return;
    sendEvent(wsRef.current, {
      type: "PLAY_CARD",
      payload: { card },
    });
  };

  // Helper: check if player is a bot (IDs -501 to -510)
  const isBotPlayer = (pid: number) => {
    if (pid >= -510 && pid <= -501) return true;
    const name = gameState?.player_names?.[pid];
    if (name?.includes("(Bot)")) return true;
    return false;
  };

  // Helper: get player display name
  const getPlayerName = (pid: number) => {
    if (pid === userId) return "You";
    const name = gameState?.player_names?.[pid];
    return name && name !== "Player" ? name : `P${pid}`;
  };

  // Determine if it's this player's turn
  const isMyTurn =
    gameState &&
    gameState.players[gameState.turn_index] === userId;

  // Get my hand
  const myHand = gameState?.hands?.[userId] || [];
  const maxBid = myHand.length > 0 ? myHand.length : (gameState?.cards_per_player || 1);

  useEffect(() => {
    if (bidInput > maxBid) {
      const timer = setTimeout(() => {
        setBidInput(maxBid);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [maxBid, bidInput]);

  const maxPlayers = gameState?.max_players || 4;

  // Calculate maximum possible cards based on player count (52 cards in a deck)
  const maxPossibleCards =
    gameState && gameState.players.length >= 2
      ? Math.floor(52 / gameState.players.length)
      : Math.floor(52 / maxPlayers);

  // Generate array [1, 2, ..., maxPossibleCards]
  const cardOptions = Array.from({ length: maxPossibleCards }, (_, i) => i + 1);

  // Clamp cardsPerPlayer if it exceeds maxPossibleCards
  useEffect(() => {
    if (cardsPerPlayer > maxPossibleCards) {
      const timer = setTimeout(() => {
        setCardsPerPlayer(maxPossibleCards);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [maxPossibleCards, cardsPerPlayer]);

  const isHost = gameState?.host_id === userId || !gameState?.host_id;

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#070a0f] flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-cyan-400"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a0f] text-slate-100 flex flex-col relative overflow-hidden">
      <ParticleBackground />

      {/* Top Navigation Bar */}
      <header className="w-full px-6 py-3.5 flex flex-wrap justify-between items-center bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 z-20 gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Spade className="w-4 h-4 text-cyan-400" fill="currentColor" />
            </div>
            <span className="font-heading font-bold text-slate-200 text-sm">
              Lobby:{" "}
              <span className="font-mono font-semibold tracking-wider text-cyan-300">{lobbyId}</span>
            </span>
          </div>

          {/* Cumulative Scores Standings Pill */}
          {gameState && gameState.players.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400 font-medium">Scores:</span>
              <div className="flex items-center gap-2.5 font-mono">
                {gameState.players.map((pid) => (
                  <span key={pid} className="text-slate-300 flex items-center gap-1">
                    {isBotPlayer(pid) && <Bot className="w-3 h-3 text-indigo-400 inline" />}
                    <span className="text-slate-200 font-bold">{getPlayerName(pid)}</span>:{" "}
                    <span className="text-cyan-400 font-semibold">{gameState.scores[pid] || 0}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {gameState && gameState.phase !== "waiting" && (
            <div className="badge bg-amber-500/15 text-amber-300 border border-amber-500/30 gap-1.5 badge-sm px-3 py-1.5 font-semibold">
              <Crown className="w-3 h-3 text-amber-400" />
              Trump: {getSuitSymbol(gameState.trump_suit)} {gameState.trump_suit}
            </div>
          )}
          <div
            className={`badge gap-1.5 badge-sm px-2.5 py-1 font-semibold ${
              connected 
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" 
                : "bg-red-500/15 text-red-300 border border-red-500/30"
            }`}
          >
            {connected ? (
              <Wifi className="w-3 h-3 text-emerald-400" />
            ) : (
              <WifiOff className="w-3 h-3 text-red-400" />
            )}
            {connected ? "Live" : "Offline"}
          </div>
          <button
            onClick={() => router.push('/')}
            className="btn btn-ghost btn-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-800 ml-1"
          >
            <LogOut className="w-4 h-4 md:mr-1.5" />
            <span className="hidden md:inline">Leave</span>
          </button>
        </div>
      </header>

      {/* Error / Alert Toasts */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="toast toast-top toast-center z-50"
          >
            <div className="alert alert-error shadow-xl error-shake">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </motion.div>
        )}
        
        {playerLeftAlert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="toast toast-middle toast-center z-50"
          >
            <div className="alert alert-warning shadow-2xl glass border border-warning/50">
              <AlertCircle className="w-6 h-6" />
              <span className="font-bold text-lg">{playerLeftAlert}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        {/* ======================== */}
        {/* WAITING PHASE */}
        {/* ======================== */}
        {(!gameState || gameState.phase === "waiting") && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-3xl w-full max-w-lg p-8 border border-white/10 bg-slate-950/85 shadow-2xl backdrop-blur-xl"
          >
            <div className="text-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-5 border border-cyan-500/30 shadow-lg shadow-cyan-500/10"
              >
                <Users className="w-8 h-8 text-cyan-400" />
              </motion.div>
              <h2 className="font-heading text-3xl font-bold text-gradient-hero mb-2">
                Waiting for Players
              </h2>
              <p className="text-slate-400 text-sm mb-6 font-medium">
                {gameState
                  ? `${gameState.players.length} player(s) in room (${
                      maxPlayers === 2 ? "2 needed" : `2 to ${maxPlayers} needed`
                    })`
                  : "Connecting to server..."}
              </p>

              {/* Connected player names & bots */}
              {gameState && gameState.players.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2.5 mb-6">
                  {gameState.players.map((pid) => {
                    const isBot = isBotPlayer(pid);
                    return (
                      <motion.div
                        key={pid}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`px-3.5 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 shadow-md border ${
                          isBot
                            ? "bg-indigo-950/60 border-indigo-500/40 text-indigo-300"
                            : "bg-slate-900 border-slate-700/80 text-slate-200"
                        }`}
                      >
                        {isBot ? (
                          <Bot className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                        <span>{getPlayerName(pid)}</span>

                        {isHost && isBot && (
                          <button
                            onClick={() => handleRemoveBot(pid)}
                            title="Remove bot"
                            className="hover:text-red-400 ml-1 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Add Bot Controls (Host only) */}
              {isHost && gameState && gameState.players.length < maxPlayers && (
                <div className="flex justify-center mb-6">
                  <button
                    onClick={handleAddBot}
                    className="btn btn-sm btn-outline border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/15 hover:border-indigo-400 gap-1.5 rounded-xl font-medium"
                  >
                    <UserPlus className="w-4 h-4 text-indigo-400" /> Add AI Bot
                  </button>
                </div>
              )}

              {/* Match Settings */}
              <div className="grid grid-cols-2 gap-4 w-full mb-8 text-left">
                <div className="w-full">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Cards Per Player
                  </label>
                  <select
                    className="select select-bordered select-sm w-full bg-slate-900 border-slate-700 text-slate-100 focus:border-cyan-400"
                    value={cardsPerPlayer}
                    onChange={(e) =>
                      setCardsPerPlayer(Number(e.target.value))
                    }
                  >
                    {cardOptions.map((n) => (
                      <option key={n} value={n}>
                        {n} Cards
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-full">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Trump Sequence
                  </label>
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs">
                    <span className="font-semibold text-rose-400">♥ Heart</span>
                    <span className="text-slate-600">→</span>
                    <span className="font-semibold text-slate-300">♠ Spade</span>
                    <span className="text-slate-600">→</span>
                    <span className="font-semibold text-amber-400">♦ Diamond</span>
                    <span className="text-slate-600">→</span>
                    <span className="font-semibold text-emerald-400">♣ Clover</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Round 1 starts on Hearts, alternating each round</span>
                </div>
              </div>

              {/* Host Start Game Action */}
              {isHost ? (
                <button
                  onClick={handleStartGame}
                  disabled={!gameState || gameState.players.length < 2 || gameState.players.length > maxPlayers}
                  className="btn bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-base w-full py-3.5 rounded-xl shadow-xl shadow-cyan-500/20 border-none transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 fill-slate-950" /> Start Game
                </button>
              ) : (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-400 text-center font-medium">
                  Waiting for host to launch match...
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ======================== */}
        {/* BIDDING PHASE */}
        {/* ======================== */}
        {gameState && gameState.phase === "bidding" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-3xl"
          >
            {/* Info Bar */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-heading font-bold text-gradient-hero">
                  Bidding Phase
                </h2>
                <p className="text-xs text-slate-400">Predict the exact tricks you will win</p>
              </div>
              <div
                className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  isMyTurn
                    ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 font-extrabold animate-pulse"
                    : "bg-slate-900 text-slate-400 border border-slate-700"
                }`}
              >
                {isMyTurn ? "Your Turn to Bid" : "Waiting for opponent..."}
              </div>
            </div>

            {/* Bids So Far */}
            <div className="flex gap-3 mb-6 flex-wrap">
              {gameState.players.map((pid) => {
                const isActive = gameState.players[gameState.turn_index] === pid;
                const bid = gameState.bids[pid];
                const totalScore = gameState.scores[pid] || 0;
                const isBot = isBotPlayer(pid);
                return (
                  <motion.div
                    key={pid}
                    layout
                    className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 border shadow-md ${
                      pid === userId
                        ? "bg-cyan-950/40 text-cyan-300 border-cyan-500/40"
                        : isActive
                        ? "bg-indigo-950/60 text-indigo-300 border-indigo-500/50 animate-pulse"
                        : "bg-slate-900/90 text-slate-300 border-slate-800"
                    }`}
                  >
                    {isBot && <Bot className="w-3.5 h-3.5 text-indigo-400" />}
                    <span className="font-bold">{getPlayerName(pid)}</span>
                    <span className="text-slate-600">•</span>
                    <span>Bid: <strong className="text-white font-mono text-sm">{bid !== undefined ? bid : "?"}</strong></span>
                    <span className="text-slate-600">•</span>
                    <span>Score: <strong className="text-amber-400 font-mono text-sm">{totalScore} pts</strong></span>
                  </motion.div>
                );
              })}
            </div>

            {/* Bid Input */}
            {isMyTurn && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl p-6 mb-6 border border-cyan-500/30 bg-slate-950/90"
              >
                <div className="flex items-center gap-5">
                  <span className="text-cyan-300 text-sm font-semibold uppercase tracking-wider">Your Bid:</span>
                  <input
                    type="range"
                    min={0}
                    max={maxBid}
                    value={bidInput}
                    onChange={(e) => setBidInput(Number(e.target.value))}
                    className="range range-accent flex-1 range-sm accent-cyan-400"
                  />
                  <span className="text-3xl font-heading font-extrabold text-cyan-400 w-12 text-center font-mono">
                    {bidInput}
                  </span>
                  <button
                    onClick={handlePlaceBid}
                    className="btn bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold px-6 shadow-lg shadow-cyan-500/20 border-none"
                  >
                    Place Bid
                  </button>
                </div>
              </motion.div>
            )}

            {/* My Hand */}
            <div className="hand-fan justify-center mt-4">
              {myHand.map((card) => (
                <PlayingCard
                  key={`${card.suit}-${card.rank}`}
                  card={card}
                  disabled
                  trumpSuit={gameState.trump_suit}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ======================== */}
        {/* PLAYING PHASE */}
        {/* ======================== */}
        {gameState && gameState.phase === "playing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-4xl"
          >
            {/* Info Bar */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-heading font-bold text-gradient-hero">
                  Card Arena
                </h2>
                <p className="text-xs text-slate-400">Trick-taking active</p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="badge badge-outline border-amber-500/40 text-amber-300 gap-1.5 badge-sm px-3 py-1 font-semibold">
                  <Crown className="w-3 h-3 text-amber-400" />
                  Trump: {getSuitSymbol(gameState.trump_suit)}
                </div>
                <div
                  className={`px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    isMyTurn
                      ? "bg-cyan-400 text-slate-950 shadow-md font-extrabold animate-pulse"
                      : "bg-slate-900 text-slate-400 border border-slate-700"
                  }`}
                >
                  {isMyTurn ? "Your Turn" : "Waiting..."}
                </div>
              </div>
            </div>

            {/* Scoreboard / Players Dashboard */}
            <div className="flex gap-3 mb-5 flex-wrap">
              {gameState.players.map((pid) => {
                const tricksWon = gameState.tricks_won[pid] || 0;
                const bid = gameState.bids[pid] || 0;
                const isActive = gameState.players[gameState.turn_index] === pid;
                const metBid = tricksWon === bid && bid !== 0;
                const isBot = isBotPlayer(pid);

                return (
                  <motion.div
                    key={pid}
                    layout
                    className={`glass-card rounded-xl px-4 py-3 min-w-32 bg-slate-950/80 border transition-all ${
                      isActive 
                        ? "border-cyan-400 ring-2 ring-cyan-400/30" 
                        : metBid 
                        ? "border-emerald-500/40" 
                        : "border-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                        {isBot && <Bot className="w-3 h-3 text-indigo-400" />}
                        {getPlayerName(pid)}
                      </span>
                      {pid === gameState.last_trick_winner && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          Won Last
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-heading font-extrabold text-slate-100 font-mono">
                        {tricksWon}
                      </span>
                      <span className="text-slate-400 text-xs">/ {bid} tricks</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-400 mt-1.5 pt-1 border-t border-slate-800 flex justify-between items-center">
                      <span>Total:</span>
                      <span className="font-mono font-bold text-amber-400">{gameState.scores[pid] || 0} pts</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Trick Arena (Modern Center Table - Non-Casino) */}
            <div className="card-arena rounded-3xl p-8 mb-8 min-h-72 flex items-center justify-center gap-5 relative overflow-hidden">
                {gameState.current_trick.length > 0 ? (
                  gameState.current_trick.map((play) => (
                    <motion.div
                      key={`play-${play.card.suit}-${play.card.rank}`}
                      initial={{ opacity: 0, scale: 0.5, y: -40 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5, y: 40 }}
                      className="flex flex-col items-center gap-2 z-10"
                    >
                      <PlayingCard card={play.card} small trumpSuit={gameState.trump_suit} />
                      <span className="badge badge-sm bg-slate-900 border-slate-700 text-slate-300 font-medium">
                        {getPlayerName(play.player_id)}
                      </span>
                    </motion.div>
                  ))
                ) : gameState.last_trick && gameState.last_trick.length > 0 ? (
                  gameState.last_trick.map((play) => (
                    <motion.div
                      key={`last-${play.card.suit}-${play.card.rank}`}
                      initial={{ opacity: 1, scale: 1 }}
                      animate={{
                        opacity: 0,
                        scale: 0,
                        y: 80,
                      }}
                      transition={{ duration: 1.2, delay: 0.4, ease: "easeInOut" }}
                      className="flex flex-col items-center gap-2"
                    >
                      <PlayingCard card={play.card} small trumpSuit={gameState.trump_suit} />
                      <span
                        className={`badge badge-sm ${
                          play.player_id === gameState.last_trick_winner
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : "bg-slate-900 text-slate-400 border-slate-800"
                        }`}
                      >
                        {getPlayerName(play.player_id)}
                      </span>
                    </motion.div>
                  ))
                ) : (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-slate-500 text-base font-heading font-medium tracking-wide"
                  >
                    {isMyTurn ? "Lead the trick!" : "Waiting for lead play..."}
                  </motion.p>
                )}
            </div>

            {/* My Hand Fan */}
            <div className="hand-fan justify-center">
                {myHand.map((card, i) => (
                  <motion.div
                    key={`${card.suit}-${card.rank}`}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="relative"
                  >
                    <PlayingCard
                      card={card}
                      onClick={() => handlePlayCard(card)}
                      disabled={!isMyTurn}
                      trumpSuit={gameState.trump_suit}
                    />
                  </motion.div>
                ))}
            </div>
          </motion.div>
        )}

        {/* ======================== */}
        {/* ROUND FINISHED PHASE */}
        {/* ======================== */}
        {gameState && gameState.phase === "finished" && (
          <>
            <Confetti trigger={true} count={60} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              className="glass-card rounded-2xl w-full max-w-lg p-8 border border-white/10"
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.08, 1] }}
                  transition={{ duration: 1, delay: 0.3 }}
                >
                  <Trophy className="w-14 h-14 text-amber-400 mx-auto mb-4 drop-shadow-lg" />
                </motion.div>
                <h2 className="font-heading text-3xl font-bold text-gradient-hero mb-6">
                  Round Over!
                </h2>

                <div className="overflow-x-auto w-full mb-6">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="text-slate-400">Player</th>
                        <th className="text-slate-400">Bid</th>
                        <th className="text-slate-400">Won</th>
                        <th className="text-slate-400">Result</th>
                        <th className="text-slate-400">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gameState.players.map((pid) => {
                        const bid = gameState.bids[pid] ?? 0;
                        const won = gameState.tricks_won[pid] || 0;
                        const success = bid === won;
                        return (
                          <tr
                            key={pid}
                            className={pid === userId ? "bg-cyan-500/10 font-medium" : ""}
                          >
                            <td className="font-semibold text-slate-200">{getPlayerName(pid)}</td>
                            <td>{bid}</td>
                            <td>{won}</td>
                            <td>
                              {success ? (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Met (+{10+bid})</span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">Failed (0)</span>
                              )}
                            </td>
                            <td className="font-heading font-bold text-lg text-cyan-300 font-mono">
                              {gameState.scores[pid] || 0}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {gameState.host_id === userId ? (
                  <button
                    onClick={handleStartGame}
                    className="btn bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold btn-lg w-full rounded-xl shadow-lg shadow-cyan-500/20 border-none flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5 fill-slate-950" /> Play Next Round ({getSuitSymbol(nextTrumpSuit)} {nextTrumpSuit})
                  </button>
                ) : (
                  <p className="text-sm text-slate-400 mt-4">Waiting for table host to start next round...</p>
                )}
              </div>
            </motion.div>
          </>
        )}

        {/* ======================== */}
        {/* GAME OVER PHASE */}
        {/* ======================== */}
        {gameState && gameState.phase === "gameOver" && (
          <>
            <Confetti trigger={true} count={200} duration={5000} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              className="glass-card rounded-3xl w-full max-w-2xl p-10 border border-cyan-500/30 shadow-2xl text-center"
            >
              <div>
                <motion.div
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Trophy className="w-20 h-20 text-amber-400 mx-auto mb-6 drop-shadow-2xl" />
                </motion.div>
                
                <h1 className="font-heading text-5xl font-extrabold text-gradient-hero mb-2 uppercase tracking-widest">
                  Game Over
                </h1>
                <p className="text-slate-400 mb-10 text-base">Final Tournament Standings</p>

                <div className="flex flex-col gap-3.5 w-full max-w-md mx-auto mb-10">
                  {[...gameState.players]
                    .sort((a, b) => (gameState.scores[b] || 0) - (gameState.scores[a] || 0))
                    .map((pid, index) => (
                      <motion.div
                        key={pid}
                        initial={{ opacity: 0, x: -40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.15 }}
                        className={`flex items-center justify-between p-4 rounded-xl border ${
                          index === 0
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-200"
                            : index === 1
                            ? "bg-slate-800/40 border-slate-700/60"
                            : index === 2
                            ? "bg-slate-900/40 border-slate-800/60"
                            : "bg-slate-950/30 border-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0 ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-300"
                          }`}>
                            #{index + 1}
                          </div>
                          <span className={`font-heading text-base ${index === 0 ? "font-bold text-amber-300" : "font-medium"}`}>
                            {getPlayerName(pid)} {pid === userId && "(You)"}
                          </span>
                        </div>
                        <div className={`font-heading text-2xl font-black font-mono ${index === 0 ? "text-amber-400" : "text-slate-200"}`}>
                          {gameState.scores[pid] || 0} pts
                        </div>
                      </motion.div>
                    ))}
                </div>

                {/* Guest Conversion Banner */}
                {typeof window !== "undefined" && localStorage.getItem("is_guest") === "true" && (
                  <div className="mt-6 mb-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-center max-w-md mx-auto">
                    <p className="text-sm text-cyan-200 font-medium mb-2">
                      Enjoyed your match? Sign up to track your permanent win/loss stats!
                    </p>
                    <Link
                      href="/register"
                      className="btn btn-sm bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-heading font-semibold border-none"
                    >
                      Create Free Account
                    </Link>
                  </div>
                )}

                <Link
                  href="/"
                  className="btn btn-outline border-slate-700 text-slate-300 hover:bg-slate-800 btn-lg w-full max-w-xs mx-auto rounded-xl"
                >
                  Back to Home
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
