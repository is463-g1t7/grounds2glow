"use client";

import dynamic from "next/dynamic";

type KioskChatProps = {
  className?: string;
  embedded?: boolean;
};

function ChatFallback() {
  return (
    <div className="flex h-full min-h-[260px] w-full items-center justify-center text-sm text-smu-muted">
      Loading chat…
    </div>
  );
}

const KioskChat = dynamic(() => import("./kiosk-chat").then((mod) => mod.KioskChat), {
  ssr: false,
  loading: () => <ChatFallback />,
});

/** Splits the chat/markdown bundle out of the landing and kiosk route bundles. */
export function KioskChatDynamic(props: KioskChatProps) {
  return <KioskChat {...props} />;
}
