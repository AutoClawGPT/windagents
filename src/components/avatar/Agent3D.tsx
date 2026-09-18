"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { DEFAULT_GLB, loadAgent3dScript } from "./loadAgent3dScript";
import type { Agent3DElement, Agent3DHandle } from "./agent-3d-types";
import { OrbFallback } from "./OrbFallback";
import { clipAliases } from "@/lib/avatar-catalog";
import "./agent-3d-types";

export type Agent3DProps = {
  /** GLB URL — defaults to three.ws default.glb */
  body?: string | null;
  glbUrl?: string | null;
  /** Alternate src= if body= fails for avatar API URLs */
  src?: string | null;
  name?: string;
  accent?: string;
  eager?: boolean;
  /** Prefer kiosk (no chrome) for WindAgents profile stage */
  kiosk?: boolean;
  mode?: "inline" | "floating" | "section" | "fullscreen" | "widget";
  background?: string;
  className?: string;
  style?: CSSProperties;
  compact?: boolean;
  instructions?: string;
  /** three.ws name-plate=on|off — cyan accent when on */
  namePlate?: boolean;
  /** three.ws avatar-chat=on|off */
  avatarChat?: boolean;
  onReady?: () => void;
  onError?: (err: string) => void;
};

type SceneHint = {
  playAnimationByHint?: (hint: string, opts?: unknown) => Promise<unknown> | unknown;
  playClipByName?: (name: string, opts?: unknown) => boolean | Promise<boolean>;
};

function sceneOf(el: Agent3DElement): SceneHint | null {
  const anyEl = el as Agent3DElement & { _scene?: SceneHint };
  return anyEl._scene ?? null;
}

/**
 * Reliable clip trigger: try play() (boolean), decoration playClip slots,
 * playAnimationByHint fuzzy, then wave() helper.
 */
async function tryPlayClip(
  el: Agent3DElement,
  clipName: string,
  opts?: { fade_ms?: number; userInitiated?: boolean }
) {
  const names = clipAliases(clipName);
  const fade = opts?.fade_ms ?? 400;
  let lastErr: unknown;

  if (/^wave$/i.test(clipName) && typeof el.wave === "function") {
    try {
      await el.wave({ style: "enthusiastic" });
      return;
    } catch (e) {
      lastErr = e;
    }
  }

  // el.play → playClipByName (boolean when available)
  if (typeof el.play === "function") {
    for (const name of names) {
      try {
        const r = await el.play(name, { fade_ms: fade });
        if (r === true) return;
        if (r !== false && r !== undefined && r !== null) return;
      } catch (e) {
        lastErr = e;
      }
    }
  }

  // Fuzzy hint via private scene (same path as el.wave)
  const scene = sceneOf(el);
  if (scene?.playAnimationByHint) {
    for (const name of names) {
      try {
        await scene.playAnimationByHint(name, { fade_ms: fade });
        return;
      } catch (e) {
        lastErr = e;
      }
    }
  }
  if (scene?.playClipByName) {
    for (const name of names) {
      try {
        const ok = await scene.playClipByName(name, { fade_ms: fade, loop: false });
        if (ok) return;
      } catch (e) {
        lastErr = e;
      }
    }
  }

  // Decoration slots last (idle/wave/dance/celebrate → mapped av-*); sync, may no-op
  if (typeof el.playClip === "function") {
    try {
      el.playClip(names[0]!, { userInitiated: true, fade_ms: fade, ...opts });
      // Also try remaining aliases — decoration defs use slot names
      for (const name of names.slice(1)) {
        try {
          el.playClip(name, { userInitiated: true, fade_ms: fade, ...opts });
        } catch {
          /* keep trying */
        }
      }
      return;
    } catch (e) {
      lastErr = e;
    }
  }

  if (lastErr) throw lastErr;
  throw new Error(`No clip matched "${clipName}" on this body`);
}

export const Agent3D = forwardRef<Agent3DHandle, Agent3DProps>(function Agent3D(
  {
    body,
    glbUrl,
    src,
    name,
    accent = "#5eead4",
    eager = true,
    kiosk = true,
    mode = "section",
    background = "transparent",
    className = "",
    style,
    compact = false,
    instructions,
    namePlate = false,
    avatarChat = false,
    onReady,
    onError,
  },
  ref
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const elRef = useRef<Agent3DElement | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  const glb = body || glbUrl || DEFAULT_GLB;
  const altSrc = src || undefined;

  const waitReady = useCallback(async () => {
    const el = elRef.current;
    if (!el) throw new Error("agent-3d not mounted");
    if (ready) return el;
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("agent:ready timeout")), 20000);
      const onReadyEvt = () => {
        clearTimeout(t);
        resolve();
      };
      const onErr = () => {
        clearTimeout(t);
        reject(new Error("agent:error"));
      };
      el.addEventListener("agent:ready", onReadyEvt, { once: true });
      el.addEventListener("agent:error", onErr, { once: true });
    });
    return el;
  }, [ready]);

  useImperativeHandle(
    ref,
    (): Agent3DHandle => ({
      el: elRef.current,
      ready,
      async wave(opts) {
        const el = await waitReady();
        if (typeof el.wave === "function") await el.wave(opts);
        else await tryPlayClip(el, "wave");
      },
      async say(text, opts) {
        const el = await waitReady();
        if (typeof el.say === "function") await el.say(text, opts);
        else if (typeof el.speak === "function") await el.speak(text, opts);
      },
      async playClip(clipName, opts) {
        const el = await waitReady();
        await tryPlayClip(el, clipName, opts);
      },
      setMood(valence, arousal = 0.5) {
        const el = elRef.current;
        if (el && typeof el.setMood === "function") {
          el.setMood(valence, arousal);
        } else if (el && typeof el.expressEmotion === "function") {
          const trigger =
            valence > 0.4 ? "celebration" : valence < -0.3 ? "concern" : "neutral";
          el.expressEmotion(trigger, Math.min(1, Math.abs(valence) + 0.4));
        }
      },
      async lookAt(target) {
        const el = await waitReady();
        if (typeof el.lookAt === "function") await el.lookAt(target);
      },
    }),
    [ready, waitReady]
  );

  useEffect(() => {
    let cancelled = false;
    let el: Agent3DElement | null = null;

    async function mount() {
      setStatus("loading");
      setFailed(false);
      setReady(false);
      try {
        await loadAgent3dScript();
        if (cancelled || !hostRef.current) return;

        hostRef.current.innerHTML = "";

        el = document.createElement("agent-3d") as Agent3DElement;
        el.setAttribute("body", glb);
        // Prefer body=; also set src when provided (avatar API / alternate)
        if (altSrc) el.setAttribute("src", altSrc);
        else if (glb.includes("/api/avatars/")) el.setAttribute("src", glb);
        if (name) el.setAttribute("name", name);
        el.setAttribute("mode", mode);
        el.setAttribute("background", background);
        el.setAttribute("brain", "none");
        el.setAttribute("name-plate", namePlate ? "on" : "off");
        if (avatarChat) el.setAttribute("avatar-chat", "on");
        else el.setAttribute("avatar-chat", "off");
        if (kiosk) el.setAttribute("kiosk", "");
        if (eager) el.setAttribute("eager", "");
        if (instructions) el.setAttribute("instructions", instructions);
        el.style.setProperty("--agent-accent", accent);
        el.style.width = "100%";
        el.style.height = "100%";
        el.style.display = "block";
        el.style.minHeight = compact || mode === "widget" ? "96px" : "100%";
        el.style.position = "absolute";
        el.style.inset = "0";

        const onReadyEvt = () => {
          if (cancelled) return;
          setReady(true);
          setStatus("ready");
          onReadyRef.current?.();
        };
        const onErrorEvt = (e: Event) => {
          if (cancelled) return;
          const detail = (e as CustomEvent).detail;
          const msg =
            (detail && (detail.message || detail.error)) ||
            "agent-3d failed to initialize";
          setStatus("error");
          setFailed(true);
          onErrorRef.current?.(String(msg));
        };

        el.addEventListener("agent:ready", onReadyEvt);
        el.addEventListener("agent:error", onErrorEvt);
        el.addEventListener(
          "agent:load-progress",
          ((e: Event) => {
            const d = (e as CustomEvent).detail as { pct?: number } | undefined;
            if (d?.pct != null && d.pct >= 99) onReadyEvt();
          }) as EventListener
        );
        const readyWatch = window.setTimeout(() => {
          if (cancelled) return;
          if (!elRef.current) return;
          if (compact || mode === "widget") {
            const canvas = elRef.current.querySelector?.("canvas");
            if (!canvas) {
              setFailed(true);
              setStatus("error");
              onErrorRef.current?.("Card 3D canvas empty — orb fallback");
              return;
            }
          }
          setReady(true);
          setStatus("ready");
          onReadyRef.current?.();
        }, compact || mode === "widget" ? 4500 : 14000);
        const clearWatch = () => window.clearTimeout(readyWatch);
        el.addEventListener("agent:ready", clearWatch, { once: true });
        el.addEventListener("agent:error", clearWatch, { once: true });
        elRef.current = el;
        hostRef.current.appendChild(el);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "CDN load failed";
        setFailed(true);
        setStatus("error");
        onErrorRef.current?.(msg);
      }
    }

    mount();

    return () => {
      cancelled = true;
      elRef.current = null;
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
  }, [
    glb,
    altSrc,
    name,
    accent,
    eager,
    kiosk,
    mode,
    background,
    compact,
    instructions,
    namePlate,
    avatarChat,
  ]);

  if (failed) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl bg-void/40 ${className}`}
        style={style}
        data-agent3d-fallback="orb"
      >
        <OrbFallback
          color={accent}
          compact={compact || mode === "widget"}
          label={compact || mode === "widget" ? undefined : "3D CDN unavailable — orb fallback"}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={style}
      data-agent3d-status={status}
      data-agent3d-body={glb}
      data-agent3d-mode={mode}
      data-agent3d-nameplate={namePlate ? "on" : "off"}
    >
      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="h-10 w-10 animate-pulse rounded-full border-2 border-cyan/40 border-t-cyan" />
        </div>
      )}
      <div
        ref={hostRef}
        className="agent3d-host absolute inset-0 h-full w-full"
        style={{
          minHeight: compact || mode === "widget" ? 96 : "100%",
          width: "100%",
          height: "100%",
        }}
        data-compact={compact || mode === "widget" ? "1" : "0"}
      />
    </div>
  );
});

export default Agent3D;
