"use client";

export default function ParticleBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {/* Deep Obsidian Dark Mesh Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#090d10] via-[#07120e] to-[#05080b]" />

      {/* Subtle Radial Ambient Lighting */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-emerald-500/8 blur-[140px] rounded-full" />
      <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-amber-500/5 blur-[160px] rounded-full" />
      <div className="absolute bottom-0 -right-40 w-[600px] h-[500px] bg-emerald-600/8 blur-[150px] rounded-full" />

      {/* Micro Radial Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]" 
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />
    </div>
  );
}
