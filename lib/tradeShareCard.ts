"use client";

export type TradeShareCardContent = {
  displayName: string;
  qrDataUrl: string;
  title: string;
  missingLabel: string;
  duplicateLabel: string;
  cta: string;
  footer: string;
  brand: string;
};

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("QR image failed to load"));
    image.src = src;
  });
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
  }

  if (line) lines.push(line);
  return lines;
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export async function renderTradeShareCard(content: TradeShareCardContent): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported");

  const gradient = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  gradient.addColorStop(0, "#0b3d32");
  gradient.addColorStop(0.45, "#156f5b");
  gradient.addColorStop(1, "#0f5848");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  drawRoundedRect(ctx, 72, 120, CARD_WIDTH - 144, CARD_HEIGHT - 240, 48);
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fill();

  ctx.textAlign = "center";
  ctx.fillStyle = "#d7a73f";
  ctx.font = "700 52px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(content.brand, CARD_WIDTH / 2, 260);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 72px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(content.title, CARD_WIDTH / 2, 380);

  ctx.font = "800 96px system-ui, -apple-system, Segoe UI, sans-serif";
  const nameLines = wrapCanvasText(ctx, content.displayName, CARD_WIDTH - 220);
  nameLines.slice(0, 2).forEach((line, index) => {
    ctx.fillText(line, CARD_WIDTH / 2, 520 + index * 110);
  });

  ctx.font = "700 54px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.fillText(content.missingLabel, CARD_WIDTH / 2, 760);
  ctx.fillText(content.duplicateLabel, CARD_WIDTH / 2, 840);

  const qrImage = await loadImage(content.qrDataUrl);
  const qrBoxSize = 620;
  const qrPadding = 48;
  const qrBoxX = (CARD_WIDTH - qrBoxSize) / 2;
  const qrBoxY = 930;

  drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 36);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  const qrInner = qrBoxSize - qrPadding * 2;
  ctx.drawImage(qrImage, qrBoxX + qrPadding, qrBoxY + qrPadding, qrInner, qrInner);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 52px system-ui, -apple-system, Segoe UI, sans-serif";
  const ctaLines = wrapCanvasText(ctx, content.cta, CARD_WIDTH - 180);
  ctaLines.slice(0, 2).forEach((line, index) => {
    ctx.fillText(line, CARD_WIDTH / 2, 1660 + index * 64);
  });

  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  ctx.font = "600 40px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(content.footer, CARD_WIDTH / 2, 1820);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not create share card image"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}
