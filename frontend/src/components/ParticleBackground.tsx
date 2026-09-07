"use client";

export default function ParticleBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {/* Deep Midnight Obsidian Canvas */}
      <div className="absolute inset-0 bg-linear-to-b from-[#070a0f] via-[#0b0f19] to-[#05070a]" />

      {/* Subtle Indigo / Cyan Ambient Atmosphere */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-200 h-112.5 bg-indigo-500/10 blur-[150px] rounded-full" />
      <div className="absolute top-1/3 -left-40 w-125 h-125 bg-cyan-500/8 blur-[160px] rounded-full" />
      <div className="absolute bottom-0 -right-40 w-150 h-125 bg-indigo-600/10 blur-[160px] rounded-full" />

      {/* Modern Micro Grid Dot Matrix */}
      <div 
        className="absolute inset-0 opacity-[0.035]" 
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />
    </div>
  );
}
