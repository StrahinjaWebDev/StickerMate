"use client";

import { persistDebug } from "@/lib/persistDebug";

const PREVIEW_TIMEOUT_MS = 15000;

type CameraErrorKind = "permission" | "unavailable" | "preview";

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
  { video: true, audio: false }
];

function isPermissionError(error: unknown) {
  return error instanceof DOMException && error.name === "NotAllowedError";
}

export function isMobileSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return iOS && /AppleWebKit/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS|Chrome/.test(ua);
}

/** iOS Safari: mirror frames to canvas when direct <video> paint is unreliable. */
export function shouldUseCanvasPreview() {
  return isMobileSafari();
}

export async function requestQrCameraStream(): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new QrCameraError("unavailable");
  }

  persistDebug("qr-camera-permission-requested");

  let lastError: unknown = null;

  for (const constraints of cameraConstraints) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getVideoTracks().forEach((track) => {
        track.enabled = true;
      });
      persistDebug("qr-camera-stream-received", {
        constraint: JSON.stringify(constraints.video),
        trackState: stream.getVideoTracks()[0]?.readyState ?? "none",
        settings: JSON.stringify(stream.getVideoTracks()[0]?.getSettings?.() ?? {})
      });
      return stream;
    } catch (error) {
      lastError = error;
      if (isPermissionError(error)) {
        throw new QrCameraError("permission");
      }
      persistDebug("qr-camera-constraint-failed", {
        constraint: JSON.stringify(constraints.video),
        error: String(error)
      });
    }
  }

  if (isPermissionError(lastError)) {
    throw new QrCameraError("permission");
  }

  throw new QrCameraError("unavailable");
}

export function configureVideoElement(video: HTMLVideoElement) {
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

/** iOS needs a real layout box before srcObject or frames may never decode. */
export function syncVideoElementLayout(video: HTMLVideoElement, container: HTMLElement) {
  const width = Math.max(320, Math.floor(container.clientWidth || 320));
  const height = Math.max(240, Math.floor(container.clientHeight || 240));
  video.style.width = `${width}px`;
  video.style.height = `${height}px`;
  persistDebug("qr-camera-layout-synced", { width, height, containerW: container.clientWidth, containerH: container.clientHeight });
}

async function attemptVideoPlay(video: HTMLVideoElement) {
  try {
    await video.play();
    persistDebug("qr-camera-play-resolved", {
      width: video.videoWidth,
      height: video.videoHeight,
      readyState: video.readyState
    });
  } catch (error) {
    persistDebug("qr-camera-play-rejected", { error: String(error) });
  }
}

function hasVideoDimensions(video: HTMLVideoElement) {
  return video.videoWidth > 0 && video.videoHeight > 0;
}

export async function attachStreamToVideoElement(
  video: HTMLVideoElement,
  stream: MediaStream,
  container?: HTMLElement | null
): Promise<void> {
  if (container) {
    syncVideoElementLayout(video, container);
  }

  configureVideoElement(video);
  video.srcObject = stream;
  persistDebug("qr-camera-srcobject-assigned", {
    trackState: stream.getVideoTracks()[0]?.readyState ?? "none",
    layoutWidth: video.clientWidth,
    layoutHeight: video.clientHeight
  });

  await waitForVideoFrames(video);
}

async function waitForVideoFrames(video: HTMLVideoElement): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let pollId = 0;
    let pollCount = 0;

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      persistDebug("qr-camera-dimensions", {
        width: video.videoWidth,
        height: video.videoHeight,
        readyState: video.readyState
      });
      resolve();
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const timeout = window.setTimeout(() => {
      if (hasVideoDimensions(video)) {
        finish();
        return;
      }
      fail(new Error("video preview timeout"));
    }, PREVIEW_TIMEOUT_MS);

    const cleanup = () => {
      window.clearTimeout(timeout);
      if (pollId) window.cancelAnimationFrame(pollId);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("loadeddata", onLoadedMetadata);
      video.removeEventListener("playing", onLoadedMetadata);
      video.removeEventListener("canplay", onLoadedMetadata);
      video.removeEventListener("resize", onLoadedMetadata);
    };

    const onLoadedMetadata = () => {
      persistDebug("qr-camera-loadedmetadata", {
        width: video.videoWidth,
        height: video.videoHeight,
        readyState: video.readyState
      });
      void attemptVideoPlay(video);
      if (hasVideoDimensions(video)) finish();
    };

    const poll = () => {
      pollCount += 1;
      if (hasVideoDimensions(video)) {
        finish();
        return;
      }
      if (pollCount === 20 || pollCount === 60 || pollCount === 120) {
        void attemptVideoPlay(video);
      }
      if (pollCount === 90 && video.srcObject) {
        const activeStream = video.srcObject as MediaStream;
        video.srcObject = null;
        window.requestAnimationFrame(() => {
          video.srcObject = activeStream;
          void attemptVideoPlay(video);
          persistDebug("qr-camera-reattach", { pollCount });
        });
      }
      if (pollCount >= 480) {
        fail(new Error("video dimensions stayed zero"));
        return;
      }
      pollId = window.requestAnimationFrame(poll);
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("loadeddata", onLoadedMetadata);
    video.addEventListener("playing", onLoadedMetadata);
    video.addEventListener("canplay", onLoadedMetadata);
    video.addEventListener("resize", onLoadedMetadata);

    void attemptVideoPlay(video);
    pollId = window.requestAnimationFrame(poll);
  });
}

type VideoFrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: (now: number, metadata: VideoFrameCallbackMetadata) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

/** Mirror decoded frames to canvas for visible preview on iOS Safari. */
export function startCanvasPreviewLoop(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  onFirstFrame?: () => void
): () => void {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return () => {};

  let stopped = false;
  let notified = false;
  let rafId = 0;
  let videoFrameHandle: number | null = null;
  const frameVideo = video as VideoFrameCallbackVideo;

  const draw = () => {
    if (stopped || !hasVideoDimensions(video)) return false;

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } catch (error) {
      persistDebug("qr-camera-canvas-draw-failed", { error: String(error) });
      return false;
    }

    if (!notified) {
      notified = true;
      persistDebug("qr-camera-canvas-first-frame", {
        width: video.videoWidth,
        height: video.videoHeight,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
      });
      onFirstFrame?.();
    }
    return true;
  };

  const loopWithRaf = () => {
    if (stopped) return;
    draw();
    rafId = window.requestAnimationFrame(loopWithRaf);
  };

  const loopWithVideoFrameCallback = () => {
    if (stopped || typeof frameVideo.requestVideoFrameCallback !== "function") return;
    videoFrameHandle = frameVideo.requestVideoFrameCallback(() => {
      draw();
      loopWithVideoFrameCallback();
    });
  };

  const useVideoFrameCallback =
    typeof frameVideo.requestVideoFrameCallback === "function";

  if (useVideoFrameCallback) {
    loopWithVideoFrameCallback();
  } else {
    rafId = window.requestAnimationFrame(loopWithRaf);
  }

  return () => {
    stopped = true;
    if (rafId) window.cancelAnimationFrame(rafId);
    if (videoFrameHandle !== null && frameVideo.cancelVideoFrameCallback) {
      frameVideo.cancelVideoFrameCallback(videoFrameHandle);
    }
  };
}

export function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function cameraErrorMessageKey(
  error: unknown
): "friendQr.cameraPermissionDenied" | "friendQr.cameraPreviewFailed" | "friendQr.cameraUnavailable" {
  if (error instanceof QrCameraError) {
    if (error.kind === "permission") return "friendQr.cameraPermissionDenied";
    if (error.kind === "preview") return "friendQr.cameraPreviewFailed";
  }
  if (error instanceof Error && error.message.includes("preview")) {
    return "friendQr.cameraPreviewFailed";
  }
  return "friendQr.cameraUnavailable";
}
