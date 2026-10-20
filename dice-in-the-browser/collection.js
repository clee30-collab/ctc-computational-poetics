

import { BLUES, SHAPES, drawShape } from "./shapes.js";
import { CELL } from "./world.js";

const TILE = CELL; 

let inventory = [];
try {
  inventory = JSON.parse(sessionStorage.getItem("bowerbird-inventory")) ?? [];
} catch {

}

inventory.sort(
  (a, b) => BLUES.indexOf(a.color) - BLUES.indexOf(b.color) || SHAPES.indexOf(a.shape) - SHAPES.indexOf(b.shape)
);

const grid = document.getElementById("grid");
const dpr = window.devicePixelRatio || 1;
for (const { shape, color, inner } of inventory) {
  const tile = document.createElement("canvas");
  tile.width = tile.height = TILE * dpr;
  tile.style.width = tile.style.height = `${TILE}px`;
  const ctx = tile.getContext("2d");
  ctx.scale(dpr, dpr);
  drawShape(ctx, shape, color, 0, 0, TILE, inner);
  grid.appendChild(tile);
}

const cols = Math.max(1, Math.ceil(Math.sqrt(inventory.length)));
const rows = Math.ceil(inventory.length / cols);
grid.style.gridTemplateColumns = `repeat(${cols}, ${TILE}px)`;

/** keep the bird in the middle */
function place() {
  const middleX = Math.round(document.body.clientWidth / 2 - TILE / 2);
  const middleY = Math.round(document.body.clientHeight / 2 - TILE / 2);
  grid.style.left = `${middleX - Math.floor(cols / 2) * TILE}px`;
  grid.style.top = `${middleY - Math.floor(rows / 2) * TILE}px`;
}

place();
window.addEventListener("resize", place);
