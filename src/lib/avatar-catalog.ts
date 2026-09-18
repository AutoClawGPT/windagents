/** Public three.ws avatar bodies for WindAgents picker (UI only — no CDN in API routes). */

export type AvatarCatalogEntry = {
  id: string;
  name: string;
  /** GLB or avatar URL passed to agent-3d body= (prefer direct .glb) */
  bodyUrl: string;
  /** Optional alternate attr if body fails (agent-3d src=) */
  srcUrl?: string;
  preview: string;
};

/** Resolved forge GLB from https://three.ws/api/avatars/566a4f1b-7dac-4c54-bc9d-7bd7b9a18a9a */
export const FORGE_AGENT_GLB =
  "https://pub-2534e921bf9c4314addcd4d8a6e98b7b.r2.dev/forge/4d237eae1fe4/6f6fc217-9470-4689-9639-9221ce3820cf.glb";

export const FORGE_AGENT_API =
  "https://three.ws/api/avatars/566a4f1b-7dac-4c54-bc9d-7bd7b9a18a9a";

/**
 * curl-checked 200 model/gltf-binary (2026-09-15):
 * default, cz, fox, xbot, michelle, robotexpressive, soldier (+ forge R2).
 * Skipped brainstem.glb (~3.2MB — too heavy for picker/floaters).
 */
export const AVATAR_CATALOG: AvatarCatalogEntry[] = [
  {
    id: "default",
    name: "Default",
    bodyUrl: "https://three.ws/avatars/default.glb",
    preview: "Classic three.ws default humanoid",
  },
  {
    id: "forge-agent",
    name: "Forge Agent",
    bodyUrl: FORGE_AGENT_GLB,
    srcUrl: FORGE_AGENT_API,
    preview: "Public forge avatar (API 566a4f1b…)",
  },
  {
    id: "robot-expressive",
    name: "Robot Expressive",
    bodyUrl: "https://three.ws/animations/robotexpressive.glb",
    preview: "Expressive robot with rich clip set",
  },
  {
    id: "soldier",
    name: "Soldier",
    bodyUrl: "https://three.ws/animations/soldier.glb",
    preview: "Military soldier animation pack",
  },
  {
    id: "cz",
    name: "CZ",
    bodyUrl: "https://three.ws/avatars/cz.glb",
    preview: "Public CZ character avatar",
  },
  {
    id: "fox",
    name: "Fox",
    bodyUrl: "https://three.ws/avatars/fox.glb",
    preview: "Lightweight fox mesh (~160KB)",
  },
  {
    id: "xbot",
    name: "X Bot",
    bodyUrl: "https://three.ws/avatars/xbot.glb",
    preview: "Mixamo-style X Bot humanoid",
  },
  {
    id: "michelle",
    name: "Michelle",
    bodyUrl: "https://three.ws/avatars/michelle.glb",
    preview: "Michelle character — samba-friendly",
  },
];

/** Clips wired to playClip / play — aliases tried in order (three.ws slots + av-* libs) */
export const ANIMATION_CLIPS = [
  {
    id: "idle",
    label: "Idle",
    aliases: [
      "idle",
      "Idle",
      "av-idle-breath",
      "av-idle-male",
      "av-idle-female",
      "av-idle-anim",
      "Idle Breath",
      "Male Idle",
    ],
  },
  {
    id: "wave",
    label: "Wave",
    aliases: ["wave", "Wave", "av-call-me"],
  },
  {
    id: "dance",
    label: "Dance",
    aliases: [
      "dance",
      "Dance",
      "rumba",
      "Rumba",
      "av-dance-shuffle",
      "Shuffle Dance",
      "michelle-samba-dance",
      "av-boxer-dance",
      "av-rap-dance",
      "av-banging-tunes",
    ],
  },
  {
    id: "capoeira",
    label: "Capoeira",
    aliases: ["capoeira", "Capoeira"],
  },
  {
    id: "jump",
    label: "Jump",
    aliases: ["jump", "Jump", "av-superhero-jump", "jumpdown", "av-back-flip"],
  },
  {
    id: "thriller",
    label: "Thriller",
    aliases: ["thriller", "Thriller"],
  },
  {
    id: "celebrate",
    label: "Celebrate",
    aliases: [
      "celebrate",
      "av-celebrating",
      "celebration",
      "Celebrating",
      "Celebrate",
      "cheer",
      "av-cheering",
      "Cheering",
      "av-brag-claps",
      "av-joy",
    ],
  },
] as const;

export type AnimationClipId = (typeof ANIMATION_CLIPS)[number]["id"];

/** Bodies preferred for background floaters (distinct silhouettes, skip heavy forge). */
export const FLOATER_CATALOG_IDS = ["fox", "michelle", "robot-expressive", "xbot"] as const;

export function randomCatalogBody(): string {
  const i = Math.floor(Math.random() * AVATAR_CATALOG.length);
  return AVATAR_CATALOG[i]!.bodyUrl;
}

export function findCatalogByUrl(url: string | null | undefined): AvatarCatalogEntry | undefined {
  if (!url) return undefined;
  return AVATAR_CATALOG.find(
    (e) => e.bodyUrl === url || e.srcUrl === url || url.includes(e.id)
  );
}

export function findCatalogById(id: string): AvatarCatalogEntry | undefined {
  return AVATAR_CATALOG.find((e) => e.id === id);
}

export function clipAliases(clipId: string): string[] {
  const row = ANIMATION_CLIPS.find((c) => c.id === clipId);
  if (row) return [...row.aliases];
  return [clipId, clipId.charAt(0).toUpperCase() + clipId.slice(1)];
}
