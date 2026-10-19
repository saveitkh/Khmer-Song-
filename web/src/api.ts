import { initData } from "./telegram";
import type {
  Job, Lyrics, Me, Project, Song, TrendingVoice, UserSettings, Voice,
} from "./lib/types";

const BASE = "/api";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new ApiError(0, "offline", "អ្នកនៅ offline — សូមភ្ជាប់អ៊ីនធឺណិត");
  }
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        // The server verifies this HMAC-signed string to identify the user.
        "X-Telegram-Init-Data": initData(),
        ...(opts.headers || {}),
      },
    });
  } catch {
    throw new ApiError(0, "network", "ការតភ្ជាប់បរាជ័យ — សូមព្យាយាមម្ដងទៀត");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, body?.code ?? "error", body?.message ?? "មានបញ្ហា");
  }
  return body as T;
}

const get = <T>(p: string) => req<T>(p);
const post = <T>(p: string, data?: unknown) =>
  req<T>(p, { method: "POST", body: data ? JSON.stringify(data) : undefined });
const patch = <T>(p: string, data?: unknown) =>
  req<T>(p, { method: "PATCH", body: data ? JSON.stringify(data) : undefined });
const del = <T>(p: string) => req<T>(p, { method: "DELETE" });

export const api = {
  me: () => get<Me>("/me"),
  updateSettings: (patchData: Partial<UserSettings>) =>
    patch<Me>("/me/settings", patchData),
  purgeCache: () => post<{ ok: true }>("/me/cache/purge"),

  listVoices: () => get<{ voices: Voice[] }>("/voices"),
  getVoice: (id: string) => get<Voice>(`/voices/${id}`),
  createVoice: (data: { name: string; style?: string; transcript: string; consent: boolean; refKey?: string }) =>
    post<Voice>("/voices", data),
  deleteVoice: (id: string) => del<{ ok: true }>(`/voices/${id}`),
  previewVoice: (id: string, text: string) =>
    post<Job>(`/voices/${id}/preview`, { text }),

  generateLyrics: (data: { prompt: string; mood: string; genre: string; structure?: string[] }) =>
    post<Job>("/lyrics/generate", data),
  getLyrics: (id: string) => get<Lyrics>(`/lyrics/${id}`),

  createSong: (data: { lyricsId: string; voiceId?: string | null; style: string; instrumental?: boolean }) =>
    post<Job>("/songs", data),
  getSong: (id: string) => get<Song>(`/songs/${id}`),
  listSongs: () => get<{ songs: Song[] }>("/songs"),

  getJob: (id: string) => get<Job>(`/jobs/${id}`),
  cancelJob: (id: string) => post<Job>(`/jobs/${id}/cancel`),

  trending: () => get<{ voices: TrendingVoice[] }>("/library/trending"),
  recentProjects: () => get<{ projects: Project[] }>("/library/recent"),

  presignUpload: (data: { contentType: string; sizeBytes: number; kind: string }) =>
    post<{ url: string; key: string; headers: Record<string, string> }>("/uploads/presign", data),

  health: () => get<{ ok: boolean; engines: Record<string, string> }>("/health"),
};

/** Poll a job until it finishes. Calls onTick with progress between polls. */
export async function pollJob(
  id: string,
  onTick?: (job: Job) => void,
  { intervalMs = 1200, timeoutMs = 120_000 }: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<Job> {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const job = await api.getJob(id);
    onTick?.(job);
    if (job.status === "done" || job.status === "failed" || job.status === "canceled") return job;
    if (Date.now() - start > timeoutMs) throw new ApiError(0, "timeout", "ចំណាយពេលយូរពេក");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
