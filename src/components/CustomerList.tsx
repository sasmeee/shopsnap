"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ListPagination } from "@/components/ListPagination";
import { usePagination } from "@/hooks/usePagination";
import { formatRs } from "@/lib/messages";

type Customer = {
  phone: string;
  nickname: string | null;
  aliases: string | null;
  orders: number;
  total: number;
  balance: number;
};

function NicknameCell({
  customer,
  onSaved,
}: {
  customer: Customer;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(customer.nickname ?? "");

  async function save() {
    const next = value.trim();
    if (next === (customer.nickname ?? "")) return;
    try {
      const res = await fetch("/api/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: customer.phone, nickname: next || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save");
      toast.success("Name saved");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  }

  return (
    <Input
      value={value}
      placeholder="Add a name"
      className="w-48"
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

export function CustomerList() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Customer[] | null>(null);
  const { pageItems, page, totalPages, setPage, reset } = usePagination(
    rows ?? [],
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setRows(json.customers);
    } catch {
      toast.error("Could not load customers");
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search by name or number"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          reset();
        }}
        className="max-w-sm"
      />

      {rows === null && (
        <p className="text-sm text-muted-foreground">Loading...</p>
      )}
      {rows !== null && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {q.trim()
            ? "No customers match that search."
            : "No customers yet. They appear after you confirm an order with a phone number."}
        </p>
      )}

      {rows !== null && rows.length > 0 && (
        <Card>
          <CardContent className="py-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Saved chat names</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((c) => (
                  <TableRow key={c.phone}>
                    <TableCell className="font-medium">{c.phone}</TableCell>
                    <TableCell>
                      <NicknameCell
                        key={`${c.phone}-${c.nickname ?? ""}`}
                        customer={c}
                        onSaved={load}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.aliases ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">{c.orders}</TableCell>
                    <TableCell className="text-right">
                      {formatRs(c.total)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${c.balance > 0 ? "font-medium text-destructive" : ""}`}
                    >
                      {formatRs(c.balance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ListPagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
