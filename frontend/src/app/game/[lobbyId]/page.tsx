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
  const [trumpSuit, setTrumpSuit] = useState<Suit>("SPADES");
  const [playerLeftAlert, setPlayerLeftAlert] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const router = useRouter();

  const [userId, setUserId] = useState<number>(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const storedId = localStorage.getItem("user_id");
    if (storedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserId(Number(storedId));
      setIsReady(true);
    } else {
      router.push("/login");
    }
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCardsPerPlayer((prev) => Math.max(1, prev - 1));
    }
  }, [gameState?.phase]);

  const handleStartGame = () => {
    if (!wsRef.current) return;
    sendEvent(wsRef.current, {
      type: "START_GAME",
      payload: {
        cards_per_player: cardsPerPlayer,
        trump_suit: trumpSuit,
      },
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBidInput(maxBid);
    }
  }, [maxBid, bidInput]);

  const allSuits: Suit[] = ["SPADES", "HEARTS", "DIAMONDS", "CLUBS"];

  // Calculate maximum possible cards based on player count (52 cards in a deck)
  // If only 1 player is in the lobby so far, assume at least 2 players will play (max 26 cards)
  const maxPossibleCards =
    gameState && gameState.players.length >= 2
      ? Math.floor(52 / gameState.players.length)
      : 26;

  // Generate array [1, 2, ..., maxPossibleCards]
  const cardOptions = Array.from({ length: maxPossibleCards }, (_, i) => i + 1);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#091410] text-slate-100 flex flex-col relative overflow-hidden">
      <ParticleBackground />
      {/* Top Bar */}
      <div className="w-full px-6 py-3.5 flex flex-wrap justify-between items-center bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 z-20 gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Spade className="w-5 h-5 text-amber-400" fill="currentColor" />
            <span className="font-heading font-bold text-amber-300 text-sm">
              Lobby:{" "}
              <span className="font-mono tracking-wider text-slate-200">{lobbyId}</span>
            </span>
          </div>

          {/* Cumulative Scores Standings Pill */}
          {gameState && gameState.players.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400 font-medium">Scores:</span>
              <div className="flex items-center gap-2 font-mono">
                {gameState.players.map((pid) => (
                  <span key={pid} className="text-slate-200">
                    <span className="text-amber-300 font-bold">{getPlayerName(pid)}</span>:{" "}
                    <span className="text-emerald-400 font-semibold">{gameState.scores[pid] || 0} pts</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {gameState && gameState.phase !== "waiting" && (
            <div className="badge bg-amber-500/20 text-amber-300 border border-amber-400/30 gap-1 badge-sm px-2.5 py-1 font-semibold">
              <Crown className="w-3 h-3 text-amber-400" />
              Trump: {getSuitSymbol(gameState.trump_suit)}
            </div>
          )}
          <div
            className={`badge gap-1 badge-sm px-2.5 py-1 font-semibold ${
              connected 
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" 
                : "bg-red-500/20 text-red-300 border border-red-500/40"
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
            className="btn btn-ghost btn-sm text-red-400 hover:bg-red-500/10 border border-red-500/20 ml-2"
          >
            <LogOut className="w-4 h-4 md:mr-1.5" />
            <span className="hidden md:inline">Leave</span>
          </button>
        </div>
      </div>

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
            className="glass-card rounded-3xl w-full max-w-lg p-8 border border-amber-400/30 bg-slate-950/90 shadow-2xl backdrop-blur-xl"
          >
            <div className="text-center">
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-16 h-16 rounded-2xl bg-amber-400/10 flex items-center justify-center mx-auto mb-5 border border-amber-400/30 shadow-lg shadow-amber-500/10"
              >
                <Users className="w-8 h-8 text-amber-300" />
              </motion.div>
              <h2 className="font-heading text-3xl font-bold text-gradient-gold mb-2">
                Waiting for Players
              </h2>
              <p className="text-slate-300 text-sm mb-6 font-medium">
                {gameState
                  ? `${gameState.players.length} player(s) in lobby`
                  : "Connecting to server..."}
              </p>

              {/* Connected player names */}
              {gameState && gameState.players.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  {gameState.players.map((pid) => (
                    <motion.div
                      key={pid}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="px-3.5 py-1.5 rounded-full bg-slate-900 border border-emerald-500/40 text-emerald-300 text-sm font-semibold flex items-center gap-2 shadow-md"
                    >
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {getPlayerName(pid)}
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 w-full mb-8 text-left">
                <div className="w-full">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-300 mb-2">
                    Cards Per Player
                  </label>
                  <select
                    className="select select-bordered select-sm w-full bg-slate-900 border-slate-700 text-slate-100 focus:border-amber-400"
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-2">
                    Trump Suit
                  </label>
                  <select
                    className="select select-bordered select-sm w-full bg-slate-900 border-slate-700 text-slate-100 focus:border-emerald-400"
                    value={trumpSuit}
                    onChange={(e) => setTrumpSuit(e.target.value as Suit)}
                  >
                    {allSuits.map((s) => (
                      <option key={s} value={s}>
                        {getSuitSymbol(s)} {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Only host can start the game */}
              {gameState?.host_id === userId || !gameState?.host_id ? (
                <button
                  onClick={handleStartGame}
                  className="btn bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-base w-full py-3.5 rounded-xl shadow-xl shadow-amber-500/20 border-none transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 fill-slate-950" /> Start Game
                </button>
              ) : (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-300 text-center font-medium">
                  Waiting for table host to start the game...
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
              <h2 className="text-2xl font-heading font-bold text-gradient-gold">
                Bidding Phase
              </h2>
              <div
                className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  isMyTurn
                    ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 font-extrabold animate-pulse"
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
                return (
                  <motion.div
                    key={pid}
                    layout
                    className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border shadow-md ${
                      pid === userId
                        ? "bg-amber-400/20 text-amber-300 border-amber-400/40"
                        : isActive
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 animate-pulse"
                        : "bg-slate-900 text-slate-300 border-slate-800"
                    }`}
                  >
                    <span className="font-bold">{getPlayerName(pid)}</span>
                    <span className="text-slate-500">•</span>
                    <span>Bid: <strong className="text-white font-mono text-sm">{bid !== undefined ? bid : "?"}</strong></span>
                    <span className="text-slate-500">•</span>
                    <span>Total Score: <strong className="text-amber-400 font-mono text-sm">{totalScore} pts</strong></span>
                  </motion.div>
                );
              })}
            </div>

            {/* Bid Input */}
            {isMyTurn && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl p-6 mb-6 border border-amber-400/30 bg-slate-950/90"
              >
                <div className="flex items-center gap-4">
                  <span className="text-amber-300 text-sm font-semibold uppercase tracking-wider">Your Bid:</span>
                  <input
                    type="range"
                    min={0}
                    max={maxBid}
                    value={bidInput}
                    onChange={(e) => setBidInput(Number(e.target.value))}
                    className="range range-warning flex-1 range-sm"
                  />
                  <span className="text-3xl font-heading font-extrabold text-amber-400 w-12 text-center">
                    {bidInput}
                  </span>
                  <button
                    onClick={handlePlaceBid}
                    className="btn bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-6 shadow-lg shadow-amber-500/20 border-none"
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
              <h2 className="text-2xl font-heading font-bold text-gradient-gold">
                Playing Phase
              </h2>
              <div className="flex gap-2">
                <div className="badge badge-warning gap-1 badge-sm">
                  <Crown className="w-3 h-3" />
                  Trump: {getSuitSymbol(gameState.trump_suit)}
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    isMyTurn
                      ? "bg-amber-400 text-slate-950 shadow-md font-extrabold animate-pulse"
                      : "bg-slate-900 text-slate-400 border border-slate-700"
                  }`}
                >
                  {isMyTurn ? "Your Turn" : "Waiting..."}
                </div>
              </div>
            </div>

            {/* Scoreboard */}
            <div className="flex gap-3 mb-5 flex-wrap">
              {gameState.players.map((pid) => {
                const tricksWon = gameState.tricks_won[pid] || 0;
                const bid = gameState.bids[pid] || 0;
                const isActive = gameState.players[gameState.turn_index] === pid;
                const metBid = tricksWon >= bid && bid !== 0;

                return (
                  <motion.div
                    key={pid}
                    layout
                    className={`glass-card rounded-xl px-4 py-3 min-w-[120px] bg-slate-950/80 border ${
                      isActive 
                        ? "border-emerald-400 ring-2 ring-emerald-400/40 animate-pulse" 
                        : metBid 
                        ? "border-emerald-500/40" 
                        : "border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-200">
                        {getPlayerName(pid)}
                      </span>
                      {pid === gameState.last_trick_winner && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">Trick Won</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-heading font-extrabold text-amber-300">
                        {tricksWon}
                      </span>
                      <span className="text-slate-400 text-xs">/ {bid} tricks</span>
                    </div>
                    <div className="text-xs font-semibold text-emerald-400 mt-1.5 pt-1 border-t border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400 font-normal">Score:</span>
                      <span className="font-mono font-bold text-amber-300">{gameState.scores[pid] || 0} pts</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Trick Pile (Center Table) */}
            <div className="game-table casino-table rounded-3xl p-8 mb-8 min-h-[300px] flex items-center justify-center gap-4 relative overflow-hidden">
                {gameState.current_trick.length > 0 ? (
                  gameState.current_trick.map((play) => (
                    <motion.div
                      key={`play-${play.card.suit}-${play.card.rank}`}
                      initial={{ opacity: 0, scale: 0.5, y: -50 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5, y: 50 }}
                      className="flex flex-col items-center gap-2 z-10"
                    >
                      <PlayingCard card={play.card} small trumpSuit={gameState.trump_suit} />
                      <span className="badge badge-sm badge-neutral">
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
                        y: 100,
                      }}
                      transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
                      className="flex flex-col items-center gap-2"
                    >
                      <PlayingCard card={play.card} small trumpSuit={gameState.trump_suit} />
                      <span
                        className={`badge badge-sm ${
                          play.player_id === gameState.last_trick_winner
                            ? "badge-success"
                            : "badge-neutral"
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
                    className="text-base-content/25 text-lg font-heading font-medium tracking-wide"
                  >
                    {isMyTurn ? "Lead the trick!" : "Waiting for lead..."}
                  </motion.p>
                )}
            </div>

            {/* My Hand */}
            <div className="hand-fan justify-center">
                {myHand.map((card, i) => (
                  <motion.div
                    key={`${card.suit}-${card.rank}`}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
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
        {/* FINISHED PHASE */}
        {/* ======================== */}
        {gameState && gameState.phase === "finished" && (
          <>
            <Confetti trigger={true} count={60} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              className="glass-card rounded-2xl w-full max-w-lg p-8"
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, delay: 0.3 }}
                >
                  <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4 drop-shadow-lg" />
                </motion.div>
                <h2 className="font-heading text-3xl font-bold text-gradient-gold mb-6">
                  Round Over!
                </h2>

                <div className="overflow-x-auto w-full mb-6">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="text-base-content/50">Player</th>
                        <th className="text-base-content/50">Bid</th>
                        <th className="text-base-content/50">Won</th>
                        <th className="text-base-content/50">Result</th>
                        <th className="text-base-content/50">Score</th>
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
                            className={pid === userId ? "bg-primary/10" : ""}
                          >
                            <td className="font-medium">{getPlayerName(pid)}</td>
                            <td>{bid}</td>
                            <td>{won}</td>
                            <td>
                              {success ? (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Met</span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/40">Failed</span>
                              )}
                            </td>
                            <td className="font-heading font-bold text-lg">
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
                    className="btn btn-primary btn-lg shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow"
                  >
                    <Play className="w-4 h-4" /> Play Next Round
                  </button>
                ) : (
                  <p className="text-sm text-base-content/50 mt-4">Waiting for host to start next round...</p>
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
              className="glass-card rounded-3xl w-full max-w-2xl p-10 border-2 border-primary/20 shadow-2xl shadow-primary/10 text-center"
            >
              <div>
                <motion.div
                  animate={{ y: [0, -20, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-6 drop-shadow-2xl" />
                </motion.div>
                
                <h1 className="font-heading text-5xl font-extrabold text-gradient-gold mb-2 uppercase tracking-widest">
                  Game Over
                </h1>
                <p className="text-base-content/60 mb-10 text-lg">Final Standings</p>

                <div className="flex flex-col gap-4 w-full max-w-md mx-auto mb-10">
                  {/* Sort players by score descending */}
                  {[...gameState.players]
                    .sort((a, b) => (gameState.scores[b] || 0) - (gameState.scores[a] || 0))
                    .map((pid, index) => (
                      <motion.div
                        key={pid}
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.2 }}
                        className={`flex items-center justify-between p-4 rounded-xl border ${
                          index === 0
                            ? "bg-yellow-500/20 border-yellow-500/50"
                            : index === 1
                            ? "bg-gray-300/10 border-gray-400/30"
                            : index === 2
                            ? "bg-amber-700/10 border-amber-700/30"
                            : "bg-base-200/30 border-base-300/50"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            index === 0 ? "bg-yellow-500 text-black" : "bg-base-300"
                          }`}>
                            #{index + 1}
                          </div>
                          <span className={`font-heading text-lg ${index === 0 ? "font-bold text-yellow-500" : "font-medium"}`}>
                            {getPlayerName(pid)} {pid === userId && "(You)"}
                          </span>
                        </div>
                        <div className={`font-heading text-2xl font-black ${index === 0 ? "text-yellow-500" : ""}`}>
                          {gameState.scores[pid] || 0}
                        </div>
                      </motion.div>
                    ))}
                </div>

                {/* Guest Conversion Banner - ONLY on Final Standings */}
                {typeof window !== "undefined" && localStorage.getItem("is_guest") === "true" && (
                  <div className="mt-6 mb-6 p-4 rounded-xl bg-amber-400/10 border border-amber-400/30 text-center max-w-md mx-auto">
                    <p className="text-sm text-amber-200 font-medium mb-2">
                      💡 Enjoyed your match? Sign up to save your win/loss stats!
                    </p>
                    <Link
                      href="/register"
                      className="btn btn-accent btn-sm gap-1 font-heading"
                    >
                      Create Account & Save Stats
                    </Link>
                  </div>
                )}

                <a
                  href="/"
                  className="btn btn-outline btn-lg w-full max-w-xs mx-auto"
                >
                  Back to Home
                </a>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
