import { InfiniteCanvas } from "./infinite-canvas.js";
import { World, CELL } from "./world.js";
import { BACKGROUND, drawShape } from "./shapes.js";

const MAX_ITEMS = 120; // how many pixels the bird can carry
const AIM_SCALE = 0.55; // how small the art in the cell about to be grabbed gets

// A new random world every refresh, or a fixed one with ?seed=1234
const params = new URLSearchParams(location.search);
const seed = params.has("seed") ? Number(params.get("seed")) : (Math.random() * 1e9) | 0;
const world = new World(seed);

/** The invisible inventory: { shape, color } for every pixel picked up */
const inventory = [];

// ---- bird sprites (all drawn facing left; flipped for right) ----

const SPRITES = ["leftright", "leftrightgrab", "updown", "upgrab", "downgrab"];
const sprites = {};
for (const name of SPRITES) {
  const img = new Image();
  img.onload = () => (sprites[name] = outline(img));
  img.src = `bowerbird%20images/${name}.png`;
}

/** Add a 1px light outline so the navy bird shows up on dark blue blocks */
function outline(img) {
  const c = document.createElement("canvas");
  c.width = img.width + 2;
  c.height = img.height + 2;
  const ctx = c.getContext("2d");
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) ctx.drawImage(img, dx, dy);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(img, 1, 1);
  return c;
}

// ---- the player ----

const DIRS = {
  w: { dx: 0, dy: -1, name: "up" },
  a: { dx: -1, dy: 0, name: "left" },
  s: { dx: 0, dy: 1, name: "down" },
  d: { dx: 1, dy: 0, name: "right" },
};
DIRS.arrowup = DIRS.w;
DIRS.arrowleft = DIRS.a;
DIRS.arrowdown = DIRS.s;
DIRS.arrowright = DIRS.d;

const player = {
  gx: 0, // grid cell
  gy: 0,
  facing: DIRS.a,
};

function step(dir) {
  player.facing = dir;
  player.gx += dir.dx;
  player.gy += dir.dy;
}

/** Pick up whatever sits in the next cell in `dir` */
function grab(dir) {
  player.facing = dir;
  if (inventory.length >= MAX_ITEMS) return; // the bower is full
  const item = world.take(player.gx + dir.dx, player.gy + dir.dy);
  if (item) inventory.push(item);
}

// ---- keyboard ----
// Each WASD press moves exactly one cell (holding a key doesn't repeat).
// Space grabs: held together with a direction it grabs that way,
// on its own it grabs in the direction the bird is facing.

const held = []; // direction keys currently down, most recent last
let spaceDown = false;
let grabbedThisPress = false;

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (key === " ") {
    e.preventDefault();
    if (e.repeat) return;
    spaceDown = true;
    grabbedThisPress = false;
    const dir = DIRS[held.at(-1)];
    if (dir) {
      grab(dir);
      grabbedThisPress = true;
    }
    return;
  }
  const dir = DIRS[key];
  if (!dir) return;
  e.preventDefault();
  if (e.repeat) return;
  if (!held.includes(key)) held.push(key);
  if (spaceDown) {
    grab(dir);
    grabbedThisPress = true;
  } else {
    step(dir);
  }
});

window.addEventListener("keyup", (e) => {
  const key = e.key.toLowerCase();
  if (key === " ") {
    if (spaceDown && !grabbedThisPress) grab(player.facing);
    spaceDown = false;
    return;
  }
  const i = held.indexOf(key);
  if (i !== -1) held.splice(i, 1);
});

window.addEventListener("blur", () => {
  held.length = 0;
  spaceDown = false;
});

// ---- done button: carry the inventory over to the collection page ----

document.getElementById("done").addEventListener("click", () => {
  try {
    sessionStorage.setItem("bowerbird-inventory", JSON.stringify(inventory));
  } catch {
    // storage blocked: the collection page will just show an empty bower
  }
});

// ---- drawing ----

function spriteFor() {
  const grabbing = spaceDown;
  switch (player.facing.name) {
    case "up":
      return grabbing ? "upgrab" : "updown";
    case "down":
      return grabbing ? "downgrab" : "updown";
    default:
      return grabbing ? "leftrightgrab" : "leftright";
  }
}

function drawScene(ctx, canvas) {
  const w = canvas.canvas.clientWidth, h = canvas.canvas.clientHeight, s = CELL * canvas.scale;
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, w, h);

  world.draw(ctx, canvas);

  // while space is held, the art in the cell about to be grabbed shrinks
  if (spaceDown) {
    const gx = player.gx + player.facing.dx, gy = player.gy + player.facing.dy;
    const item = world.get(gx, gy);
    if (item) {
      const x = canvas.toVirtualX(gx * CELL), y = canvas.toVirtualY(gy * CELL);
      ctx.fillStyle = BACKGROUND;
      ctx.fillRect(x, y, s, s);
      const small = s * AIM_SCALE;
      drawShape(ctx, item.shape, item.color, x + (s - small) / 2, y + (s - small) / 2, small, item.inner);
    }
  }

  const sprite = sprites[spriteFor()];
  if (sprite) {
    const size = (sprite.width / 32) * s; // sprite is 32px + 2px outline
    const x = canvas.toVirtualX((player.gx + 0.5) * CELL), y = canvas.toVirtualY((player.gy + 0.5) * CELL);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (player.facing.name === "right") ctx.scale(-1, 1);
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
}

const infiniteCanvas = new InfiniteCanvas(CELL, { showGrid: false, onDraw: drawScene });
document.addEventListener("contextmenu", (e) => e.preventDefault(), false);

// ---- game loop ----

function tick() {
  infiniteCanvas.centerOn((player.gx + 0.5) * CELL, (player.gy + 0.5) * CELL);
  infiniteCanvas.render();
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
