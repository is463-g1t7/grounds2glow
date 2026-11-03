"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Coffee,
  Copy,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { PageHeader } from "@/components/smu/PageChrome";
import { Toast } from "@/components/smu/Toast";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageAvatar,
  MessageContent,
} from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { PromptInput } from "@/components/ai-elements/prompt-input";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import { Reasoning } from "@/components/ai-elements/reasoning";
import { Tool } from "@/components/ai-elements/tool";
import { Plan } from "@/components/ai-elements/plan";
import { Sources } from "@/components/ai-elements/sources";
import { Loader } from "@/components/ai-elements/loader";
import { aiPrompts, getAiReply, type AiReply } from "@/lib/ai";
import { ago } from "@/lib/analytics";
import { useBootstrap } from "@/lib/client/use-bootstrap";

type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; text: string; reply: AiReply };

const starterPrompts = aiPrompts;

export function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const params = useSearchParams();
  const data = useBootstrap();
  const available = data.data.listings.filter((l) => !l.claimed);
  const largest = [...available].sort((a, b) => b.weightKg - a.weightKg)[0];
  const co2 = data.data.metrics.find((m) => m.key === "co2")?.value ?? "-";
  const latestEvent = data.data.events[0]?.at;
  const synced = latestEvent ? ago(latestEvent) : "no events yet";
  const endRef = useRef<HTMLDivElement>(null);
  const initialSent = useRef(false);
  const timerRef = useRef<number | null>(null);

  const send = (text: string) => {
    const prompt = text.trim();
    if (!prompt || thinking) return;
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text: prompt },
    ]);
    setInput("");
    setThinking(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      const reply = getAiReply(prompt, data.data);
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", text: reply.content, reply },
      ]);
      setThinking(false);
    }, 1100);
  };

  useEffect(() => {
    if (initialSent.current) return;
    const q = params.get("q");
    if (q) {
      initialSent.current = true;
      const timer = window.setTimeout(() => send(q), 0);
      return () => window.clearTimeout(timer);
    }
  }, [params]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  const reset = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setMessages([]);
    setThinking(false);
    setInput("");
    setToast("New conversation started.");
  };

  return (
    <>
      <PageHeader
        title="Grounds AI"
        lead="Ask about live bin levels, ground matches, environmental impact or collection planning. Answers draw on current campus data."
        crumbs={[{ label: "Home", href: "/" }, { label: "Grounds AI" }]}
        className="pb-8 pt-[132px] md:pb-9 md:pt-[148px]"
        actions={
          <>
            <button type="button" onClick={reset} className="btn-smu btn-smu-outline">
              <RotateCcw className="h-3.5 w-3.5" /> New conversation
            </button>
            <Link href="/dashboard" className="btn-smu btn-smu-gold">
              Open dashboard <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </>
        }
      />

      <section className="bg-smu-cream pb-16 md:pb-20">
        <div className="container-smu">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="flex min-h-[600px] flex-col overflow-hidden rounded-lg border border-black/8 bg-white shadow-card lg:col-span-8 lg:h-[calc(100vh-330px)] lg:min-h-[540px]">
              <div className="flex items-center gap-3 border-b border-black/8 px-4 py-3.5 md:px-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-smu-gold/15 text-smu-gold">
                  <Sparkles className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-[18px] uppercase leading-5 tracking-[0.4px] text-smu-navy">
                    Grounds AI
                  </p>
                  <p className="flex items-center gap-1.5 text-[11.5px] text-smu-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-smu-success" />
                    Online · live campus context
                  </p>
                </div>
                <span className="ml-auto rounded-full border border-smu-gold/30 bg-smu-gold/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.8px] text-smu-gold-dark">
                  AI assistant
                </span>
              </div>

              <Conversation className="scrollbar-thin bg-white">
                {messages.length === 0 ? (
                  <ConversationEmptyState
                    icon={<Coffee className="h-7 w-7" />}
                    title="Good grounds start with a good question."
                    description="I can see every bin, batch and kilogram across campus. Ask me to find a match, explain the impact or plan a pickup."
                  >
                    <Suggestions className="justify-center">
                      {starterPrompts.map((prompt) => (
                        <Suggestion key={prompt} onClick={() => send(prompt)}>
                          {prompt}
                        </Suggestion>
                      ))}
                    </Suggestions>
                  </ConversationEmptyState>
                ) : (
                  <ConversationContent>
                    <div className="space-y-8">
                      {messages.map((message) =>
                        message.role === "user" ? (
                          <Message key={message.id} from="user">
                            <MessageContent className="items-end">
                              <div className="rounded-2xl rounded-tr-sm bg-smu-navy px-4 py-2.5 text-[14.5px] leading-6 text-white">
                                {message.text}
                              </div>
                              <MessageActions>
                                <MessageAction
                                  label="Copy message"
                                  onClick={() => {
                                    navigator.clipboard.writeText(message.text);
                                    setToast("Message copied.");
                                  }}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </MessageAction>
                              </MessageActions>
                            </MessageContent>
                          </Message>
                        ) : (
                          <Message key={message.id} from="assistant">
                            <MessageAvatar>G</MessageAvatar>
                            <MessageContent className="max-w-[calc(100%-44px)] gap-3">
                              {message.reply.reasoning && (
                                <Reasoning steps={message.reply.reasoning} />
                              )}
                              {message.reply.tool && (
                                <Tool
                                  name={message.reply.tool.name}
                                  input={message.reply.tool.input}
                                  output={message.reply.tool.output}
                                />
                              )}
                              {message.reply.plan && <Plan steps={message.reply.plan} />}
                              <Response>{message.text}</Response>
                              {message.reply.sources && <Sources sources={message.reply.sources} />}
                              <MessageActions>
                                <MessageAction
                                  label="Copy response"
                                  onClick={() => {
                                    navigator.clipboard.writeText(message.text);
                                    setToast("Response copied.");
                                  }}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </MessageAction>
                                <MessageAction
                                  label="Good response"
                                  onClick={() => setToast("Thanks — feedback recorded.")}
                                >
                                  <ThumbsUp className="h-3.5 w-3.5" />
                                </MessageAction>
                                <MessageAction
                                  label="Bad response"
                                  onClick={() => setToast("Thanks — we'll use this to improve.")}
                                >
                                  <ThumbsDown className="h-3.5 w-3.5" />
                                </MessageAction>
                                <MessageAction
                                  label="Ask again"
                                  onClick={() => {
                                    const lastUser = [...messages]
                                      .reverse()
                                      .find((m) => m.role === "user");
                                    if (lastUser) send(lastUser.text);
                                  }}
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </MessageAction>
                              </MessageActions>
                            </MessageContent>
                          </Message>
                        )
                      )}

                      {thinking && (
                        <Message from="assistant">
                          <MessageAvatar>G</MessageAvatar>
                          <MessageContent>
                            <div className="flex items-center gap-3 rounded-lg border border-black/8 bg-white px-3 py-2.5">
                              <Loader />
                              <span className="shimmer text-[12.5px] font-medium">
                                Reading live bin data…
                              </span>
                            </div>
                          </MessageContent>
                        </Message>
                      )}
                      <div ref={endRef} />
                    </div>
                  </ConversationContent>
                )}
              </Conversation>

              <div className="border-t border-black/8 bg-white p-3 md:p-4">
                <div className="mb-2 flex flex-wrap gap-2">
                  {["Largest batch ready now", "Find 20 kg for a garden", "Term CO₂e saved"].map(
                    (prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => send(prompt)}
                        className="rounded-full border border-smu-gold/40 px-2.5 py-1 text-[11.5px] text-smu-gold-dark transition-colors hover:border-smu-gold hover:bg-smu-gold/5"
                      >
                        {prompt}
                      </button>
                    )
                  )}
                </div>
                <PromptInput
                  value={input}
                  onChange={setInput}
                  onSubmit={() => send(input)}
                  disabled={thinking}
                />
                <p className="mt-2 text-center text-[10.5px] text-black/35">
                  Grounds AI is a prototype. Verify operational decisions against the live dashboard.
                </p>
              </div>
            </div>

            <aside className="space-y-5 lg:col-span-4">
              <div className="rounded-md bg-white p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-[24px] leading-8 text-smu-navy">
                    Live campus context
                  </h2>
                  <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.7px] text-[#287a28]">
                    <span className="h-1.5 w-1.5 rounded-full bg-smu-success" />
                    Live
                  </span>
                </div>
                <dl className="mt-4 space-y-3.5">
                  {[
                    ["Bins reporting", `${data.data.bins.filter((b) => b.weightKg !== undefined).length} / ${data.data.bins.length}`],
                    ["Batches available", String(available.length)],
                    ["Largest batch", largest ? `${largest.weightKg.toFixed(1)} kg · ${largest.building.split(" ").slice(-1)[0]}` : "—"],
                    ["Term CO₂e avoided", co2],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 border-b border-black/6 pb-3 last:border-0 last:pb-0">
                      <dt className="text-[12.5px] text-smu-muted">{label}</dt>
                      <dd className="text-[13px] font-semibold text-smu-navy">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 text-[11px] text-black/40">Last event {synced}.</p>
                <div className="mt-4 flex gap-2">
                  <Link href="/dashboard" className="btn-smu btn-smu-outline flex-1">
                    Dashboard
                  </Link>
                  <Link href="/marketplace" className="btn-smu btn-smu-outline flex-1">
                    Marketplace
                  </Link>
                </div>
              </div>

              <div className="rounded-md bg-white p-5 shadow-card">
                <h2 className="font-display text-[24px] leading-8 text-smu-navy">Ask about</h2>
                <ul className="mt-3 space-y-1">
                  {[
                    "Which pantry has the most grounds ready?",
                    "Find 20 kg for a community garden",
                    "How much CO₂e have we avoided this term?",
                    "Schedule a pickup from SCIS tomorrow",
                  ].map((prompt) => (
                    <li key={prompt}>
                      <button
                        type="button"
                        onClick={() => send(prompt)}
                        className="flex w-full items-center justify-between gap-2 rounded px-2 py-2 text-left text-[12.5px] leading-5 text-smu-muted transition-colors hover:bg-smu-cream hover:text-smu-navy"
                      >
                        {prompt}
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-smu-gold" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-md border-t-2 border-smu-gold bg-smu-navy p-5 text-white shadow-card">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-smu-gold-light" />
                  <h2 className="font-display text-[19px] uppercase tracking-[0.5px]">
                    How it answers
                  </h2>
                </div>
                <p className="mt-2 text-[12.5px] leading-6 text-white/65">
                  Grounds AI reads live bin telemetry, marketplace listings and the OCIS impact
                  methodology. It shows its sources and tool calls so you can check the work.
                </p>
                <Link href="/dashboard#impact" className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-smu-gold-light hover:text-white">
                  See the methodology <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {toast && <Toast message={toast} onClose={() => setToast(null)} tone="info" />}
    </>
  );
}
