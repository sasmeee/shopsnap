import { NextResponse } from "next/server";
import { OLLAMA_URL, getModelStatus } from "@/lib/models";

// check ollama and the required models.
export async function GET() {
  const { ollama, missing } = await getModelStatus();
  return NextResponse.json({ ollama, ready: ollama && missing.length === 0 });
}

// download missing models and stream progress.
export async function POST() {
  const { ollama, missing } = await getModelStatus();
  if (!ollama) {
    return NextResponse.json({ error: "OLLAMA_DOWN" }, { status: 503 });
  }
  if (missing.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for (const name of missing) {
          const res = await fetch(`${OLLAMA_URL}/api/pull`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, stream: true }),
          });
          if (!res.ok || !res.body) throw new Error("PULL_FAILED");
          const reader = res.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        }
        controller.enqueue(encoder.encode('{"status":"done"}\n'));
      } catch {
        controller.enqueue(encoder.encode('{"status":"error"}\n'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
