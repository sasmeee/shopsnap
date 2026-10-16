import fs from "fs";
import path from "path";
import { VISION_MODEL, TEXT_MODEL } from "../src/lib/models";

const API = process.env.EVAL_URL || "http://localhost:3000/api/upload";
const DIR = path.join(process.cwd(), "samples");

type ExpItem = { name: string; qty: number; price: number };
type ExpOrder = {
  chat_name: string | null;
  phone: string | null;
  total: number;
  pay_status: string;
  items: ExpItem[];
};
type Expected = { file: string; orders: ExpOrder[] };
type GotOrder = ExpOrder & { errors: string[]; warnings: string[] };

type Score = {
  right: number;
  total: number;
  orders: number;
  wrongOrders: number;
  wrongUnflagged: number;
  notes: string[];
};

const norm = (s: string | null | undefined) =>
  (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const near = (a: number, b: number) => Math.abs(a - b) <= 1;

function score(exp: ExpOrder[], got: GotOrder[]): Score {
  const s: Score = {
    right: 0,
    total: 0,
    orders: exp.length,
    wrongOrders: 0,
    wrongUnflagged: 0,
    notes: [],
  };
  let bad = false;
  const check = (ok: boolean, label: string, want: unknown, have: unknown) => {
    s.total++;
    if (ok) s.right++;
    else {
      bad = true;
      s.notes.push(
        `${label}: want ${JSON.stringify(want)}, got ${JSON.stringify(have ?? null)}`,
      );
    }
  };

  check(exp.length === got.length, "order count", exp.length, got.length);

  exp.forEach((e, i) => {
    bad = false;
    const g = got[i];
    const p = `o${i}`;
    check(g?.phone === e.phone, `${p} phone`, e.phone, g?.phone);
    check(
      norm(g?.chat_name) === norm(e.chat_name),
      `${p} chat_name`,
      e.chat_name,
      g?.chat_name,
    );
    check(
      g !== undefined && near(g.total, e.total),
      `${p} total`,
      e.total,
      g?.total,
    );
    check(
      g?.pay_status === e.pay_status,
      `${p} pay_status`,
      e.pay_status,
      g?.pay_status,
    );
    check(
      g?.items.length === e.items.length,
      `${p} item count`,
      e.items.length,
      g?.items.length,
    );
    e.items.forEach((ei, j) => {
      const gi = g?.items[j];
      check(gi?.qty === ei.qty, `${p} item${j} qty`, ei.qty, gi?.qty);
      check(
        gi !== undefined && near(gi.price, ei.price),
        `${p} item${j} price`,
        ei.price,
        gi?.price,
      );
    });
    if (bad) {
      s.wrongOrders++;
      if (!g || (g.errors.length === 0 && g.warnings.length === 0)) {
        s.wrongUnflagged++;
      }
    }
  });
  return s;
}

async function call(
  file: string,
): Promise<{ orders: GotOrder[]; transcript: string }> {
  const buf = fs.readFileSync(path.join(DIR, file));
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(buf)], { type: "image/png" }),
    file,
  );
  form.append("date", "2026-10-17");
  const res = await fetch(API, { method: "POST", body: form });
  const json = (await res.json()) as {
    orders?: GotOrder[];
    transcript?: string;
    error?: string;
  };
  if (!res.ok || !json.orders)
    throw new Error(json.error ?? `HTTP ${res.status}`);
  return { orders: json.orders, transcript: json.transcript ?? "" };
}

async function main() {
  const filter = process.argv.slice(2);
  const all = JSON.parse(
    fs.readFileSync(path.join(DIR, "expected.json"), "utf8"),
  ) as Expected[];
  const list = filter.length
    ? all.filter((e) => filter.some((f) => e.file.includes(f)))
    : all;

  console.log(
    `vision=${VISION_MODEL} text=${TEXT_MODEL} files=${list.length}\n`,
  );

  const sum = {
    right: 0,
    total: 0,
    orders: 0,
    wrongOrders: 0,
    wrongUnflagged: 0,
  };
  const rows: {
    file: string;
    right: number;
    total: number;
    seconds: number;
    notes: string[];
    transcript: string;
  }[] = [];

  for (const e of list) {
    const t0 = Date.now();
    let s: Score;
    let transcript = "";
    try {
      const r = await call(e.file);
      transcript = r.transcript;
      s = score(e.orders, r.orders);
    } catch (err) {
      s = score(e.orders, []);
      s.notes.unshift(
        `request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    const seconds = Math.round((Date.now() - t0) / 1000);
    console.log(`${e.file}  ${s.right}/${s.total}  ${seconds}s`);
    s.notes.forEach((n) => console.log(`   - ${n}`));
    if (s.notes.length && process.env.EVAL_SHOW) {
      console.log(
        transcript
          .split("\n")
          .map((l) => `   | ${l}`)
          .join("\n"),
      );
    }

    sum.right += s.right;
    sum.total += s.total;
    sum.orders += s.orders;
    sum.wrongOrders += s.wrongOrders;
    sum.wrongUnflagged += s.wrongUnflagged;
    rows.push({
      file: e.file,
      right: s.right,
      total: s.total,
      seconds,
      notes: s.notes,
      transcript,
    });
  }

  const pct = sum.total ? Math.round((sum.right / sum.total) * 1000) / 10 : 0;
  console.log(`\nFields correct: ${sum.right}/${sum.total} = ${pct}%`);
  console.log(`Orders with any wrong field: ${sum.wrongOrders}/${sum.orders}`);
  console.log(`Wrong and NOT flagged by validation: ${sum.wrongUnflagged}`);
  console.log(pct >= 70 ? "Gate 1: pass" : "Gate 1: below 70%, try gemma3:12b");

  const label = `${VISION_MODEL}__${TEXT_MODEL}`.replace(/[^\w.-]+/g, "-");
  fs.writeFileSync(
    path.join(DIR, `eval-${label}.json`),
    JSON.stringify(
      { vision: VISION_MODEL, text: TEXT_MODEL, ...sum, pct, rows },
      null,
      2,
    ),
  );
}

main();
