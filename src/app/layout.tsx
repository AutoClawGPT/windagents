import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WindAgents — Aeolian Forge for Solana Agents",
  description:
    "3D tokenized meme-coin agent platform. Register humans & Ed25519 agents. ClawPump MCP, PayBox, Jupiter, Helius — your keys, real calls.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Sora:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
