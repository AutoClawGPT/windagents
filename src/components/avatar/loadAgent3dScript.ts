/** Load pinned three.ws agent-3d CDN script once (SRI from versions.json). */

export const AGENT3D_VERSION = "1.5.2";
export const AGENT3D_SCRIPT_SRC = `https://three.ws/agent-3d/${AGENT3D_VERSION}/agent-3d.js`;
/** Must match https://three.ws/agent-3d/versions.json channels["1.5.2"].integrity["agent-3d.js"] */
export const AGENT3D_INTEGRITY =
  "sha384-hyuA7yBTgfOtg2kNC5qQFkUzcB6ac3RBpNjjgHOFWVXW4xjcvqAPVaY2ZgcYDB/G";
export const DEFAULT_GLB = "https://three.ws/avatars/default.glb";

const SCRIPT_ID = "three-ws-agent-3d-cdn";

let loadPromise: Promise<void> | null = null;

function waitForCustomElement(timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (customElements.get("agent-3d")) {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error("agent-3d custom element did not register"));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function injectScript(useIntegrity: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (customElements.get("agent-3d")) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => waitForCustomElement().then(resolve, reject), {
        once: true,
      });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load agent-3d script")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.type = "module";
    script.src = AGENT3D_SCRIPT_SRC;
    script.crossOrigin = "anonymous";
    if (useIntegrity) script.integrity = AGENT3D_INTEGRITY;
    script.onload = () => waitForCustomElement().then(resolve, reject);
    script.onerror = () => reject(new Error("Failed to load three.ws agent-3d CDN script"));
    document.head.appendChild(script);
  });
}

export function loadAgent3dScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("agent-3d requires browser"));
  }
  if (customElements.get("agent-3d")) {
    return Promise.resolve();
  }
  if (loadPromise) return loadPromise;

  loadPromise = injectScript(true).catch(async (err) => {
    // Stale SRI or CDN republish: drop the failed tag and retry without integrity once
    const bad = document.getElementById(SCRIPT_ID);
    if (bad) bad.remove();
    loadPromise = null;
    try {
      loadPromise = injectScript(false);
      await loadPromise;
    } catch (err2) {
      loadPromise = null;
      throw err2 instanceof Error ? err2 : err;
    }
  });

  return loadPromise;
}
