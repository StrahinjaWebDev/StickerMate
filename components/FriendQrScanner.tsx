"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Primitives";
import { useI18n } from "@/hooks/useI18n";
import {
  attachStreamToVideoElement,
  QrCameraError,
  requestQrCameraStream,
  shouldUseCanvasPreview,
  startCanvasPreviewLoop,
  stopMediaStream
} from "@/lib/qrCamera";
import { persistDebug } from "@/lib/persistDebug";
import { decodeQrFromVideoFrame } from "@/services/tradeQrService";

export function FriendQrScanner({
  open,
  onClose,
  onScan
}: {
  open: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const scanInFlightRef = useRef(false);
  const stopCanvasRef = useRef<(() => void) | null>(null);
  const previewReadyRef = useRef(false);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const tRef = useRef(t);
  const useCanvasPreview = shouldUseCanvasPreview();
  const [previewReady, setPreviewReady] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [useDirectVideoPreview, setUseDirectVideoPreview] = useState(useCanvasPreview);

  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
    tRef.current = t;
  }, [onClose, onScan, t]);

  useEffect(() => {
    if (!open) {
      setPreviewReady(false);
      setAttachError(null);
      setUseDirectVideoPreview(false);
      previewReadyRef.current = false;
    } else if (useCanvasPreview) {
      setUseDirectVideoPreview(true);
    }
  }, [open, useCanvasPreview]);

  useLayoutEffect(() => {
    if (!open) return;

    if (useCanvasPreview) {
      setUseDirectVideoPreview(true);
    }

    let cancelled = false;

    function stopScanLoop() {
      if (scanTimerRef.current !== null) {
        window.clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }
      scanInFlightRef.current = false;
    }

    function stopPreviewLoop() {
      stopCanvasRef.current?.();
      stopCanvasRef.current = null;
    }

    function cleanupCamera() {
      stopScanLoop();
      stopPreviewLoop();
      const video = videoRef.current;
      if (video?.srcObject) {
        video.srcObject = null;
      }
      stopMediaStream(streamRef.current);
      streamRef.current = null;
      previewReadyRef.current = false;
      setPreviewReady(false);
    }

    function startScanLoop() {
      stopScanLoop();
      persistDebug("qr-camera-scanner-started");
      scanTimerRef.current = window.setInterval(() => {
        if (cancelled || !videoRef.current || scanInFlightRef.current) return;
        scanInFlightRef.current = true;
        void decodeQrFromVideoFrame(videoRef.current)
          .then((data) => {
            if (!data || cancelled) return;
            stopScanLoop();
            cleanupCamera();
            onScanRef.current(data);
          })
          .finally(() => {
            scanInFlightRef.current = false;
          });
      }, 250);
    }

    function markPreviewReady(source: "canvas" | "video" | "dimensions") {
      if (cancelled || previewReadyRef.current) return;
      previewReadyRef.current = true;
      persistDebug("qr-camera-preview-ready", { source });
      setPreviewReady(true);
      startScanLoop();
    }

    function waitForElements(attempt = 0): void {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const container = containerRef.current;

      if (video && canvas && container) {
        persistDebug("qr-camera-video-ref-ready", {
          useCanvasPreview,
          layoutWidth: container.clientWidth,
          layoutHeight: container.clientHeight
        });
        void startCamera(video, canvas, container);
        return;
      }

      if (attempt >= 30 || cancelled) {
        persistDebug("qr-camera-video-ref-missing", { attempt, hasVideo: Boolean(video), hasCanvas: Boolean(canvas) });
        setAttachError(tRef.current("friendQr.cameraPreviewFailed"));
        return;
      }

      window.requestAnimationFrame(() => waitForElements(attempt + 1));
    }

    async function startCamera(video: HTMLVideoElement, canvas: HTMLCanvasElement, container: HTMLDivElement) {
      setPreviewReady(false);
      setAttachError(null);
      previewReadyRef.current = false;

      if (useCanvasPreview) {
        setUseDirectVideoPreview(true);
      } else {
        setUseDirectVideoPreview(false);
      }

      try {
        const stream = await requestQrCameraStream();
        if (cancelled) {
          stopMediaStream(stream);
          return;
        }

        streamRef.current = stream;
        await attachStreamToVideoElement(video, stream, container);
        if (cancelled) return;

        if (useCanvasPreview) {
          stopPreviewLoop();
          stopCanvasRef.current = startCanvasPreviewLoop(video, canvas, () => {
            if (cancelled) return;
            setUseDirectVideoPreview(false);
            markPreviewReady("canvas");
          });
          markPreviewReady("video");
        } else {
          markPreviewReady("video");
        }
      } catch (error) {
        persistDebug("qr-camera-start-failed", { error: String(error) });
        if (cancelled) return;
        cleanupCamera();
        if (error instanceof QrCameraError && error.kind === "permission") {
          setAttachError(tRef.current("friendQr.cameraPermissionDenied"));
        } else {
          setAttachError(tRef.current("friendQr.cameraPreviewFailed"));
        }
      }
    }

    waitForElements();

    return () => {
      cancelled = true;
      cleanupCamera();
    };
  }, [open, useCanvasPreview]);

  function handleClose() {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    onCloseRef.current();
  }

  if (!open) return null;

  const showCanvasPreview = useCanvasPreview && !useDirectVideoPreview;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="friend-qr-scanner-title"
      className="fixed inset-0 z-50 flex flex-col bg-ink/95 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
    >
      <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3">
        <div className="min-w-0">
          <p id="friend-qr-scanner-title" className="text-base font-black text-white">
            {t("friendQr.scanCameraLong")}
          </p>
          <p className="mt-1 text-sm font-semibold text-white/80">
            {previewReady ? t("friendQr.scanCameraHint") : t("friendQr.cameraStarting")}
          </p>
        </div>
        <Button className="min-h-10 shrink-0 px-3" onClick={handleClose}>
          <X size={18} />
          {t("common.cancel")}
        </Button>
      </div>

      <div
        ref={containerRef}
        className="relative mx-auto mt-4 w-full max-w-lg shrink-0 overflow-hidden rounded-lg border border-white/20 bg-black"
        style={{ height: "min(62vh, 520px)", minHeight: 280 }}
      >
        <video
          ref={videoRef}
          className={
            showCanvasPreview
              ? "pointer-events-none absolute inset-0 z-0 h-full w-full object-cover opacity-0 [transform:translateZ(0)]"
              : "pointer-events-none absolute inset-0 z-[1] h-full w-full object-cover [transform:translateZ(0)]"
          }
          playsInline
          muted
          autoPlay
          aria-label={t("friendQr.scanCameraLong")}
        />
        <canvas
          ref={canvasRef}
          className={
            showCanvasPreview
              ? "absolute inset-0 z-[1] h-full w-full [transform:translateZ(0)]"
              : "pointer-events-none absolute inset-0 z-0 h-full w-full opacity-0"
          }
          aria-hidden={!showCanvasPreview}
        />
        <div className="pointer-events-none absolute inset-8 z-10 rounded-lg border-2 border-white/70" aria-hidden="true" />
      </div>

      {attachError ? (
        <div className="mx-auto mt-4 w-full max-w-lg space-y-3">
          <p className="rounded-lg bg-coral/15 p-3 text-sm font-bold text-coral">{attachError}</p>
          <p className="text-center text-sm font-semibold text-white/75">{t("friendQr.cameraFallbackHint")}</p>
        </div>
      ) : (
        <p className="mx-auto mt-4 w-full max-w-lg text-center text-sm font-semibold text-white/75">
          {previewReady ? t("friendQr.scanCameraHint") : t("friendQr.cameraStarting")}
        </p>
      )}
    </div>
  );
}
