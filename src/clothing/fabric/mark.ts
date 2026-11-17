/* The Auvier mark (Λ and its dot), drawn on any 2D canvas, including in a worker. */

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function drawMark(ctx: Ctx2D, x: number, y: number, s: number, ink: string, dot: string) {
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
