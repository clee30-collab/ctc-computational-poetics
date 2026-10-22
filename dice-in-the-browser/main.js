import { InfiniteCanvas } from "./infinite-canvas.js";
import { World, CELL } from "./world.js";
import { BACKGROUND, drawShape } from "./shapes.js";

const MAX_ITEMS = 120; //maximum
const AIM_SCALE = 0.55; 
const BIRD_SCALE = 1; 

// A new random world every refresh, or a fixed one with ?seed=1234
const params = new URLSearchParams(location.search);
const seed = params.has("seed") ? Number(params.get("seed")) : (Math.random() * 1e9) | 0;
const world = new World(seed);
const inventory = [];

const SPRITES = ["leftright", "leftrightgrab", "updown", "upgrab", "downgrab"];
const sprites = {};
for (const name of SPRITES) {
  const img = new Image();
  img.onload = () => (sprites[name] = img);
  img.src = `bowerbird%20images/${name}.png`;
}


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
  gx: 0, 
  gy: 0,
  facing: DIRS.a,
};

function step(dir) {
  player.facing = dir;
  player.gx += dir.dx;
  player.gy += dir.dy;
}
function grab(dir) {
  player.facing = dir;
  if (inventory.length >= MAX_ITEMS) return; // the bower is full
  const item = world.take(player.gx + dir.dx, player.gy + dir.dy);
  if (item) inventory.push(item);
}

//keyboard rules
const held = []; 
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


const HOVER_PAD = 0.4; //hover areas slightly larger
const popup = document.getElementById("bird-popup");
const canvasEl = document.getElementById("canvas");
function overBird(e) {
  const s = CELL * infiniteCanvas.scale, reach = s / 2 + s * HOVER_PAD;
  return Math.abs(e.clientX - window.innerWidth / 2) <= reach && Math.abs(e.clientY - window.innerHeight / 2) <= reach;
}

canvasEl.addEventListener("mousemove", (e) => {
  const over = overBird(e);
  popup.hidden = !over;
  canvasEl.style.cursor = over ? "pointer" : "";
  const s = CELL * infiniteCanvas.scale;
  popup.style.bottom = `${window.innerHeight / 2 + s / 2 + 6}px`;
});

canvasEl.addEventListener("mouseleave", () => {
  popup.hidden = true;
  canvasEl.style.cursor = "";
});

canvasEl.addEventListener("click", (e) => {
  if (!overBird(e)) return;
  try {
    sessionStorage.setItem("bowerbird-inventory", JSON.stringify(inventory));
  } catch {
  }
  location.href = "collection.html";
});

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
    const size = s * BIRD_SCALE;
    const x = canvas.toVirtualX((player.gx + 0.5) * CELL), y = canvas.toVirtualY((player.gy + 0.5) * CELL);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - s / 2, y - s / 2, s, s); 
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (player.facing.name === "right") ctx.scale(-1, 1);
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
}

const infiniteCanvas = new InfiniteCanvas(CELL, { showGrid: false, onDraw: drawScene });
document.addEventListener("contextmenu", (e) => e.preventDefault(), false);



function tick() {
  infiniteCanvas.centerOn((player.gx + 0.5) * CELL, (player.gy + 0.5) * CELL);
  infiniteCanvas.render();
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
