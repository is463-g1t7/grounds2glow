import type { ReactNode } from "react";

export default function KioskLayout({ children }: { children: ReactNode }) {
  // Standalone kiosk surface: global root font/theme, no site header/footer.
  return <div className="flex min-h-screen flex-1 flex-col">{children}</div>;
}
