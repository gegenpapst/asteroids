import { W, H } from "./utils.js";

let canvas = null;
let ctx = null;

if (typeof globalThis.document !== "undefined") {
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");
  canvas.width = W;
  canvas.height = H;

  function fitCanvas() {
    const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    canvas.style.width = `${W * scale}px`;
    canvas.style.height = `${H * scale}px`;
  }
  fitCanvas();
  window.addEventListener("resize", fitCanvas);

  globalThis.ctx = ctx;
  globalThis.canvas = canvas;
}

export { canvas, ctx };
