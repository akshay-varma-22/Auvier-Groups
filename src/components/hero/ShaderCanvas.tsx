import { useEffect, useRef } from "react";

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

/* Domain-warped fbm: slow molten ember drifting through violet ink.
   The pointer adds a soft heat bloom. */
const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;

/* Hoskins hash: fract() first keeps magnitudes small, so it stays smooth even
   on GPUs that quietly run fragment shaders at reduced precision. */
float hash(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
const mat2 ROT = mat2(0.8, 0.6, -0.6, 0.8);
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = ROT * p * 2.02; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = u_time * 0.045;

  vec2 m = (u_mouse - 0.5) * vec2(aspect, 1.0);
  float heat = exp(-length(p - m) * 2.6);

  vec2 q = vec2(fbm(p * 1.4 + t), fbm(p * 1.4 + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p * 1.3 + 3.2 * q + vec2(1.7, 9.2) + t * 1.4 + heat * 0.35),
                fbm(p * 1.3 + 3.2 * q + vec2(8.3, 2.8) - t));
  float f = fbm(p * 1.2 + 3.0 * r);
  f = clamp((f - 0.5) * 2.3 + 0.5, 0.0, 1.0); /* fbm clusters near 0.5: stretch it */

  vec3 ink    = vec3(0.047, 0.043, 0.063);
  vec3 plum   = vec3(0.19, 0.07, 0.24);
  vec3 ember  = vec3(1.0, 0.36, 0.15);
  vec3 flare  = vec3(1.0, 0.72, 0.45);

  float e = f * f * 1.7 + r.x * 0.3;
  vec3 col = ink;
  col = mix(col, plum, smoothstep(0.35, 0.8, f) * 0.7);
  col = mix(col, ember, smoothstep(0.68, 1.02, e + heat * 0.14) * 0.82);
  col = mix(col, flare, smoothstep(0.95, 1.15, e) * 0.4);

  /* Keep the left (where the headline sits) and the bottom calmer. */
  float calm = smoothstep(0.1, 0.85, uv.x) * smoothstep(0.0, 0.55, uv.y);
  col = mix(ink, col, 0.12 + 0.88 * calm);
  col *= 1.0 - 0.45 * pow(length(uv - vec2(0.62, 0.55)), 1.6);

  col += (hash(gl_FragCoord.xy + fract(u_time) * 61.0) - 0.5) * 0.035;
  gl_FragColor = vec4(col, 1.0);
}`;

/** Start compiling a shader; its status is only checked once the program is ready. */
function shader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

/**
 * Lightweight raw-WebGL background (no library). Renders at reduced
 * resolution, pauses offscreen, and draws a single still frame for
 * reduced-motion users. Falls back to the CSS gradient behind it.
 */
export function ShaderCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
      preserveDrawingBuffer: true,
    });
    if (!gl) return;

    // Compile in the background: asking for the result straight away would
    // freeze the page while the GPU driver works (up to a second on Windows).
    const vs = shader(gl, gl.VERTEX_SHADER, VERT);
    const fs = shader(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    const parallel = gl.getExtension("KHR_parallel_shader_compile");
    let stop: (() => void) | null = null;
    let wait = 0;
    let gone = false;

    const begin = () => {
      if (gone) return;
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        if (import.meta.env.DEV) console.warn("[shader]", gl.getShaderInfoLog(vs), gl.getShaderInfoLog(fs), gl.getProgramInfoLog(prog));
        return;
      }
      stop = run();
    };
    const poll = () => {
      if (gone) return;
      if (gl.getProgramParameter(prog, parallel!.COMPLETION_STATUS_KHR)) begin();
      else wait = requestAnimationFrame(poll);
    };
    if (parallel) wait = requestAnimationFrame(poll);
    else if ("requestIdleCallback" in window) wait = requestIdleCallback(begin, { timeout: 800 });
    else wait = setTimeout(begin, 200);

    const run = () => {
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      const uRes = gl.getUniformLocation(prog, "u_res");
      const uTime = gl.getUniformLocation(prog, "u_time");
      const uMouse = gl.getUniformLocation(prog, "u_mouse");

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const scale = Math.min(window.devicePixelRatio, 2) * 0.5;
      const mouse = { x: 0.72, y: 0.6, tx: 0.72, ty: 0.6 };
      let raf = 0;
      let visible = true;
      const start = performance.now();

      const resize = () => {
        const { width, height } = canvas.getBoundingClientRect();
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uRes, canvas.width, canvas.height);
      };

      const draw = (now: number) => {
        mouse.x += (mouse.tx - mouse.x) * 0.04;
        mouse.y += (mouse.ty - mouse.y) * 0.04;
        gl.uniform1f(uTime, reduced ? 18 : (now - start) / 1000 + 18);
        gl.uniform2f(uMouse, mouse.x, mouse.y);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };

      const loop = (now: number) => {
        draw(now);
        if (visible) raf = requestAnimationFrame(loop);
      };

      const onMove = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        mouse.tx = (e.clientX - r.left) / r.width;
        mouse.ty = 1 - (e.clientY - r.top) / r.height;
      };

      const ro = new ResizeObserver(() => {
        resize();
        if (reduced) draw(start);
      });
      ro.observe(canvas);
      resize();

      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        cancelAnimationFrame(raf);
        if (visible && !reduced) raf = requestAnimationFrame(loop);
      });
      io.observe(canvas);

      if (reduced) draw(start);
      else window.addEventListener("pointermove", onMove, { passive: true });
      canvas.classList.add("is-ready");

      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        window.removeEventListener("pointermove", onMove);
        gl.deleteBuffer(buf);
      };
    };

    return () => {
      gone = true;
      cancelAnimationFrame(wait);
      if ("cancelIdleCallback" in window) cancelIdleCallback(wait);
      clearTimeout(wait);
      stop?.();
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
