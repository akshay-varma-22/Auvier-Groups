import * as THREE from "three";

/* Procedural textures, drawn on canvases so the 3D story needs no image
   downloads: fabric, yarn twist, weave relief, oak, the tee, folded tees,
   a paper band and a tailor's tape. */

let seed = 11;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
};

const colorTex = (c: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

/** Faint yarn slubs over a flat colour. */
function slubs(ctx: CanvasRenderingContext2D, w: number, h: number, count: number, alpha = 1) {
  seed = 11;
  for (let i = 0; i < count; i++) {
    const y = rand() * h;
    const x = rand() * w;
    const len = 18 + rand() * 110;
    ctx.strokeStyle = rand() > 0.5 ? `rgba(255,255,255,${(0.025 + rand() * 0.04) * alpha})` : `rgba(0,0,0,${(0.03 + rand() * 0.05) * alpha})`;
    ctx.lineWidth = 1 + rand() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + (rand() - 0.5) * 2);
    ctx.stroke();
  }
}

/** Tiling normal map from a height function. */
function normalFrom(size: number, height: (x: number, y: number) => number, strength: number) {
  const [c, ctx] = canvas(size, size);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (height((x + 1) % size, y) - height((x - 1 + size) % size, y)) * strength;
      const dy = (height(x, (y + 1) % size) - height(x, (y - 1 + size) % size)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Twill weave relief for cloth surfaces. */
export const weaveNormal = () =>
  normalFrom(
    256,
    (x, y) => 0.5 + 0.5 * Math.sin(((x + y) / 256) * Math.PI * 2 * 24) * (0.75 + 0.25 * Math.sin((x / 256) * Math.PI * 2 * 96)),
    2.2,
  );

/** Spiral twist along a yarn (tube UVs run along the length in u). */
export const yarnNormal = () =>
  normalFrom(64, (x, y) => 0.5 + 0.5 * Math.sin(((x * 2 + y) / 64) * Math.PI * 2 * 2), 3.2);

/** Wound thread on a spool: fine horizontal turns. */
export function spoolThread(color: string) {
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 3) {
    ctx.fillStyle = `rgba(0,0,0,${0.06 + (y % 6 === 0 ? 0.04 : 0)})`;
    ctx.fillRect(0, y, 256, 1);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(0, y + 1, 256, 1);
  }
  const t = colorTex(c);
  // many fine turns of thread, not a few thick ridges
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 3);
  return t;
}

export const spoolNormal = () => {
  const t = normalFrom(64, (_x, y) => 0.5 + 0.5 * Math.sin((y / 64) * Math.PI * 2 * 21), 1.6);
  t.repeat.set(1, 4);
  return t;
};

/** Pale oak with soft grain. */
export function oak() {
  const [c, ctx] = canvas(1024, 512);
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#d4b48a");
  g.addColorStop(1, "#c7a479");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);
  seed = 5;
  for (let i = 0; i < 160; i++) {
    const y0 = rand() * 512;
    const amp = 2 + rand() * 6;
    const freq = 0.004 + rand() * 0.01;
    ctx.strokeStyle = `rgba(110,70,35,${0.05 + rand() * 0.1})`;
    ctx.lineWidth = 0.6 + rand() * 1.6;
    ctx.beginPath();
    for (let x = 0; x <= 1024; x += 8) {
      const y = y0 + Math.sin(x * freq + i) * amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const t = colorTex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** The hanging cloth: colour, slubs, hems and a sewn-on woven label. */
export function drawHangingCloth(c: HTMLCanvasElement, color: string, colorName: string) {
  const ctx = c.getContext("2d")!;
  const { width: w, height: h } = c;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  slubs(ctx, w, h, 5200);
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = 2.2;
  ctx.setLineDash([9, 7]);
  ctx.strokeRect(22, -10, w - 44, h - 12);
  ctx.beginPath();
  ctx.moveTo(22, h - 46);
  ctx.lineTo(w - 22, h - 46);
  ctx.stroke();
  ctx.setLineDash([]);
  drawLabel(ctx, w * 0.6, h - 46 - w * 0.126 - 34, w * 0.3, `CLOTHING · ${colorName.toUpperCase()}`);
}

export function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, ink: string, dot: string) {
  ctx.strokeStyle = ink;
  ctx.lineWidth = s * 0.3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x - s, y + s);
  ctx.lineTo(x, y - s);
  ctx.lineTo(x + s, y + s);
  ctx.stroke();
  ctx.fillStyle = dot;
  ctx.beginPath();
  ctx.arc(x, y + s * 0.35, s * 0.24, 0, Math.PI * 2);
  ctx.fill();
}

function drawLabel(ctx: CanvasRenderingContext2D, lx: number, ly: number, lw: number, line: string) {
  const lh = lw * 0.42;
  const grad = ctx.createLinearGradient(lx, ly, lx, ly + lh);
  grad.addColorStop(0, "#f3ecdd");
  grad.addColorStop(1, "#e4dac6");
  ctx.fillStyle = grad;
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.fillRect(lx, ly, lw, lh);
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "rgba(60,45,30,0.45)";
  ctx.lineWidth = 1.6;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(lx + 7, ly + 7, lw - 14, lh - 14);
  ctx.setLineDash([]);
  const cx = lx + lw / 2;
  drawMark(ctx, cx - lw * 0.3, ly + lh * 0.52, lh * 0.2, "#2c2620", "#4f5a3c");
  ctx.fillStyle = "#2c2620";
  ctx.textAlign = "left";
  ctx.font = `${Math.round(lh * 0.34)}px "Instrument Serif", Georgia, serif`;
  ctx.fillText("Auvier", cx - lw * 0.16, ly + lh * 0.5);
  ctx.font = `500 ${Math.round(lh * 0.1)}px "Geist Mono Variable", monospace`;
  ctx.fillStyle = "rgba(44,38,32,0.7)";
  ctx.fillText(line, cx - lw * 0.16, ly + lh * 0.72);
}

/** The woven label sewn inside the back neck. */
export function wovenLabel() {
  const [c, ctx] = canvas(512, 220);
  ctx.fillStyle = "#efe6d3";
  ctx.fillRect(0, 0, 512, 220);
  // woven texture: fine weft rows and warp lines
  for (let y = 0; y < 220; y += 3) {
    ctx.fillStyle = `rgba(95,72,40,${0.05 + ((y / 3) % 2) * 0.035})`;
    ctx.fillRect(0, y, 512, 1.2);
  }
  for (let x = 0; x < 512; x += 3) {
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(x, 0, 1, 220);
  }
  // folded selvedge at the top, cut edge at the bottom
  const edge = ctx.createLinearGradient(0, 0, 0, 220);
  edge.addColorStop(0, "rgba(60,45,25,0.28)");
  edge.addColorStop(0.1, "rgba(60,45,25,0)");
  edge.addColorStop(0.9, "rgba(60,45,25,0)");
  edge.addColorStop(1, "rgba(60,45,25,0.22)");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, 512, 220);
  drawMark(ctx, 120, 104, 22, "#2c2620", "#4f5a3c");
  ctx.fillStyle = "#2c2620";
  ctx.textAlign = "left";
  ctx.font = `88px "Instrument Serif", Georgia, serif`;
  ctx.fillText("Auvier", 168, 128);
  ctx.font = `500 20px "Geist Mono Variable", monospace`;
  ctx.fillStyle = "rgba(44,38,32,0.75)";
  ctx.fillText("CLOTHING  ·  M", 172, 168);
  return colorTex(c);
}

/** Kraft paper band printed with the collection mark. */
export function band() {
  const [c, ctx] = canvas(1024, 256);
  ctx.fillStyle = "#c9ad85";
  ctx.fillRect(0, 0, 1024, 256);
  seed = 21;
  for (let i = 0; i < 2200; i++) {
    ctx.fillStyle = `rgba(${rand() > 0.5 ? "255,255,255" : "80,55,30"},${0.04 + rand() * 0.06})`;
    ctx.fillRect(rand() * 1024, rand() * 256, 1 + rand() * 3, 1);
  }
  ctx.fillStyle = "#2c2620";
  ctx.textAlign = "center";
  ctx.font = `92px "Instrument Serif", Georgia, serif`;
  ctx.fillText("Auvier", 512, 132);
  ctx.font = `500 22px "Geist Mono Variable", monospace`;
  ctx.fillText("C L O T H I N G   ·   C O L L E C T I O N   0 1", 512, 186);
  drawMark(ctx, 330, 104, 18, "#2c2620", "#4f5a3c");
  return colorTex(c);
}

/** A tailor's tape measure. */
export function tape() {
  const [c, ctx] = canvas(2048, 64);
  ctx.fillStyle = "#ecdcaa";
  ctx.fillRect(0, 0, 2048, 64);
  ctx.fillStyle = "#2c2620";
  ctx.font = `500 15px "Geist Mono Variable", monospace`;
  ctx.textAlign = "center";
  for (let i = 0; i <= 150; i++) {
    const x = (i / 150) * 2048;
    const big = i % 10 === 0;
    ctx.fillRect(x, 0, 1.6, big ? 22 : i % 5 === 0 ? 15 : 9);
    if (big) ctx.fillText(String(i), x, 46);
  }
  return colorTex(c);
}
