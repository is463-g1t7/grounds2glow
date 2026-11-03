"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { PromptInput } from "@/components/ai-elements/prompt-input";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import { Loader } from "@/components/ai-elements/loader";

type ChatMessage = { role: "user" | "assistant"; content: string };
type QuizAnswer = { label: string; value: string };

const quizQuestions: { question: string; answers: QuizAnswer[] }[] = [
  {
    question: "1. How would you describe your skin?",
    answers: [
      { label: "Normal", value: "normal" },
      { label: "Dry", value: "dry" },
      { label: "Oily", value: "oily" },
      { label: "Sensitive or easily irritated", value: "sensitive" },
    ],
  },
  {
    question:
      "2. Do you currently have any skin irritation, sunburn, broken skin or known allergies to the ingredients?",
    answers: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
  },
  {
    question: "3. What level of exfoliation do you prefer?",
    answers: [
      { label: "Gentle", value: "gentle" },
      { label: "Moderate", value: "moderate" },
    ],
  },
  {
    question: "4. What texture would you prefer?",
    answers: [
      { label: "Light and grainy", value: "light-grainy" },
      { label: "More moisturising", value: "moisturising" },
    ],
  },
];

function getBuiltInGuidance(question: string): string | null {
  const text = question.toLowerCase();
  if (/(what is this|what'?s this|what is grounds to glow|tell me about this)/.test(text)) {
    return "This is Grounds to Glow, an initiative by SMU’s Office of Campus Infrastructure & Services (OCIS). The kiosk gives used coffee grounds from across SMU a second life as a DIY body scrub, helping reduce campus waste, raise environmental awareness and promote circularity.";
  }
  if (/(what can i do|what do i do|how does this work|help me get started|where do i start)/.test(text)) {
    return "Here, you can learn how SMU repurposes used coffee grounds, take the “Find Your Coffee Scrub” skincare quiz, review your recommended recipe, and use the smart dispenser.\n\nPlace a provided paper cup under the dispenser, choose your recipe, dispense the ingredients, optionally add 1–2 drops of essential oil, and mix with the provided spoon. Use the scrub immediately.";
  }
  if (/(free|cost|charge|price|pay|payment)/.test(text)) {
    return "Yes. It is free of charge to use the Grounds to Glow kiosk and dispense coffee scrubs.";
  }
  if (/(mix|make|recipe|ingredient|amount|quantit)/.test(text)) {
    return "The standard one-use recipe is 5 g dried coffee grounds, 6 g sugar and 7.5 ml oil, measured by the smart dispenser.\n\n1. Place a provided paper cup under the dispenser.\n2. Choose the standard recipe or take the skincare quiz.\n3. Select “Dispense Coffee Scrub.”\n4. Optionally add 1–2 drops of an essential oil available at the kiosk.\n5. Mix thoroughly with the provided spoon and use immediately.";
  }
  if (/(who|behind|created|ocis)/.test(text)) {
    return "Grounds to Glow is an initiative by SMU’s Office of Campus Infrastructure & Services (OCIS). It was created to give used coffee grounds a second life beyond composting, reduce campus waste, raise environmental awareness and promote circularity in the SMU community.";
  }
  if (/(where|come from|collect|bin|building|volunteer|dehydrat|drying|kiosk work)/.test(text)) {
    return "Used coffee grounds are collected from staff pantries across SMU’s seven buildings in smart collection bins. Volunteers transport them to the kiosk, where a solar dehydrator dries the grounds before they are prepared for scrub use, subject to appropriate hygiene and safety checks. The kiosk’s smart dispenser then measures the main ingredients.";
  }
  if (/(benefit|benefits|antioxidant|exfoliat|good for (my )?skin|help (my )?skin|smooth(er)? skin)/.test(text)) {
    return "Coffee scrubs may help remove dead skin cells so skin feels smoother and softer, and exfoliation may temporarily improve its appearance and texture. Coffee contains antioxidant compounds, but the benefits of applying grounds directly to skin are not well established. Its aroma may also make exfoliation enjoyable.";
  }
  if (/(how (do|should|can) i (use|apply)|use (the|this) scrub|apply (the|this) scrub|in the shower|rinse (it|the scrub)|body skin)/.test(text)) {
    return "Apply a small amount to clean, damp body skin and massage gently in circular motions without excessive scrubbing. Do not use it on your face, around your eyes, or on broken or irritated skin. Rinse with lukewarm water and gently pat dry.";
  }
  if (/(sensitive|allerg|warning|face|eye|rash|reaction|itch|burn|irritat|damaged)/.test(text)) {
    return "Coffee grounds, sugar and essential oils may irritate sensitive or damaged skin. Check the ingredients for potential allergies, and do not apply the scrub to your face, around your eyes, or on broken or irritated skin. If you experience redness, itching, burning or discomfort, rinse immediately and discontinue use.";
  }
  if (/(store|keep|last|shelf)/.test(text)) {
    return "Use the scrub immediately after preparation. Do not store or reuse leftover scrub, to minimise the risk of microbial contamination.";
  }
  if (/(quiz|recommend|personal)/.test(text)) {
    return "The “Find Your Coffee Scrub” quiz can recommend:\n\n• Gentle Coffee Scrub: 3 g coffee grounds, 6 g sugar and 7.5 ml oil.\n• Standard Coffee Scrub: 5 g coffee grounds, 6 g sugar and 7.5 ml oil.\n• Moisturising Coffee Scrub: 5 g coffee grounds, 6 g sugar and 10 ml oil.\n\nCoffee scrub is not recommended for sensitive or easily irritated skin, or if you currently have irritation, sunburn, broken skin or relevant ingredient allergies.";
  }
  if (/(waste|environment|sustain|reuse|repurpose|circular|why)/.test(text)) {
    return "Grounds to Glow repurposes used coffee grounds into a DIY body scrub instead of treating them as immediate waste. The proposed SMU initiative aims to reduce campus waste, increase environmental awareness and promote circularity within the SMU community.";
  }
  return null;
}

export function KioskChat({ className = "" }: { className?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I’m Grounds to Glow AI at Singapore Management University. Ask me about the project, collection process, kiosk, coffee scrub preparation, safe use, or the skincare quiz.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quizStep, setQuizStep] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [recommendation, setRecommendation] = useState<{
    name: string;
    coffee: number;
    sugar: number;
    oil: number;
  } | null>(null);
  const [quizWarning, setQuizWarning] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, quizStep]);

  const startQuiz = () => {
    setRecommendation(null);
    setQuizWarning(false);
    setQuizAnswers([]);
    setQuizStep(0);
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: `Find Your Coffee Scrub\n\n${quizQuestions[0].question}`,
      },
    ]);
  };

  const answerQuiz = (answer: QuizAnswer) => {
    if (quizStep === null) return;
    const answers = [...quizAnswers, answer.value];
    setQuizAnswers(answers);
    setMessages((current) => [...current, { role: "user", content: answer.label }]);

    const nextStep = quizStep + 1;
    if (nextStep < quizQuestions.length) {
      setQuizStep(nextStep);
      window.setTimeout(() => {
        setMessages((current) => [
          ...current,
          { role: "assistant", content: quizQuestions[nextStep].question },
        ]);
      }, 250);
      return;
    }

    const [skin, hasContraindication, exfoliation, texture] = answers;
    const shouldAvoid = skin === "sensitive" || hasContraindication === "yes";
    const matched = shouldAvoid
      ? null
      : skin === "dry" || texture === "moisturising"
        ? { name: "Moisturising Coffee Scrub", coffee: 5, sugar: 6, oil: 10 }
        : exfoliation === "gentle"
          ? { name: "Gentle Coffee Scrub", coffee: 3, sugar: 6, oil: 7.5 }
          : { name: "Standard Coffee Scrub", coffee: 5, sugar: 6, oil: 7.5 };
    setQuizWarning(shouldAvoid);
    setRecommendation(matched);
    setQuizStep(null);
    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: shouldAvoid
            ? "Based on your answers, do not use the scrub. The supplied safety guidance says to avoid it if you have sensitive or damaged skin, irritation, sunburn, broken skin, or known ingredient allergies."
            : `Quiz complete. Your result is ${matched?.name}. Review the recommended quantities below, then return to the kiosk to dispense.`,
        },
      ]);
    }, 250);
  };

  const sendMessage = async (text = input) => {
    const clean = text.trim();
    if (!clean || loading) return;
    setMessages((current) => [...current, { role: "user", content: clean }]);
    setInput("");
    setLoading(true);
    setQuizStep(null);

    const builtIn = getBuiltInGuidance(clean);
    if (builtIn) {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      setMessages((current) => [...current, { role: "assistant", content: builtIn }]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/kiosk-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ prompt: clean }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        content?: string;
        error?: string;
      };
      if (!response.ok || !body.content) {
        throw new Error(body.error ?? `Chat failed (${response.status}).`);
      }
      setMessages((current) => [
        ...current,
        { role: "assistant", content: body.content as string },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "I couldn't reach the live guide just now. I can still help with the SMU project, collection process, solar dehydrator, kiosk, recipe, skincare quiz, safe use and storage.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col bg-white ${className}`}>
      <Conversation className="scrollbar-thin">
        <ConversationContent className="max-w-3xl space-y-6">
          {messages.map((message, index) => (
            <Message key={index} from={message.role}>
              {message.role === "assistant" ? (
                <MessageAvatar>G</MessageAvatar>
              ) : null}
              <MessageContent className={message.role === "user" ? "items-end" : ""}>
                {message.role === "user" ? (
                  <div className="rounded-2xl rounded-tr-sm bg-smu-navy px-4 py-2.5 text-[14px] leading-6 text-white">
                    {message.content}
                  </div>
                ) : (
                  <Response>{message.content}</Response>
                )}
              </MessageContent>
            </Message>
          ))}

          {messages.length === 1 && (
            <Suggestions className="pl-11">
              {["What can I do here?", "How do I mix it?", "Why reuse coffee grounds?"].map(
                (prompt) => (
                  <Suggestion key={prompt} onClick={() => sendMessage(prompt)}>
                    {prompt}
                  </Suggestion>
                )
              )}
            </Suggestions>
          )}

          {quizStep !== null && (
            <div className="grid gap-2 pl-11 sm:grid-cols-2">
              {quizQuestions[quizStep].answers.map((answer) => (
                <button
                  key={answer.value}
                  type="button"
                  onClick={() => answerQuiz(answer)}
                  className="rounded border border-black/10 bg-white px-4 py-3 text-left text-[13px] font-semibold text-smu-navy shadow-sm transition-colors hover:border-smu-gold hover:bg-smu-gold/5"
                >
                  {answer.label}
                </button>
              ))}
            </div>
          )}

          {recommendation && (
            <section className="ml-11 rounded-md border border-black/10 bg-white p-4 shadow-card">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-smu-success/10 text-smu-success">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display text-[22px] leading-6 text-smu-navy">
                    {recommendation.name}
                  </h2>
                  <p className="text-[10.5px] uppercase tracking-[0.8px] text-black/40">
                    Body scrub · quiz recommendation
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  ["Coffee", recommendation.coffee, "g"],
                  ["Sugar", recommendation.sugar, "g"],
                  ["Oil", recommendation.oil, "ml"],
                ].map(([label, value, unit]) => (
                  <div key={label} className="rounded bg-smu-cream/60 p-3 text-center">
                    <span className="block font-display text-[22px] leading-6 text-smu-navy">{value}</span>
                    <span className="block text-[9px] font-bold uppercase tracking-[0.8px] text-black/40">
                      {unit}
                    </span>
                    <span className="mt-1 block text-[11px] font-semibold text-smu-muted">{label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-5 text-smu-muted">
                Patch test first. Use gentle pressure on damp body skin, avoid irritated areas and
                rinse well.
              </p>
            </section>
          )}

          {quizWarning && (
            <section className="ml-11 rounded-md border border-smu-danger/25 bg-smu-danger/5 p-4 text-[12.5px] leading-5 text-smu-danger">
              <strong className="block">Scrub not recommended</strong>
              Avoid using the scrub if you have sensitive or damaged skin, irritation, sunburn,
              broken skin, or known ingredient allergies. If irritation occurs, rinse immediately
              and discontinue use.
            </section>
          )}

          {loading && (
            <Message from="assistant">
              <MessageAvatar>G</MessageAvatar>
              <MessageContent>
                <div className="flex items-center gap-2 rounded border border-black/8 bg-white px-3 py-2.5">
                  <Loader />
                  <span className="shimmer text-[12px] font-medium">Checking the guide…</span>
                </div>
              </MessageContent>
            </Message>
          )}
          <div ref={endRef} />
        </ConversationContent>
      </Conversation>

      <div className="border-t border-black/8 bg-white p-3 md:p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={startQuiz}
            className="inline-flex items-center gap-1.5 rounded-full border border-smu-gold/40 bg-smu-gold/10 px-3 py-1.5 text-[11.5px] font-semibold text-smu-gold-dark transition-colors hover:bg-smu-gold/20"
          >
            <Sparkles className="h-3 w-3" /> Take skin quiz
          </button>
          <button
            type="button"
            onClick={() => {
              setMessages([
                {
                  role: "assistant",
                  content:
                    "Hi! I’m Grounds to Glow AI. Ask me about the project, the collection loop or coffee scrub care.",
                },
              ]);
              setQuizStep(null);
              setRecommendation(null);
              setQuizWarning(false);
            }}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-[11px] font-semibold text-smu-muted hover:text-smu-navy"
          >
            <RotateCcw className="h-3 w-3" /> New chat
          </button>
        </div>
        <PromptInput
          value={input}
          onChange={setInput}
          onSubmit={() => sendMessage()}
          disabled={loading}
          placeholder="Ask about your coffee scrub…"
        />
        <p className="mt-2 text-center text-[10px] text-black/30">
          Answers may use an AI model · don&apos;t share personal or medical information.
        </p>
      </div>
    </div>
  );
}
