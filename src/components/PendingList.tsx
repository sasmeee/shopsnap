"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { formatRs } from "@/lib/messages";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListPagination } from "@/components/ListPagination";
import { usePagination } from "@/hooks/usePagination";
import { normalizePhone } from "@/lib/phone";

type Group = {
  name: string;
  orders: number;
  total: number;
  balance: number;
  first_date: string;
  last_date: string;
};

type Customer = {
  phone: string;
  nickname: string | null;
  aliases: string | null;
};

function AssignDialog({
  group,
  onClose,
  onDone,
}: {
  group: Group | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [mode, setMode] = useState("existing");
  const [q, setQ] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [newPhone, setNewPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!group) return;

    const timeout = setTimeout(() => {
      setMode("existing");
      setQ("");
      setSelected(null);
      setNewPhone("");
    }, 0);

    return () => clearTimeout(timeout);
  }, [group]);

  useEffect(() => {
    if (!group || mode !== "existing") return;
    let cancelled = false;
    fetch(`/api/customers?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setCustomers(j.customers);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [group, mode, q]);

  const newValid = normalizePhone(newPhone) !== null;
  const phone = mode === "existing" ? selected : newValid ? newPhone : null;

  async function submit() {
    if (!group || !phone) return;
    setSaving(true);
    try {
      const res = await fetch("/api/pending/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingName: group.name, phone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not assign");
      toast.success(
        `${json.attached} order${json.attached === 1 ? "" : "s"} attached to ${json.phone}`,
      );
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not assign");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={group !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign a phone to “{group?.name}”</DialogTitle>
          <DialogDescription>
            All {group?.orders} pending order(s) with this name get attached.
            Next screenshot with this chat name will fill the phone
            automatically.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={setMode}>
          <TabsList>
            <TabsTrigger value="existing">Existing customer</TabsTrigger>
            <TabsTrigger value="new">New number</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-2 pt-3">
            <Input
              placeholder="Search by name or number"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {customers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No customers found.
                </p>
              )}
              {customers.map((c) => (
                <button
                  key={c.phone}
                  type="button"
                  onClick={() => setSelected(c.phone)}
                  className={`w-full rounded border p-2 text-left text-sm ${
                    selected === c.phone ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="font-medium">{c.phone}</div>
                  <div className="text-xs text-muted-foreground">
                    {[c.nickname, c.aliases].filter(Boolean).join(" · ") ||
                      "No name saved"}
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="new" className="space-y-2 pt-3">
            <Input
              placeholder="+94 77 123 4567"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
            {newPhone.trim() && !newValid && (
              <p className="text-sm text-destructive">
                That phone number is not valid.
              </p>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!phone || saving} onClick={submit}>
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PendingList({
  onChanged,
}: {
  onChanged?: (count: number) => void;
}) {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [active, setActive] = useState<Group | null>(null);
  // keep this hook above the early returns.
  const { pageItems, page, totalPages, setPage } = usePagination(groups ?? []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/pending");
      const json = await res.json();
      setGroups(json.groups);
      onChanged?.(json.groups.length);
    } catch {
      toast.error("Could not load pending orders");
    }
  }, [onChanged]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load();
    }, 0);

    return () => clearTimeout(timeout);
  }, [load]);

  if (groups === null) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing pending. Orders from chats with a name and no number show up
        here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        These chats showed a name but no number. Assign a phone once and
        ShopSnap remembers the name for next time.
      </p>
      {pageItems.map((g) => (
        <Card key={g.name}>
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div>
              <div className="font-medium">{g.name}</div>
              <div className="text-sm text-muted-foreground">
                {g.orders} order{g.orders === 1 ? "" : "s"} ·{" "}
                {formatRs(g.total)}
                {g.balance > 0
                  ? ` · owes ${formatRs(g.balance)}`
                  : " · paid"} · {g.first_date}
                {g.last_date !== g.first_date ? ` to ${g.last_date}` : ""}
              </div>
            </div>
            <Button onClick={() => setActive(g)}>Assign phone</Button>
          </CardContent>
        </Card>
      ))}
      <ListPagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
      <AssignDialog
        group={active}
        onClose={() => setActive(null)}
        onDone={() => {
          setActive(null);
          void load();
        }}
      />
    </div>
  );
}
