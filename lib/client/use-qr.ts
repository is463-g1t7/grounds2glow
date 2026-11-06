"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** QR code for a path on the current origin, as a data URL. Empty until generated. */
export function useQr(path: string) {
  const [qr, setQr] = useState("");

  useEffect(() => {
    QRCode.toDataURL(`${window.location.origin}${path}`, {
      color: { dark: "#141B4D", light: "#ffffff" },
      errorCorrectionLevel: "M",
      margin: 2,
      width: 480,
    })
      .then(setQr)
      .catch(() => setQr(""));
  }, [path]);

  return qr;
}
