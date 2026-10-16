export const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
export const VISION_MODEL = process.env.VISION_MODEL || "gemma3:4b";
export const TEXT_MODEL = process.env.TEXT_MODEL || "gemma3:4b";

export const REQUIRED_MODELS = Array.from(new Set([VISION_MODEL, TEXT_MODEL]));

function withTag(name: string) {
  return name.includes(":") ? name : `${name}:latest`;
}

export async function getModelStatus(): Promise<{
  ollama: boolean;
  missing: string[];
}> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { ollama: false, missing: REQUIRED_MODELS };
    const data = (await res.json()) as { models?: { name: string }[] };
    const installed = new Set((data.models ?? []).map((m) => withTag(m.name)));
    const missing = REQUIRED_MODELS.filter((m) => !installed.has(withTag(m)));
    return { ollama: true, missing };
  } catch {
    return { ollama: false, missing: REQUIRED_MODELS };
  }
}
