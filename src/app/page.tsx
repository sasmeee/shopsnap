"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadPanel } from "@/components/UploadPanel";
import { PendingList } from "@/components/PendingList";

export default function Home() {
  const [tab, setTab] = useState("upload");
  const [pending, setPending] = useState(0);

  useEffect(() => {
    fetch("/api/pending")
      .then((r) => r.json())
      .then((j) => setPending(j.groups.length))
      .catch(() => {});
  }, [tab]);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">ShopSnap</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Turn WhatsApp order screenshots into a daily sales report. Runs on your
        PC.
      </p>
      <Tabs defaultValue="upload" value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="pending">
            Pending{pending > 0 ? ` (${pending})` : ""}
          </TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        {/* forceMount keeps review work alive when switching tabs */}
        <TabsContent
          value="upload"
          className="pt-4 data-[state=inactive]:hidden"
        >
          <UploadPanel />
        </TabsContent>
        <TabsContent value="pending" className="pt-4">
          <PendingList onChanged={setPending} />
        </TabsContent>
        <TabsContent
          value="report"
          className="pt-4 text-sm text-muted-foreground"
        >
          Coming next.
        </TabsContent>
        <TabsContent
          value="customers"
          className="pt-4 text-sm text-muted-foreground"
        >
          Coming next.
        </TabsContent>
      </Tabs>
    </main>
  );
}
