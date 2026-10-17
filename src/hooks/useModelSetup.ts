"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SetupState =
  | { phase: "checking" }
  | { phase: "no-ollama" }
  | { phase: "downloading"; percent: number }
  | { phase: "error" }
  | { phase: "ready" };

type PullLine = {
  status?: string;
  digest?: string;
  total?: number;
  completed?: number;
};

export function useModelSetup() {
  const [state, setState] = useState<SetupState>({ phase: "checking" });
  const pulling = useRef(false);

  const download = useCallback(async () => {
    if (pulling.current) return;
    pulling.current = true;
    setState({ phase: "downloading", percent: 0 });

    try {
      const res = await fetch("/api/model", { method: "POST" });
      if (!res.ok || !res.body) throw new Error("download failed");

      // Already installed: plain JSON, no stream.
      if (
        (res.headers.get("content-type") ?? "").includes("application/json")
      ) {
        setState({ phase: "ready" });
        return;
      }

      const layers = new Map<string, { total: number; completed: number }>();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let failed = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const msg = JSON.parse(line) as PullLine;
          if (msg.status === "error") failed = true;
          if (msg.digest && msg.total) {
            layers.set(msg.digest, {
              total: msg.total,
              completed: msg.completed ?? 0,
            });
            let total = 0;
            let completed = 0;
            layers.forEach((l) => {
              total += l.total;
              completed += l.completed;
            });
            setState({
              phase: "downloading",
              percent: Math.round((completed / total) * 100),
            });
          }
        }
      }

      setState(failed ? { phase: "error" } : { phase: "ready" });
    } catch {
      setState({ phase: "error" });
    } finally {
      pulling.current = false;
    }
  }, []);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/model");
      const data = (await res.json()) as { ollama: boolean; ready: boolean };
      if (!data.ollama) setState({ phase: "no-ollama" });
      else if (data.ready) setState({ phase: "ready" });
      else void download();
    } catch {
      setState({ phase: "no-ollama" });
    }
  }, [download]);

  // First check on page load.
  useEffect(() => {
    const t = setTimeout(() => void check(), 0);
    return () => clearTimeout(t);
  }, [check]);

  // While Ollama is down, quietly retry every 3 seconds.
  useEffect(() => {
    if (state.phase !== "no-ollama") return;
    const i = setInterval(() => void check(), 3000);
    return () => clearInterval(i);
  }, [state.phase, check]);

  return { state, retry: check };
}
