"use client";

import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { normalizePhone } from "@/lib/phone";
import { validateOrder } from "@/lib/chat";
import { todayLocal } from "@/lib/date";

type Pay = "paid" | "unpaid" | "partial";
type Item = { name: string; qty: number; price: number };

type ReviewOrder = {
  key: string;
  phone: string;
  chat_name: string;
  items: Item[];
  total: number;
  pay_status: Pay;
  paid_amount: number;
  source_hash: string;
  order_idx: number;
  warnings: string[];
};

type Entry = {
  id: string;
  file: File;
  previewUrl: string;
  status: "queued" | "reading" | "done" | "error" | "duplicate";
  error?: string;
  orders: ReviewOrder[];
};

type ApiOrder = {
  chat_name: string | null;
  phone: string | null;
  items: Item[];
  total: number;
  pay_status: Pay | "unknown";
  order_idx: number;
  source_hash: string;
  warnings: string[];
};

function toReview(o: ApiOrder): ReviewOrder {
  return {
    key: `${o.source_hash}-${o.order_idx}`,
    phone: o.phone ?? "",
    chat_name: o.chat_name ?? "",
    items: o.items,
    total: o.total,
    pay_status: o.pay_status === "unknown" ? "unpaid" : o.pay_status,
    paid_amount: 0,
    source_hash: o.source_hash,
    order_idx: o.order_idx,
    warnings: o.warnings,
  };
}

function problems(o: ReviewOrder): string[] {
  const list: string[] = [];
  const typed = o.phone.trim();
  const phone = typed ? normalizePhone(typed) : null;
  if (typed && !phone) list.push("Phone number is not valid");
  list.push(
    ...validateOrder({
      phone,
      chat_name: o.chat_name.trim() || null,
      items: o.items,
      total: o.total,
    }),
  );
  if (
    o.pay_status === "partial" &&
    !(o.paid_amount > 0 && o.paid_amount < o.total)
  ) {
    list.push("Partial payment must be above 0 and below the total");
  }
  return list;
}

function OrderEditor({
  order,
  onChange,
  onRemove,
}: {
  order: ReviewOrder;
  onChange: (patch: Partial<ReviewOrder>) => void;
  onRemove: () => void;
}) {
  const errors = problems(order);
  const sum = Math.round(order.items.reduce((s, i) => s + i.qty * i.price, 0));
  const setItem = (idx: number, patch: Partial<Item>) =>
    onChange({
      items: order.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    });

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          Phone
          <Input
            value={order.phone}
            placeholder="+94 77 123 4567"
            onChange={(e) => onChange({ phone: e.target.value })}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Chat name
          <Input
            value={order.chat_name}
            onChange={(e) => onChange({ chat_name: e.target.value })}
          />
        </label>
      </div>
      {!order.phone.trim() && order.chat_name.trim() && (
        <p className="text-xs text-muted-foreground">
          No phone: this order will go to Pending.
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="w-20">Qty</TableHead>
            <TableHead className="w-28">Price</TableHead>
            <TableHead className="w-24 text-right">Amount</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.items.map((it, i) => (
            <TableRow key={i}>
              <TableCell>
                <Input
                  value={it.name}
                  onChange={(e) => setItem(i, { name: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={it.qty}
                  onChange={(e) => setItem(i, { qty: Number(e.target.value) })}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={it.price}
                  onChange={(e) =>
                    setItem(i, { price: Number(e.target.value) })
                  }
                />
              </TableCell>
              <TableCell className="text-right">
                {Math.round(it.qty * it.price)}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onChange({ items: order.items.filter((_, k) => k !== i) })
                  }
                >
                  ✕
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          onChange({ items: [...order.items, { name: "", qty: 1, price: 0 }] })
        }
      >
        Add item
      </Button>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-muted-foreground">
          Total (items add up to {sum})
          <Input
            type="number"
            className="w-32"
            value={order.total}
            onChange={(e) => onChange({ total: Number(e.target.value) })}
          />
        </label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange({ total: sum })}
        >
          Use {sum}
        </Button>
        <label className="text-xs text-muted-foreground">
          Payment
          <Select
            value={order.pay_status}
            onValueChange={(v) => onChange({ pay_status: v as Pay })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
            </SelectContent>
          </Select>
        </label>
        {order.pay_status === "partial" && (
          <label className="text-xs text-muted-foreground">
            Paid so far
            <Input
              type="number"
              className="w-32"
              value={order.paid_amount}
              onChange={(e) =>
                onChange({ paid_amount: Number(e.target.value) })
              }
            />
          </label>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-destructive"
          onClick={onRemove}
        >
          Remove order
        </Button>
      </div>

      {errors.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-destructive">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {order.warnings.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-amber-600">
          {order.warnings.map((w) => (
            <li key={w}>Check against the screenshot: {w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function UploadPanel() {
  const [date, setDate] = useState(todayLocal);
  const [files, setFiles] = useState<Entry[]>([]);
  const [saving, setSaving] = useState(false);
  const chain = useRef<Promise<void>>(Promise.resolve());

  const patch = useCallback((id: string, p: Partial<Entry>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...p } : f)));
  }, []);

  const patchOrder = (id: string, key: string, p: Partial<ReviewOrder>) =>
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              orders: f.orders.map((o) => (o.key === key ? { ...o, ...p } : o)),
            }
          : f,
      ),
    );

  const removeOrder = (id: string, key: string) =>
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, orders: f.orders.filter((o) => o.key !== key) }
          : f,
      ),
    );

  const removeEntry = (id: string) => {
    const e = files.find((f) => f.id === id);
    if (e) URL.revokeObjectURL(e.previewUrl);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const read = useCallback(
    async (entry: Entry, force = false) => {
      patch(entry.id, { status: "reading", error: undefined });
      try {
        const form = new FormData();
        form.append("file", entry.file);
        form.append("date", date);
        if (force) form.append("force", "1");
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload failed");
        if (json.duplicate) {
          patch(entry.id, { status: "duplicate", orders: [] });
          return;
        }
        patch(entry.id, {
          status: "done",
          orders: (json.orders as ApiOrder[]).map(toReview),
        });
      } catch (e) {
        patch(entry.id, {
          status: "error",
          error: e instanceof Error ? e.message : "Upload failed",
        });
      }
    },
    [date, patch],
  );

  const enqueue = useCallback(
    (entries: Entry[], force = false) => {
      for (const entry of entries) {
        chain.current = chain.current.then(() => read(entry, force));
      }
    },
    [read],
  );

  const onDrop = useCallback(
    (accepted: File[]) => {
      const added: Entry[] = accepted.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "queued",
        orders: [],
      }));
      setFiles((prev) => [...prev, ...added]);
      enqueue(added);
    },
    [enqueue],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
  });

  const all = files.flatMap((f) => (f.status === "done" ? f.orders : []));
  const blocking = all.filter((o) => problems(o).length > 0).length;
  const busy = files.some(
    (f) => f.status === "queued" || f.status === "reading",
  );
  const finished = files.filter(
    (f) =>
      f.status === "done" || f.status === "error" || f.status === "duplicate",
  ).length;

  async function confirm() {
    setSaving(true);
    try {
      const payload = all.map((o) => ({
        phone: o.phone.trim() ? normalizePhone(o.phone) : null,
        chat_name: o.chat_name.trim() || null,
        order_date: date,
        items: o.items,
        total: o.total,
        pay_status: o.pay_status,
        paid_amount: o.pay_status === "partial" ? o.paid_amount : 0,
        source_hash: o.source_hash,
        order_idx: o.order_idx,
      }));
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save");
      const dup = json.duplicates as number;
      toast.success(
        `${json.saved} saved${dup ? `, ${dup} duplicate${dup > 1 ? "s" : ""} ignored` : ""}`,
      );
      files
        .filter((f) => f.status === "done")
        .forEach((f) => URL.revokeObjectURL(f.previewUrl));
      setFiles((prev) => prev.filter((f) => f.status !== "done"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm">
          Business date
          <Input
            type="date"
            className="w-44"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <p className="text-sm text-muted-foreground">
          Include the top of the chat, with the name or number, in each
          screenshot.
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center text-sm ${
          isDragActive ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive
          ? "Drop screenshots here"
          : "Drag screenshots here, or click to choose"}
      </div>

      {busy && (
        <div className="space-y-1">
          <Progress value={(finished / files.length) * 100} />
          <p className="text-xs text-muted-foreground">
            Reading {finished + 1} of {files.length}. Takes about 20 to 40
            seconds per screenshot on a normal PC.
          </p>
        </div>
      )}

      {files.map((f) => (
        <Card key={f.id}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{f.file.name}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge
                variant={f.status === "error" ? "destructive" : "secondary"}
              >
                {f.status === "queued" && "Waiting"}
                {f.status === "reading" && "Reading..."}
                {f.status === "done" && `${f.orders.length} order(s)`}
                {f.status === "duplicate" && "Already saved"}
                {f.status === "error" && "Failed"}
              </Badge>
              {f.status === "error" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => enqueue([f])}
                >
                  Retry
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeEntry(f.id)}
              >
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[220px_1fr]">
            <a href={f.previewUrl} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.previewUrl}
                alt={f.file.name}
                className="max-h-96 w-full rounded border object-contain"
              />
            </a>
            <div className="space-y-3">
              {f.status === "error" && (
                <p className="text-sm text-destructive">{f.error}</p>
              )}
              {f.status === "duplicate" && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    This screenshot was already saved. Skipped, so nothing is
                    counted twice.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => enqueue([f], true)}
                  >
                    Read again anyway
                  </Button>
                </div>
              )}
              {f.status === "done" && f.orders.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No order found in this screenshot.
                </p>
              )}
              {f.orders.map((o) => (
                <OrderEditor
                  key={o.key}
                  order={o}
                  onChange={(p) => patchOrder(f.id, o.key, p)}
                  onRemove={() => removeOrder(f.id, o.key)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {files.length > 0 && (
        <div className="flex items-center gap-3">
          <Button
            disabled={busy || saving || all.length === 0 || blocking > 0}
            onClick={confirm}
          >
            Confirm {all.length} order{all.length === 1 ? "" : "s"}
          </Button>
          {blocking > 0 && (
            <p className="text-sm text-destructive">
              {blocking} order{blocking === 1 ? "" : "s"} need fixing first.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
