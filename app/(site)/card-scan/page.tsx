import { CardScanner } from "@/components/card-scan/card-scanner";
import { PageHeader } from "@/components/smu/page-chrome";

export const metadata = { title: "Card barcode test" };

export default function CardScanPage() {
  return (
    <>
      <PageHeader
        title="Card barcode test"
        lead="Open your camera and hold up your student card. Its barcode reads automatically, so you can see what it contains."
        crumbs={[{ label: "Home", href: "/" }, { label: "Tools" }, { label: "Card barcode test" }]}
      />
      <CardScanner />
    </>
  );
}
