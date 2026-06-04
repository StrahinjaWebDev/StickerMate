"use client";

import { persistDebug } from "@/lib/persistDebug";

const PREVIEW_TIMEOUT_MS = 10000;
const PREVIEW_POLL_FRAMES = 300;

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
  { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
  { video: true, audio: false }
];

function isPermissionError(error: unknown) {
  return error instanceof DOMException && error.name === "NotAllowedError";
}

/** Request rear camera when possible; fall back to default camera on iOS/Safari. */
export async function requestQrCameraStream(): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new QrCameraError("unavailable");
  }

  let lastError: unknown = null;

  for (const constraints of cameraConstraints) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getVideoTracks().forEach((track) => {
        track.enabled = true;
      });
      persistDebug("qr-camera-stream", {
        facingMode: JSON.stringify(constraints.video),
        trackState: stream.getVideoTracks()[0]?.readyState ?? "none"
      });
      return stream;
    } catch (error) {
      lastError = error;
      if (isPermissionError(error)) {
        throw new QrCameraError("permission");
      }
      persistDebug("qr-camera-constraint-failed", {
        facingMode: JSON.stringify(constraints.video),
        error: String(error)
      });
    }
  }

  if (isPermissionError(lastError)) {
    throw new QrCameraError("permission");
  }

  throw new QrCameraError("unavailable");
}

function configureVideoElement(video: HTMLVideoElement) {
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.controls = false;
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  video.setAttribute("autoplay", "true");
  video.setAttribute("muted", "true");
}

function attemptVideoPlay(video: HTMLVideoElement) {
  const playResult = video.play();
  if (playResult && typeof playResult.catch === "function") {
    playResult.catch((error) => {
      persistDebug("qr-camera-play-rejected", { error: String(error) });
    });
  }
}

function isPreviewRenderable(video: HTMLVideoElement, stream: MediaStream) {
  if (video.videoWidth > 0 && video.videoHeight > 0) return true;
  const track = stream.getVideoTracks()[0];
  return Boolean(track && track.readyState === "live" && track.enabled && !track.muted);
}

/** Attach stream and wait until Safari/iOS actually starts rendering frames. */
export async function attachStreamToVideoPreview(video: HTMLVideoElement, stream: MediaStream): Promise<void> {
  configureVideoElement(video);
  video.srcObject = stream;
  attemptVideoPlay(video);

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let pollFrame = 0;
    let pollId = 0;

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      attemptVideoPlay(video);
      persistDebug("qr-camera-preview-ready", {
        width: video.videoWidth,
        height: video.videoHeight,
        readyState: video.readyState,
        trackState: stream.getVideoTracks()[0]?.readyState ?? "none"
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
      if (isPreviewRenderable(video, stream)) {
        finish();
        return;
      }
      fail(new Error("video preview timeout"));
    }, PREVIEW_TIMEOUT_MS);

    const cleanup = () => {
      window.clearTimeout(timeout);
      if (pollId) window.cancelAnimationFrame(pollId);
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("playing", onReady);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("resize", onReady);
    };

    const onReady = () => {
      if (isPreviewRenderable(video, stream)) {
        finish();
      } else {
        attemptVideoPlay(video);
      }
    };

    const poll = () => {
      if (settled) return;
      pollFrame += 1;
      if (isPreviewRenderable(video, stream)) {
        finish();
        return;
      }
      if (pollFrame % 15 === 0) {
        attemptVideoPlay(video);
      }
      if (pollFrame >= PREVIEW_POLL_FRAMES) {
        if (stream.getVideoTracks()[0]?.readyState === "live") {
          finish();
          return;
        }
      }
      pollId = window.requestAnimationFrame(poll);
    };

    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("playing", onReady);
    video.addEventListener("canplay", onReady);
    video.addEventListener("resize", onReady);

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      onReady();
    }

    pollId = window.requestAnimationFrame(poll);
  });
}

export function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function cameraErrorMessageKey(error: unknown): "friendQr.cameraPermissionDenied" | "friendQr.cameraUnavailable" {
  if (error instanceof QrCameraError && error.kind === "permission") {
    return "friendQr.cameraPermissionDenied";
  }
  return "friendQr.cameraUnavailable";
}
