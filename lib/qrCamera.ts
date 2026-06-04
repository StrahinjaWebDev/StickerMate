"use client";

import { persistDebug } from "@/lib/persistDebug";

const PREVIEW_TIMEOUT_MS = 12000;

type CameraErrorKind = "permission" | "unavailable";

export class QrCameraError extends Error {
  kind: CameraErrorKind;

  constructor(kind: CameraErrorKind, message?: string) {
    super(message ?? kind);
    this.name = "QrCameraError";
    this.kind = kind;
  }
}

const cameraConstraints: MediaStreamConstraints[] = [
  { video: { facingMode: { ideal: "environment" } }, audio: false },
  { video: { facingMode: "environment" }, audio: false },
  { video: true, audio: false }
];

/** Request rear camera when possible; fall back to default camera on iOS/Safari. */
export async function requestQrCameraStream(): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new QrCameraError("unavailable");
  }

  let lastError: unknown = null;

  for (const constraints of cameraConstraints) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      persistDebug("qr-camera-stream", {
        facingMode: JSON.stringify(constraints.video)
      });
      return stream;
    } catch (error) {
      lastError = error;
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        throw new QrCameraError("permission");
      }
      persistDebug("qr-camera-constraint-failed", {
        facingMode: JSON.stringify(constraints.video),
        error: String(error)
      });
    }
  }

  if (lastError instanceof DOMException && lastError.name === "NotAllowedError") {
    throw new QrCameraError("permission");
  }

  throw new QrCameraError("unavailable");
}

function configureVideoElement(video: HTMLVideoElement) {
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
}

/** Attach stream and wait until Safari/iOS actually starts rendering frames. */
export async function attachStreamToVideoPreview(video: HTMLVideoElement, stream: MediaStream): Promise<void> {
  configureVideoElement(video);
  video.srcObject = stream;

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      persistDebug("qr-camera-preview-ready", {
        width: video.videoWidth,
        height: video.videoHeight,
        readyState: video.readyState
      });
      resolve();
    };

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error instanceof Error ? error : new Error("video preview failed"));
    };

    const timeout = window.setTimeout(() => {
      fail(new Error("video preview timeout"));
    }, PREVIEW_TIMEOUT_MS);

    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onCanPlay);
    };

    const tryPlay = () => {
      const playResult = video.play();
      if (playResult && typeof playResult.catch === "function") {
        playResult.catch((error) => {
          persistDebug("qr-camera-play-rejected", { error: String(error) });
        });
      }
    };

    const onPlaying = () => finish();

    const onCanPlay = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        finish();
      }
    };

    const onLoadedMetadata = () => {
      tryPlay();
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        finish();
      }
    };

    video.addEventListener("playing", onPlaying, { once: true });
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("loadedmetadata", onLoadedMetadata);

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      onLoadedMetadata();
    } else {
      tryPlay();
    }
  });
}

export function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}
