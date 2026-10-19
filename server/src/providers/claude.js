import { config } from "../config.js";
import { countSyllables, lastWordIndex } from "../lib/khmer.js";
import { ProviderError } from "./types.js";

/**
 * Khmer lyric generation via the Claude (Anthropic) Messages API. Enabled with
 * LYRICS_PROVIDER=claude and ANTHROPIC_API_KEY set. Returns structured JSON;
 * syllable counts are recomputed server-side so they are always consistent.
 *
 * In production, route this through Cloudflare AI Gateway (logs, caching,
 * rate-limit, fallback) by pointing the base URL at the gateway and sending
 * cf-aig-authorization instead of the provider key header.
 */
const API = "https://api.anthropic.com/v1/messages";

const SYSTEM = `អ្នកជាអ្នកនិពន្ធទំនុកច្រៀងខ្មែរអាជីព។ សូមបង្កើតទំនុកច្រៀងជាភាសាខ្មែរសុទ្ធ។
ឆ្លើយតបជា JSON តែប៉ុណ្ណោះ តាមទម្រង់៖
{"sections":[{"kind":"verse|chorus|bridge","label":"...","lines":["បន្ទាត់១","បន្ទាត់២"]}]}
គ្មានអត្ថបទផ្សេងក្រៅ JSON ទេ។`;

export const claudeLyrics = {
  name: "claude",
  async generate({ prompt, mood, genre, structure }) {
    if (!config.anthropicKey) {
      throw new ProviderError("not_configured", "ម៉ាស៊ីន Claude មិនទាន់កំណត់ ANTHROPIC_API_KEY");
    }
    const userMsg = [
      `ប្រធានបទ៖ ${prompt}`,
      `អារម្មណ៍៖ ${mood}`,
      `ចង្វាក់ភ្លេង៖ ${genre}`,
      structure?.length ? `រចនាសម្ព័ន្ធ៖ ${structure.join(", ")}` : "",
      "សូមប្រើពាក្យ [Verse] [Chorus] [Bridge] ជា label ហើយឲ្យមានចុងសម្រាយល្អ។",
    ]
      .filter(Boolean)
      .join("\n");

    const res = await fetch(API, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": config.anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.claudeModel,
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new ProviderError("provider_error", `Claude បរាជ័យ (${res.status}): ${t.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = (data.content ?? []).map((b) => b.text ?? "").join("");
    const parsed = extractJson(text);
    if (!parsed?.sections) throw new ProviderError("bad_output", "មិនអាចញែក JSON ទំនុកច្រៀង");

    return {
      model: config.claudeModel,
      sections: parsed.sections.map((s) => ({
        kind: s.kind ?? "verse",
        label: s.label ?? "Verse",
        lines: (s.lines ?? []).map((text) => ({
          text,
          syllables: countSyllables(text),
          highlights: [lastWordIndex(text)],
        })),
      })),
    };
  },
};

function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}
