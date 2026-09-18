"use client";

import { useRef, useState } from "react";
import type { Agent3DHandle } from "./agent-3d-types";
import { ANIMATION_CLIPS, AVATAR_CATALOG, type AvatarCatalogEntry } from "@/lib/avatar-catalog";

type Tab = "stage" | "clips" | "avatars" | "eye";

type Props = {
  avatarRef: React.RefObject<Agent3DHandle | null>;
  isOwner: boolean;
  currentBodyUrl?: string | null;
  onSelectAvatar?: (entry: AvatarCatalogEntry) => void | Promise<void>;
  busy?: boolean;
};

export function VisionDesk({
  avatarRef,
  isOwner,
  currentBodyUrl,
  onSelectAvatar,
  busy,
}: Props) {
  const [tab, setTab] = useState<Tab>("clips");
  const [clipMsg, setClipMsg] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const seqRef = useRef(0);

  async function play(clipId: string) {
    const h = avatarRef.current;
    if (!h) {
      setClipMsg("Avatar not ready");
      return;
    }
    const seq = ++seqRef.current;
    setPlaying(clipId);
    setClipMsg(`Playing ${clipId}…`);
    try {
      // Always go through playClip so alias/hint fallbacks run (wave included)
      await h.playClip(clipId, { userInitiated: true, fade_ms: 350 });
      if (seq !== seqRef.current) return;
      setClipMsg(`✓ ${clipId}`);
    } catch (err) {
      if (seq !== seqRef.current) return;
      // Soft UX: mood pulse so the desk never feels dead on missing clips
      try {
        if (clipId === "wave") await h.wave({ style: "enthusiastic" });
        else if (clipId === "celebrate" || clipId === "dance" || clipId === "thriller") {
          h.setMood(0.75, 0.65);
          setClipMsg(`✓ ${clipId} (mood pulse — clip missing on body)`);
          return;
        } else {
          throw err;
        }
        setClipMsg(`✓ ${clipId} (fallback)`);
      } catch (err2) {
        setClipMsg(err2 instanceof Error ? err2.message : "Clip failed");
      }
    } finally {
      if (seq === seqRef.current) setPlaying(null);
    }
  }

  async function lookCamera() {
    const h = avatarRef.current;
    if (!h) return;
    try {
      await h.lookAt("camera");
      setClipMsg("Looking at camera");
    } catch (err) {
      setClipMsg(err instanceof Error ? err.message : "lookAt unavailable");
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "stage", label: "Stage" },
    { id: "clips", label: "Clips" },
    { id: "avatars", label: "Avatars" },
    { id: "eye", label: "Eye" },
  ];

  return (
    <div className="glass rounded-2xl p-4" data-panel="vision-desk">
      <p className="font-mono text-[10px] uppercase tracking-widest text-cyan">Vision desk</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase transition ${
              tab === t.id
                ? "border border-cyan/50 bg-cyan/15 text-cyan"
                : "border border-white/10 bg-void/40 text-mist hover:border-cyan/30"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "stage" && (
        <div className="mt-3 space-y-2 text-[11px] text-mist">
          <p>
            Full-viewport Aeolian stage. Use <span className="text-cyan">Clips</span> to preview
            motion, <span className="text-cyan">Avatars</span> to swap public three.ws bodies
            {isOwner ? " (saved to your profile)." : " (try locally — owner can save)."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!!playing}
              onClick={() => play("wave")}
              className="btn-ghost rounded-full px-3 py-1.5 text-[11px] disabled:opacity-50"
            >
              Wave
            </button>
            <button
              type="button"
              disabled={!!playing}
              onClick={() => play("dance")}
              className="btn-ghost rounded-full px-3 py-1.5 text-[11px] disabled:opacity-50"
            >
              Dance
            </button>
            <button
              type="button"
              disabled={!!playing}
              onClick={() => play("celebrate")}
              className="btn-ghost rounded-full px-3 py-1.5 text-[11px] disabled:opacity-50"
            >
              Celebrate
            </button>
            <button
              type="button"
              onClick={() => {
                avatarRef.current?.setMood(0.7, 0.6);
                setClipMsg("Mood ↑");
              }}
              className="btn-ghost rounded-full px-3 py-1.5 text-[11px]"
            >
              Mood ↑
            </button>
            <button
              type="button"
              onClick={() => {
                avatarRef.current?.setMood(-0.5, 0.4);
                setClipMsg("Mood ↓");
              }}
              className="btn-ghost rounded-full px-3 py-1.5 text-[11px]"
            >
              Mood ↓
            </button>
          </div>
        </div>
      )}

      {tab === "clips" && (
        <div className="mt-3">
          <p className="mb-2 text-[11px] text-mist">
            Preview idle · wave · dance · capoeira · jump · thriller · celebrate on this body.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ANIMATION_CLIPS.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={!!playing}
                onClick={() => play(c.id)}
                className={`rounded-full px-2.5 py-1 text-[11px] transition disabled:opacity-50 ${
                  playing === c.id
                    ? "border border-cyan/60 bg-cyan/20 text-cyan"
                    : "btn-ghost"
                }`}
              >
                {playing === c.id ? `…${c.label}` : c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "avatars" && (
        <div className="mt-3">
          <p className="mb-2 text-[11px] text-mist">
            Public three.ws bodies{isOwner ? " — click to set avatarGlbUrl." : " (read-only preview)."}
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {AVATAR_CATALOG.map((entry) => {
              const active = currentBodyUrl === entry.bodyUrl;
              return (
                <button
                  key={entry.id}
                  type="button"
                  disabled={busy || (!isOwner && !onSelectAvatar)}
                  onClick={() => onSelectAvatar?.(entry)}
                  className={`rounded-xl border px-3 py-2 text-left transition disabled:opacity-50 ${
                    active
                      ? "border-cyan/50 bg-cyan/10"
                      : "border-white/10 bg-void/40 hover:border-cyan/30"
                  }`}
                >
                  <span className="block font-display text-sm font-bold text-frost">{entry.name}</span>
                  <span className="mt-0.5 block font-mono text-[9px] text-mist">{entry.preview}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tab === "eye" && (
        <div className="mt-3 space-y-2 text-[11px] text-mist">
          <p>
            Eye tracking preview — look at the camera or follow the cursor when the CDN supports it.
            Great for checking how clips read face-on.
          </p>
          <button
            type="button"
            onClick={lookCamera}
            className="btn-cyan rounded-full px-3 py-1.5 text-[11px]"
          >
            lookAt(&apos;camera&apos;)
          </button>
          <button
            type="button"
            disabled={!!playing}
            onClick={() => play("thriller")}
            className="btn-ghost ml-2 rounded-full px-3 py-1.5 text-[11px] disabled:opacity-50"
          >
            Preview Thriller
          </button>
        </div>
      )}

      {clipMsg && <p className="mt-2 font-mono text-[10px] text-cyan/80">{clipMsg}</p>}
    </div>
  );
}

export default VisionDesk;
