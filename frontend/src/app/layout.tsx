import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Judgement — Premium Card Game",
  description:
    "The ultimate multiplayer trick-taking card game. Bid wisely, play sharp, outsmart your opponents. Built with Go & Next.js.",
  keywords: ["card game", "judgement", "multiplayer", "trick-taking", "websocket"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="luxury" style={{ fontSize: "125%" }}>
      <body
        className={`${outfit.variable} ${inter.variable} min-h-screen bg-base-100 font-sans antialiased`}
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
