import type React from "react";

/** WindAgents typings for the three.ws <agent-3d> custom element (CDN). */

export type Agent3DElement = HTMLElement & {
  wave?: (opts?: { style?: string }) => Promise<void>;
  say?: (text: string, opts?: { voice?: boolean }) => Promise<void>;
  playClip?: (name: string, opts?: { fade_ms?: number; userInitiated?: boolean }) => void | Promise<void>;
  play?: (name: string, opts?: { loop?: boolean; duration?: number; fade_ms?: number }) => Promise<boolean | void>;
  setMood?: (valence: number, arousal?: number, opts?: Record<string, unknown>) => void;
  expressEmotion?: (trigger: string, weight?: number) => void;
  lookAt?: (target: string) => Promise<void>;
  speak?: (text: string, opts?: Record<string, unknown>) => Promise<void>;
};

export type Agent3DHandle = {
  wave: (opts?: { style?: string }) => Promise<void>;
  say: (text: string, opts?: { voice?: boolean }) => Promise<void>;
  playClip: (name: string, opts?: { fade_ms?: number; userInitiated?: boolean }) => Promise<void>;
  setMood: (valence: number, arousal?: number) => void;
  lookAt: (target: string) => Promise<void>;
  el: Agent3DElement | null;
  ready: boolean;
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "agent-3d": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        body?: string;
        src?: string;
        name?: string;
        mode?: string;
        kiosk?: boolean | string;
        eager?: boolean | string;
        background?: string;
        brain?: string;
        instructions?: string;
        accent?: string;
        framing?: string;
        poster?: string;
        clip?: string;
        "name-plate"?: string;
        "avatar-chat"?: string;
      };
    }
  }
}

export {};
