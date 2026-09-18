import { SKILL_MD } from "@/lib/skill-md";
import {
  SKILL_MD_APPEND,
  SKILL_MD_APPEND_FIX_PASS,
  SKILL_MD_APPEND_SKILLS_LAUNCH,
  SKILL_MD_APPEND_GAP_PASS,
  SKILL_MD_APPEND_SETTINGS_TABS,
  SKILL_MD_APPEND_LAUNCH_PARITY,
  SKILL_MD_APPEND_AGENTS_DESK,
  SKILL_MD_APPEND_SPLIT_DESKS,
  SKILL_MD_APPEND_TOKENIZE_PARITY,
  SKILL_MD_APPEND_TWITTER_VERIFY,
} from "@/lib/skill-md-append";
import { NextRequest } from "next/server";

/** Rewrite localhost base URLs to production APP URL / request origin (content untouched). */
function withPublicBase(body: string, base: string): string {
  const trimmed = base.replace(/\/$/, "");
  return body
    .replaceAll("http://localhost:3000", trimmed)
    .replaceAll("https://localhost:3000", trimmed);
}

export async function GET(req: NextRequest) {
  const envBase = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const origin = req.nextUrl?.origin;
  const base =
    (envBase && envBase.length > 0 ? envBase : null) ||
    origin ||
    "http://localhost:3000";

  const raw =
    SKILL_MD +
    "\n\n" +
    SKILL_MD_APPEND +
    SKILL_MD_APPEND_FIX_PASS +
    SKILL_MD_APPEND_SKILLS_LAUNCH +
    SKILL_MD_APPEND_GAP_PASS +
    SKILL_MD_APPEND_SETTINGS_TABS +
    SKILL_MD_APPEND_LAUNCH_PARITY +
    SKILL_MD_APPEND_AGENTS_DESK +
    SKILL_MD_APPEND_SPLIT_DESKS +
    SKILL_MD_APPEND_TOKENIZE_PARITY +
    SKILL_MD_APPEND_TWITTER_VERIFY;

  const body = withPublicBase(raw, base);

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
