"use client";

import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadPanel } from "@/components/UploadPanel";
import { PendingList } from "@/components/PendingList";
import { useModelSetup } from "@/hooks/useModelSetup";
import { ReportView } from "@/components/ReportView";
import { CustomerList } from "@/components/CustomerList";

function Gate({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>ShopSnap</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">{children}</CardContent>
      </Card>
    </main>
  );
}

export default function Home() {
  const { state, retry } = useModelSetup();
  const [tab, setTab] = useState("upload");
  const [pending, setPending] = useState(0);

  const ready = state.phase === "ready";

  useEffect(() => {
    if (!ready) return;
    fetch("/api/pending")
      .then((r) => r.json())
      .then((j) => setPending(j.groups.length))
      .catch(() => {});
  }, [tab, ready]);

  if (state.phase === "checking") {
    return (
      <Gate>
        <p>Starting up...</p>
      </Gate>
    );
  }

  if (state.phase === "no-ollama") {
    return (
      <Gate>
        <p>
          ShopSnap needs the free Ollama app to run AI on this computer. Install
          and open it. This page continues by itself.
        </p>
        <a
          href="https://ollama.com/download"
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ className: "w-full" })}
        >
          Download Ollama
        </a>
      </Gate>
    );
  }

  if (state.phase === "downloading") {
    return (
      <Gate>
        <p>
          Setting up AI on this computer. One time only. Keep this page open.
        </p>
        <Progress value={state.percent} />
        <p className="text-muted-foreground">{state.percent}%</p>
      </Gate>
    );
  }

  if (state.phase === "error") {
    return (
      <Gate>
        <p>Setup failed. Check your internet and try again.</p>
        <Button onClick={retry} className="w-full">
          Try again
        </Button>
      </Gate>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">ShopSnap</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Turn WhatsApp order screenshots into a daily sales report. Runs on your
        PC.
      </p>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="pending">
            Pending{pending > 0 ? ` (${pending})` : ""}
          </TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        {/* keepMounted: switching tabs must not wipe orders under review */}
        <TabsContent value="upload" keepMounted className="pt-4">
          <UploadPanel />
        </TabsContent>
        <TabsContent value="pending" className="pt-4">
          <PendingList onChanged={setPending} />
        </TabsContent>
        <TabsContent value="report" className="pt-4">
          <ReportView />
        </TabsContent>
        <TabsContent value="customers" className="pt-4">
          <CustomerList />
        </TabsContent>
      </Tabs>
    </main>
  );
}
