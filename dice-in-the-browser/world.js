//the randomness of the seed is assisted with Claude

import { BACKGROUND, BLUES, SHAPES, drawShape } from "./shapes.js";

export const CELL = 32; // world px per grid cell (same as the 32px bird sprite)
const CH = 20; // cells per chunk side
const BLOCKS = ["block", "blockcorners", "blockcross", "blockdot", "blocksquares"]; // filled squares with an inner circle
const SYMBOLS = SHAPES.filter((s) => !BLOCKS.includes(s));

// ---- seeded random ----

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(seed, x, y) {
  let h = seed ^ Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

const pick = (rand, list) => list[(rand() * list.length) | 0];
const int = (rand, min, max) => min + ((rand() * (max - min + 1)) | 0);

// ---- region layouts, in chunk-local cell coordinates ----

/** A few overlapping rectangles: chunky blocks */
function rects(rand, ox, oy) {
  const cells = [];
  for (let n = int(rand, 1, 3); n > 0; n--) {
    const x0 = ox + int(rand, -2, 2), y0 = oy + int(rand, -2, 2);
    const w = int(rand, 2, 5), h = int(rand, 2, 4);
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) cells.push([x, y]);
  }
  return cells;
}

/** A thick path that wanders and turns at right angles */
function corridor(rand, ox, oy) {
  const cells = [];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let [dx, dy] = pick(rand, dirs);
  let x = ox, y = oy;
  const thick = rand() < 0.4 ? 2 : 1;
  for (let n = int(rand, 6, 18); n > 0; n--) {
    for (let t = 0; t < thick; t++) cells.push(dx ? [x, y + t] : [x + t, y]);
    if (rand() < 0.22) [dx, dy] = pick(rand, dirs.filter(([a, b]) => a !== -dx || b !== -dy));
    x += dx;
    y += dy;
  }
  return cells;
}

/** A rectangle outline, sometimes split in two like an "8" */
function frame(rand, ox, oy) {
  const cells = [];
  const w = int(rand, 4, 7), h = int(rand, 4, 7);
  const split = rand() < 0.4 ? int(rand, 2, h - 3) : -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1 || y === split) cells.push([ox + x, oy + y]);
    }
  }
  return cells;
}

/** A spaced-out grid of symbols, every other cell */
function scatter(rand, ox, oy) {
  const cells = [];
  const w = int(rand, 2, 4), h = int(rand, 2, 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cells.push([ox + x * 2, oy + y * 2]);
  return cells;
}

/** An irregular blob that grows one random neighbour at a time */
function blob(rand, ox, oy) {
  const cells = [[ox, oy]];
  const seen = new Set([`${ox},${oy}`]);
  for (let n = int(rand, 5, 16); n > 0; n--) {
    const [x, y] = pick(rand, cells);
    const [dx, dy] = pick(rand, [[1, 0], [-1, 0], [0, 1], [0, -1]]);
    const key = `${x + dx},${y + dy}`;
    if (!seen.has(key)) {
      seen.add(key);
      cells.push([x + dx, y + dy]);
    }
  }
  return cells;
}

const LAYOUTS = [rects, corridor, frame, scatter, blob];

// ---- region looks: one shape everywhere, or two looks in a repeating pattern ----

const PATTERNS = [
  (x, y) => (x + y) % 2, // checkerboard
  (x, y) => y % 2, // horizontal stripes
  (x, y) => x % 2, // vertical stripes
  (x, y) => ((x + y) % 3 === 0 ? 1 : 0), // diagonal stripes
];

/** Blocks get a circle in the middle: another blue, or the background grey */
function pickInner(rand, look) {
  delete look.inner;
  const others = BLUES.filter((c) => c !== look.color);
  // the cross / small dot needs a blue to show against the background
  if (look.shape === "blockcross" || look.shape === "blockdot") look.inner = pick(rand, others);
  else if (BLOCKS.includes(look.shape)) look.inner = pick(rand, [...others, BACKGROUND]);
  return look;
}

/** Returns (x, y) => { shape, color, inner? } for every cell of one region */
function makeLook(rand, layout) {
  const a = pickInner(rand, {
    shape: layout === scatter || rand() < 0.4 ? pick(rand, SYMBOLS) : pick(rand, BLOCKS),
    color: pick(rand, BLUES),
  });
  if (rand() < 0.45) return () => a;

  // the second look swaps the shape, the blue, or both
  const b = { ...a };
  if (rand() < 0.65) b.shape = pick(rand, SHAPES.filter((s) => s !== a.shape));
  if (b.shape === a.shape || rand() < 0.4) b.color = pick(rand, BLUES.filter((c) => c !== a.color));
  pickInner(rand, b);
  const pattern = pick(rand, PATTERNS);
  return (x, y) => (pattern(x, y) ? b : a);
}

// ---- the world ----

export class World {
  chunks = new Map();

  constructor(seed) {
    this.seed = seed | 0;
  }

  /** The object at a grid cell, or undefined */
  get(gx, gy) {
    return this.#chunk(Math.floor(gx / CH), Math.floor(gy / CH)).cells.get(`${gx},${gy}`);
  }

  /** Take the object at a grid cell out of the world and return it (or undefined) */
  take(gx, gy) {
    const chunk = this.#chunk(Math.floor(gx / CH), Math.floor(gy / CH));
    const key = `${gx},${gy}`;
    const item = chunk.cells.get(key);
    if (item) {
      chunk.cells.delete(key);
      chunk.dirty = true; // redraw this chunk without it
    }
    return item;
  }

  #chunk(cx, cy) {
    const key = `${cx},${cy}`;
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = { cx, cy, cells: this.#generate(cx, cy), canvas: null, dirty: true };
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  #generate(cx, cy) {
    const rand = mulberry32(hash(this.seed, cx, cy));
    const owner = new Int16Array(CH * CH).fill(-1); // which region owns each cell
    const cells = new Map();
    let regions = 0;

    // regions may sit right next to each other, but never on top of each other
    const free = (x, y) => x >= 0 && y >= 0 && x < CH && y < CH && owner[y * CH + x] === -1;

    for (let attempt = int(rand, 30, 45); attempt > 0; attempt--) {
      const layout = pick(rand, LAYOUTS);
      const look = makeLook(rand, layout);
      const id = regions;
      const placed = [];
      for (const [x, y] of layout(rand, int(rand, 0, CH - 1), int(rand, 0, CH - 1))) {
        if (!free(x, y)) continue;
        owner[y * CH + x] = id;
        placed.push([x, y]);
      }
      if (placed.length < 2) {
        for (const [x, y] of placed) owner[y * CH + x] = -1; // too small, undo
        continue;
      }
      regions++;
      for (const [x, y] of placed) cells.set(`${cx * CH + x},${cy * CH + y}`, { ...look(x, y) });
    }
    return cells;
  }

  /** Each chunk is drawn once to its own canvas, then reused every frame */
  #render(chunk) {
    const size = CH * CELL, dpr = window.devicePixelRatio || 1;
    if (!chunk.canvas) {
      chunk.canvas = document.createElement("canvas");
      chunk.canvas.width = chunk.canvas.height = Math.round(size * dpr); // sharp on Retina
    }
    const ctx = chunk.canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    for (const [key, { shape, color, inner }] of chunk.cells) {
      const [gx, gy] = key.split(",").map(Number);
      drawShape(ctx, shape, color, (gx - chunk.cx * CH) * CELL, (gy - chunk.cy * CH) * CELL, CELL, inner);
    }
    chunk.dirty = false;
  }

  draw(ctx, canvas) {
    const scale = canvas.scale, span = CH * CELL;
    const left = Math.floor(canvas.toRealX(0) / span);
    const top = Math.floor(canvas.toRealY(0) / span);
    const right = Math.floor(canvas.toRealX(canvas.canvas.clientWidth) / span);
    const bottom = Math.floor(canvas.toRealY(canvas.canvas.clientHeight) / span);
    for (let cy = top; cy <= bottom; cy++) {
      for (let cx = left; cx <= right; cx++) {
        const chunk = this.#chunk(cx, cy);
        if (chunk.dirty) this.#render(chunk);
        ctx.drawImage(
          chunk.canvas,
          canvas.toVirtualX(cx * span),
          canvas.toVirtualY(cy * span),
          span * scale,
          span * scale
        );
      }
    }
  }
}
