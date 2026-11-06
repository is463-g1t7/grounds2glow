"use client";

import { ChatbotSection } from "@/components/landing/chatbot-section";
import { DashboardSection } from "@/components/landing/dashboard-section";
import { DemoRouteSection } from "@/components/landing/demo-route-section";
import { ImpactSection } from "@/components/landing/impact-section";
import { LoopHero } from "@/components/landing/loop-hero";
import { PantrySection } from "@/components/landing/pantry-section";
import { useBootstrap } from "@/lib/client/use-bootstrap";
import { useNow } from "@/lib/client/use-now";

export default function Home() {
  const { data, loading, error } = useBootstrap(4000);
  const now = useNow();
  const { bins, events, cleaners, metrics } = data;

  return (
    <>
      <LoopHero bins={bins} events={events} loading={loading} error={error} now={now} />
      <PantrySection cleaners={cleaners} />
      <DashboardSection
        bins={bins}
        events={events}
        cleaners={cleaners}
        loading={loading}
        error={error}
        now={now}
      />
      <ChatbotSection />
      <ImpactSection metrics={metrics} />
      <DemoRouteSection events={events} />
    </>
  );
}
