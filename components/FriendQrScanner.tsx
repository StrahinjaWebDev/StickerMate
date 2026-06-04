"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Primitives";
import { useI18n } from "@/hooks/useI18n";
import {
  attachStreamToVideoPreview,
  QrCameraError,
  requestQrCameraStream,
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const scanInFlightRef = useRef(false);
  const stopStreamRef = useRef<(() => void) | null>(null);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const [videoNode, setVideoNode] = useState<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewReady, setPreviewReady] = useState(false);

  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  }, [onClose, onScan]);

  const videoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    setVideoNode(node);
  }, []);

  useEffect(() => {
    if (!open) {
      setError(null);
      setPreviewReady(false);
      setVideoNode(null);
      stopStreamRef.current = null;
      return;
    }

    if (!videoNode) return;

    let cancelled = false;

    function stopStream() {
      if (scanTimerRef.current !== null) {
        window.clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }
      scanInFlightRef.current = false;
      stopMediaStream(streamRef.current);
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setPreviewReady(false);
    }

    stopStreamRef.current = stopStream;

    async function startCamera() {
      setError(null);
      setPreviewReady(false);

      try {
        const stream = await requestQrCameraStream();
        if (cancelled) {
          stopMediaStream(stream);
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stopStream();
          return;
        }

        await attachStreamToVideoPreview(video, stream);
        if (cancelled) {
          stopStream();
          return;
        }

        setPreviewReady(true);

        scanTimerRef.current = window.setInterval(() => {
          if (cancelled || !videoRef.current || scanInFlightRef.current) return;
          scanInFlightRef.current = true;
          void decodeQrFromVideoFrame(videoRef.current)
            .then((data) => {
              if (!data || cancelled) return;
              stopStream();
              onScanRef.current(data);
            })
            .finally(() => {
              scanInFlightRef.current = false;
            });
        }, 220);
      } catch (cameraError) {
        persistDebug("qr-camera-start-failed", { error: String(cameraError) });
        stopStream();
        if (cameraError instanceof QrCameraError && cameraError.kind === "permission") {
          setError(t("friendQr.cameraPermissionDenied"));
        } else {
          setError(t("friendQr.cameraUnavailable"));
        }
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      stopStream();
      stopStreamRef.current = null;
    };
  }, [open, videoNode, t]);

  function handleClose() {
    stopStreamRef.current?.();
    onCloseRef.current();
  }

  if (!open) return null;

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

      <div className="relative mx-auto mt-4 flex min-h-[min(62vh,520px)] w-full max-w-lg flex-1 overflow-hidden rounded-lg border border-white/20 bg-black">
        <video
          ref={videoCallbackRef}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          muted
          autoPlay
          aria-label={t("friendQr.scanCameraLong")}
        />
        <div className="pointer-events-none absolute inset-8 z-10 rounded-lg border-2 border-white/70" aria-hidden="true" />
      </div>

      {error ? (
        <div className="mx-auto mt-4 w-full max-w-lg space-y-3">
          <p className="rounded-lg bg-coral/15 p-3 text-sm font-bold text-coral">{error}</p>
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
