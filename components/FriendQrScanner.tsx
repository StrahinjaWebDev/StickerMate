"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Primitives";
import { useI18n } from "@/hooks/useI18n";
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
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  }, [onClose, onScan]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setActive(false);
      stopStreamRef.current = null;
      return;
    }

    let cancelled = false;
    setError(null);
    setActive(false);

    function stopStream() {
      if (scanTimerRef.current !== null) {
        window.clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }
      scanInFlightRef.current = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setActive(false);
    }

    stopStreamRef.current = stopStream;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(t("friendQr.cameraUnavailable"));
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stopStream();
          return;
        }

        video.srcObject = stream;
        await video.play();
        setActive(true);

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
      } catch (error) {
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          setError(t("friendQr.cameraPermission"));
        } else {
          setError(t("friendQr.cameraUnavailable"));
        }
        stopStream();
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      stopStream();
      stopStreamRef.current = null;
    };
  }, [open, t]);

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
          <p className="mt-1 text-sm font-semibold text-white/80">{t("friendQr.scanCameraHint")}</p>
        </div>
        <Button className="min-h-10 shrink-0 px-3" onClick={handleClose}>
          <X size={18} />
          {t("common.cancel")}
        </Button>
      </div>

      <div className="relative mx-auto mt-4 w-full max-w-lg flex-1 overflow-hidden rounded-lg border border-white/20 bg-black">
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted aria-label={t("friendQr.scanCameraLong")} />
        <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-white/70" aria-hidden="true" />
      </div>

      {error ? (
        <p className="mx-auto mt-4 w-full max-w-lg rounded-lg bg-coral/15 p-3 text-sm font-bold text-coral">{error}</p>
      ) : (
        <p className="mx-auto mt-4 w-full max-w-lg text-center text-sm font-semibold text-white/75">
          {active ? t("friendQr.scanCameraHint") : t("friendQr.cameraStarting")}
        </p>
      )}
    </div>
  );
}
