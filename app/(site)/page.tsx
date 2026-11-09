"use client";

import { ChatbotSection } from "@/components/landing/chatbot-section";
import { DashboardSection } from "@/components/landing/dashboard-section";
import { IntroSection } from "@/components/landing/intro-section";
import { PantrySection } from "@/components/landing/pantry-section";
import { useBootstrap } from "@/lib/client/use-bootstrap";
import { useNow } from "@/lib/client/use-now";

export default function Home() {
  const { data, loading, error } = useBootstrap(4000);
  const now = useNow();
  const { bins, events, cleaners } = data;

  return (
    <>
      <IntroSection />
      <PantrySection />
      <DashboardSection
        bins={bins}
        events={events}
        cleaners={cleaners}
        loading={loading}
        error={error}
        now={now}
      />
      <ChatbotSection />
    </>
  );
}
