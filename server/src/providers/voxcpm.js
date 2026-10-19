import { config } from "../config.js";
import { ProviderError } from "./types.js";

/**
 * Self-hosted VoxCPM2 GPU worker adapter (speaking-voice clone). The worker is
 * a small FastAPI service on a serverless GPU (Modal/RunPod/Replicate) or the
 * owner's GPU box, reached over HTTPS with a shared secret. It is NEVER exposed
 * publicly — only this API calls it. Enable with VOICE_PROVIDER=voxcpm2 and
 * VOXCPM_WORKER_URL / VOXCPM_WORKER_SECRET set.
 *
 * Worker endpoints (expected): /design, /clone (reference clip),
 * /clone_ultimate (reference + transcript). This adapter uses /clone to
 * synthesize `text` in the user's consented voice, then the route uploads the
 * result to R2 and returns a short-lived signed URL.
 */
export const voxcpmVoice = {
  name: "voxcpm2",
  async preview({ referenceKey, transcript, text }) {
    if (!config.voxcpmUrl || !config.voxcpmSecret) {
      throw new ProviderError("not_configured", "GPU worker (VoxCPM2) មិនទាន់កំណត់ VOXCPM_WORKER_URL/SECRET");
    }
    const res = await fetch(`${config.voxcpmUrl.replace(/\/$/, "")}/clone`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${config.voxcpmSecret}` },
      body: JSON.stringify({ reference_key: referenceKey, transcript, text, sample_rate: 48000 }),
    }).catch((e) => {
      throw new ProviderError("worker_unreachable", `GPU worker មិនអាចភ្ជាប់៖ ${e.message}`);
    });
    if (!res.ok) {
      throw new ProviderError("worker_error", `GPU worker បរាជ័យ (${res.status})`);
    }
    // The worker returns { audio_url | audio_b64, duration_s }. Uploading the
    // bytes to R2 and signing a URL is the route's job; here we pass through.
    const data = await res.json();
    return { url: data.audio_url ?? null, durationS: data.duration_s ?? null, raw: data };
  },
  sampleQuality() {
    // Real metrics would come from the worker (speaker similarity, SNR).
    return { matchPct: null, noiseDb: null, synthetic: false };
  },
};
