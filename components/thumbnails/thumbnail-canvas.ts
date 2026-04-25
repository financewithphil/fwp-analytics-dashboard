// Pure canvas renderer for thumbnail variations. No DOM dependencies beyond
// HTMLCanvasElement.

export type ThumbStyle =
  | "bold"
  | "minimal"
  | "split"
  | "gradient"
  | "dark";

export type ThumbAspect = "16:9" | "1:1" | "9:16";

export interface ThumbConfig {
  title: string;
  subtitle?: string;
  style: ThumbStyle;
  aspect: ThumbAspect;
  accent: string;
  variant: 0 | 1 | 2 | 3;
}

const SIZES: Record<ThumbAspect, { w: number; h: number }> = {
  "16:9": { w: 1280, h: 720 },
  "1:1": { w: 1080, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
};

export function renderThumb(canvas: HTMLCanvasElement, cfg: ThumbConfig) {
  const { w, h } = SIZES[cfg.aspect];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background
  drawBackground(ctx, cfg, w, h);

  // Title
  drawTitle(ctx, cfg, w, h);

  // Subtitle pill (bottom-left)
  if (cfg.subtitle) drawSubtitle(ctx, cfg.subtitle, cfg.accent, w, h);

  // Grain overlay
  drawGrain(ctx, w, h);
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  cfg: ThumbConfig,
  w: number,
  h: number,
) {
  if (cfg.style === "dark") {
    ctx.fillStyle = "#0a1628";
    ctx.fillRect(0, 0, w, h);
    radialGlow(ctx, w / 2, h / 2, w * 0.6, cfg.accent, 0.18);
  } else if (cfg.style === "gradient") {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, cfg.accent);
    g.addColorStop(1, "#0b3d91");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (cfg.style === "split") {
    ctx.fillStyle = cfg.accent;
    ctx.fillRect(0, 0, w / 2, h);
    ctx.fillStyle = "#0a1628";
    ctx.fillRect(w / 2, 0, w / 2, h);
  } else if (cfg.style === "minimal") {
    ctx.fillStyle = "#fafbfc";
    ctx.fillRect(0, 0, w, h);
    drawDots(ctx, "#cfdce9", w, h);
  } else {
    // bold (default)
    ctx.fillStyle = cfg.accent;
    ctx.fillRect(0, 0, w, h);
    radialGlow(ctx, w * 0.8, h * 0.2, w * 0.5, "#ffffff", 0.18);
  }

  // Variant accents
  if (cfg.variant === 1) {
    ctx.strokeStyle = cfg.accent;
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, w - 40, h - 40);
  } else if (cfg.variant === 2) {
    drawStreaks(ctx, cfg.accent, w, h);
  } else if (cfg.variant === 3) {
    drawDots(ctx, cfg.accent, w, h, 0.25);
  }
}

function drawTitle(
  ctx: CanvasRenderingContext2D,
  cfg: ThumbConfig,
  w: number,
  h: number,
) {
  const ink = cfg.style === "minimal" ? "#0a1628" : "#ffffff";
  const baseSize =
    cfg.aspect === "9:16" ? h * 0.07 : cfg.aspect === "1:1" ? h * 0.075 : h * 0.11;
  ctx.fillStyle = ink;
  ctx.font = `700 ${baseSize}px "Newsreader", Georgia, serif`;
  ctx.textBaseline = "top";

  const lines = wrapLines(ctx, cfg.title, w * 0.85);
  const lineHeight = baseSize * 1.05;
  const totalHeight = lines.length * lineHeight;
  const startY = (h - totalHeight) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, w * 0.075, startY + i * lineHeight);
  });
}

function drawSubtitle(
  ctx: CanvasRenderingContext2D,
  subtitle: string,
  accent: string,
  w: number,
  h: number,
) {
  const padX = 32;
  const padY = 16;
  const fontSize = h * 0.025;
  ctx.font = `600 ${fontSize}px "JetBrains Mono", monospace`;
  ctx.textBaseline = "top";
  const metrics = ctx.measureText(subtitle.toUpperCase());
  const pillW = metrics.width + padX * 2;
  const pillH = fontSize + padY * 2;
  const x = w * 0.075;
  const y = h - pillH - h * 0.05;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(x, y, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(subtitle.toUpperCase(), x + padX, y + padY);
}

function radialGlow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  alpha = 0.2,
) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, hexAlpha(color, alpha));
  g.addColorStop(1, hexAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function drawDots(
  ctx: CanvasRenderingContext2D,
  color: string,
  w: number,
  h: number,
  alpha = 0.4,
) {
  ctx.fillStyle = hexAlpha(color, alpha);
  for (let x = 0; x < w; x += 28) {
    for (let y = 0; y < h; y += 28) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawStreaks(
  ctx: CanvasRenderingContext2D,
  color: string,
  w: number,
  h: number,
) {
  ctx.strokeStyle = hexAlpha(color, 0.5);
  ctx.lineWidth = 4;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(-50, h * (0.2 + i * 0.12));
    ctx.lineTo(w + 50, h * (0.18 + i * 0.12));
    ctx.stroke();
  }
}

function drawGrain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  const data = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < data.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 12;
    data.data[i] = Math.max(0, Math.min(255, data.data[i] + noise));
    data.data[i + 1] = Math.max(0, Math.min(255, data.data[i + 1] + noise));
    data.data[i + 2] = Math.max(0, Math.min(255, data.data[i + 2] + noise));
  }
  ctx.putImageData(data, 0, 0);
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

function hexAlpha(hex: string, alpha: number): string {
  if (hex.startsWith("rgb")) return hex;
  const cleaned = hex.replace("#", "");
  const bigint = parseInt(
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned,
    16,
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
