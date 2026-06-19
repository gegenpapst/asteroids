import "./canvas.js";
import { Input } from "./input.js";
import { Game } from "./Game.js";

Input.init();
const game = new Game();

let lastT = null;
function loop(t) {
  if (lastT === null) lastT = t;
  const dt = (t - lastT) / 1000;
  lastT = t;
  game.update(dt);
  game.draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
