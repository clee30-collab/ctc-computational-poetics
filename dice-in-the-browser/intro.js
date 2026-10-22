import { loopSound } from "./sound.js";

loopSound();
const LINES = [
  "the male bowerbird typically collects blue objects to build and display structures called “bowers”",
  "bowerbirds are known for having an obsession for the color blue as it is the rarest color found in the natural environment",
  "they notoriously arrange these items for hours, whether that’s by size, color, or shape",
  "this is all done to attract a mate",
  "be the bowerbird and seduce your mate",
  "wasd or arrows to move, space to collect\nclick on bird when ready",
];
const text = document.getElementById("intro-text");
const hint = document.getElementById("intro-hint");
const start = document.getElementById("start");
let line = 0;

function show() {
  text.textContent = LINES[line];
  const last = line === LINES.length - 1;
  hint.hidden = last;
  start.hidden = !last;
}
function onKey(e) {
  if (e.key !== " ") return;
  e.preventDefault();
  if (e.repeat || line === LINES.length - 1) return;
  line++;
  show();
}
window.addEventListener("keydown", onKey);
show();
