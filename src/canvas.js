"use strict";

const W = 800;
const H = 600;

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = W;
canvas.height = H;

function fitCanvas() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = `${W * scale}px`;
  canvas.style.height = `${H * scale}px`;
}
fitCanvas();
window.addEventListener("resize", fitCanvas);

if (typeof module !== "undefined") module.exports = { W, H };
