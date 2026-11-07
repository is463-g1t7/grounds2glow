"use client";

import { useEffect, useRef, useState } from "react";

/** Copies the current video frame. It comes from the raw video, so it isn't mirrored like the preview. */
export function grabFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const frame = document.createElement("canvas");
  frame.width = video.videoWidth;
  frame.height = video.videoHeight;
  frame.getContext("2d")?.drawImage(video, 0, 0);
  return frame;
}

export function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError") {
    return "Camera permission was blocked. Allow the camera in your browser's address bar, then try again.";
  }
  if (name === "NotFoundError") return "No camera was found on this device.";
  if (name === "NotReadableError") {
    return "The camera is being used by another app. Close that app, then try again.";
  }
  return "The camera couldn't start. Browsers only allow camera access on localhost or HTTPS.";
}

/** Asks for the sharpest image the camera offers, from the rear camera on a phone. */
export const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
  audio: false,
};

/** A front camera feels natural as a mirror. A phone's rear camera would look backwards. */
export function isMirrored(stream: MediaStream): boolean {
  return stream.getVideoTracks()[0]?.getSettings().facingMode !== "environment";
}

/** A camera preview that can take a photo. The camera stays off until `start` is called. */
export function useCamera() {
  const [status, setStatus] = useState<"idle" | "starting" | "live">("idle");
  const [error, setError] = useState<string | null>(null);
  const [mirrored, setMirrored] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  /** Identifies the latest start. Stopping or unmounting changes it, so a late camera is discarded. */
  const startIdRef = useRef(0);

  useEffect(() => {
    const startId = startIdRef;
    return () => {
      startId.current++;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  function stop() {
    startIdRef.current++;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStatus("idle");
  }

  async function start() {
    const startId = ++startIdRef.current;
    setError(null);
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
      if (startId !== startIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setMirrored(isMirrored(stream));
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      if (startId === startIdRef.current) setStatus("live");
    } catch (err) {
      if (startId !== startIdRef.current) return;
      stop();
      setError(cameraErrorMessage(err));
    }
  }

  /** Stops the camera and returns the current frame, or null if the video isn't ready yet. */
  function capture(): HTMLCanvasElement | null {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const frame = grabFrame(video);
    stop();
    return frame;
  }

  return { videoRef, status, error, mirrored, start, stop, capture };
}
