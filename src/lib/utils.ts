import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/** Project token mints — set via env; never hardcode competitor brands as official. */
export function projectMints() {
  return {
    WIND: process.env.NEXT_PUBLIC_WIND_MINT || process.env.WIND_MINT || null,
    AGENT: process.env.NEXT_PUBLIC_AGENT_MINT || process.env.AGENT_MINT || null,
  };
}

export function jsonError(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return Response.json({ error: message, ...extra }, { status });
}

export function connectKeyError(service: string, hint: string) {
  return Response.json(
    {
      error: `connect_your_own_key`,
      service,
      message: `No ${service} credentials configured. Connect your own key in Settings.`,
      hint,
    },
    { status: 401 }
  );
}
