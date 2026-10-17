"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { todayLocal } from "@/lib/date";
import { followUpMessage, formatRs } from "@/lib/messages";
import type { Report, ReportOrder } from "@/lib/report";

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-semibold ${tone ?? ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function PartPaymentDialog({
  order,
  onClose,
  onDone,
}: {
  order: ReportOrder | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAmount(""), 0);
    return () => clearTimeout(t);
  }, [order]);

  const value = Number(amount);
  const valid = order !== null && value > 0 && value <= order.balance;

  async function submit() {
    if (!order || !valid) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment: value }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save");
      toast.success(`${formatRs(value)} recorded`);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={order !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Part payment from {order?.name}</DialogTitle>
          <DialogDescription>
            Balance now: {order ? formatRs(order.balance) : ""}
          </DialogDescription>
        </DialogHeader>
        <Input
          type="number"
          placeholder="Amount received"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {amount && !valid && order && (
          <p className="text-sm text-destructive">
            Enter an amount above 0 and up to {formatRs(order.balance)}.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid || saving} onClick={submit}>
            Save payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReportView() {
  const [date, setDate] = useState(todayLocal);
  const [report, setReport] = useState<Report | null>(null);
  const [failed, setFailed] = useState(false);
  const [part, setPart] = useState<ReportOrder | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/report?date=${date}`);
      if (!res.ok) throw new Error("failed");
      setReport((await res.json()) as Report);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [date]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function markPaid(o: ReportOrder) {
    try {
      const res = await fetch(`/api/orders/${o.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_paid: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save");
      toast.success(`${o.name} marked paid`);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  }

  async function copyMessage(o: ReportOrder) {
    try {
      await navigator.clipboard.writeText(followUpMessage(o));
      toast.success("Message copied. Paste it into WhatsApp.");
    } catch {
      toast.error("Could not copy. Select the text and copy it by hand.");
    }
  }

  return (
    <div className="space-y-6">
      <label className="block text-sm">
        Business date
        <Input
          type="date"
          className="w-44"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
        />
      </label>

      {failed && (
        <p className="text-sm text-destructive">Could not load the report.</p>
      )}
      {!report && !failed && (
        <p className="text-sm text-muted-foreground">Loading...</p>
      )}

      {report && report.totals.orders === 0 && (
        <p className="text-sm text-muted-foreground">
          No orders saved for {report.date}. Upload screenshots on the Upload
          tab first.
        </p>
      )}

      {report && report.totals.orders > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label={`Total sales (${report.totals.orders} orders)`}
              value={formatRs(report.totals.sales)}
            />
            <Stat
              label="Paid"
              value={formatRs(report.totals.paid)}
              tone="text-emerald-700 dark:text-emerald-400"
            />
            <Stat
              label="Unpaid"
              value={formatRs(report.totals.unpaid)}
              tone="text-red-700 dark:text-red-400"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Unpaid</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.unpaid.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Everyone has paid for this day.
                </p>
              )}
              {report.unpaid.map((o) => (
                <div
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 first:border-t-0 first:pt-0"
                >
                  <div>
                    <div className="flex items-center gap-2 font-medium">
                      {o.name}
                      <StatusBadge status={o.pay_status} />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {o.phone ?? "No phone yet"} · owes {formatRs(o.balance)}
                      {o.paid_amount > 0 ? ` of ${formatRs(o.total)}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyMessage(o)}
                    >
                      Copy message
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPart(o)}
                    >
                      Part payment
                    </Button>
                    <Button size="sm" onClick={() => markPaid(o)}>
                      Mark paid
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Per customer</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.customers.map((c) => (
                    <TableRow key={c.key}>
                      <TableCell>
                        <div className="font-medium">{c.label}</div>
                        {!c.phone && (
                          <div className="text-xs text-muted-foreground">
                            No phone yet
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{c.orders}</TableCell>
                      <TableCell className="text-right">
                        {formatRs(c.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatRs(c.paid)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatRs(c.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <PartPaymentDialog
        order={part}
        onClose={() => setPart(null)}
        onDone={() => {
          setPart(null);
          void load();
        }}
      />
    </div>
  );
}
