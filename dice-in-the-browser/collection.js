

import { COLORS, SHAPES, drawShape } from "./shapes.js";
import { CELL } from "./world.js";
import { frame } from "./frame.js";

const TILE = CELL; 

let inventory = [];
try {
  inventory = JSON.parse(sessionStorage.getItem("bowerbird-inventory")) ?? [];
} catch {

}

inventory.sort(
  (a, b) => COLORS.indexOf(a.color) - COLORS.indexOf(b.color) || SHAPES.indexOf(a.shape) - SHAPES.indexOf(b.shape)
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

const bird = document.getElementById("bird");

//where is the bird
function place() {
  const middleX = Math.round(document.body.clientWidth / 2 - TILE / 2);
  const middleY = Math.round(document.body.clientHeight / 2 - TILE / 2);
  const left = middleX - Math.floor(cols / 2) * TILE;
  const top = middleY - Math.floor(rows / 2) * TILE;
  grid.style.left = `${left}px`;
  grid.style.top = `${top}px`;
  bird.style.left = `${left + (cols * TILE) / 2 - TILE / 2}px`;
  bird.style.top = `${top + rows * TILE}px`;
}

place();
window.addEventListener("resize", place);

// save the image
async function save() {
  await document.fonts.ready;
  const w = document.body.clientWidth, h = document.body.clientHeight;
  const image = document.createElement("canvas");
  image.width = Math.round(w * dpr);
  image.height = Math.round(h * dpr);
  const ctx = image.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
  ctx.fillRect(0, 0, w, h);
  const note = document.getElementById("note");
  const style = getComputedStyle(note), box = note.getBoundingClientRect();
  ctx.fillStyle = style.color;
  ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(note.textContent, box.left + box.width / 2, box.top + box.height / 2);

  for (const tile of grid.children) {
    const b = tile.getBoundingClientRect();
    ctx.drawImage(tile, b.left, b.top, b.width, b.height);
  }

  ctx.imageSmoothingEnabled = false;
  const b = bird.getBoundingClientRect();
  ctx.drawImage(bird, b.left, b.top, b.width, b.height);

  // the ornate frame
  ctx.drawImage(frame, 0, 0, frame.offsetWidth, frame.offsetHeight);

  image.toBlob((blob) => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "bowerbird.png";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  });
}

document.getElementById("save").addEventListener("click", save);
