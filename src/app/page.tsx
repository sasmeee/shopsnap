"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChartColumn, Clock, ShieldCheck, Upload, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadPanel } from "@/components/UploadPanel";
import { PendingList } from "@/components/PendingList";
import { useModelSetup } from "@/hooks/useModelSetup";
import { ReportView } from "@/components/ReportView";
import { CustomerList } from "@/components/CustomerList";
import { ThemeToggle } from "@/components/ThemeToggle";
import LogoLight from "@/../public/logo.svg";
import LogoDark from "@/../public/logo-dark.svg";

function Logo() {
  return (
    <>
      <Image
        src={LogoLight}
        alt=""
        width={36}
        height={36}
        priority
        className="size-9 rounded-lg dark:hidden"
      />
      <Image
        src={LogoDark}
        alt=""
        width={36}
        height={36}
        priority
        className="hidden size-9 rounded-lg dark:block"
      />
    </>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Logo />
            <CardTitle className="font-heading text-lg">ShopSnap</CardTitle>
          </div>
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
    <>
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <h1 className="font-heading text-lg leading-tight font-semibold">
                ShopSnap
              </h1>
              <p className="text-xs text-muted-foreground">
                WhatsApp orders to a daily report
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Runs on this PC
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-10">
            <TabsTrigger value="upload" className="px-3">
              <Upload aria-hidden="true" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="pending" className="px-3">
              <Clock aria-hidden="true" />
              Pending
              {pending > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-[11px] leading-5 text-primary-foreground">
                  {pending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="report" className="px-3">
              <ChartColumn aria-hidden="true" />
              Report
            </TabsTrigger>
            <TabsTrigger value="customers" className="px-3">
              <Users aria-hidden="true" />
              Customers
            </TabsTrigger>
          </TabsList>

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

      <footer className="mx-auto w-full max-w-5xl px-6 py-6 text-xs text-muted-foreground">
        Your orders and customer numbers stay on this computer.
      </footer>
    </>
  );
}
