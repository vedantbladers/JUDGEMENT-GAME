"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Legacy dashboard page — redirect everything to the main home page
export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#091410] flex items-center justify-center">
      <span className="loading loading-spinner loading-lg text-amber-400"></span>
    </div>
  );
}
