//the randomness of the seed is assisted with Claude

import { BACKGROUND, HUES, HUE_WEIGHTS, SHAPES, drawShape, toRGB } from "./shapes.js";

export const CELL = 20; // screen px per grid cell; smaller = more cells across the screen (keep it 2x PIXELS in shapes.js)
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

const chance = (seed, x, y) => hash(seed, x, y) / 4294967296; // 0..1, fixed per cell

// ---- colour: pick a family by weight, then one of its shades ----

const COLORS_NO_BLUE = Object.entries(HUES).flatMap(([hue, shades]) => (hue === "blue" ? [] : shades));
const HUE_OF = Object.fromEntries(Object.entries(HUES).flatMap(([hue, shades]) => shades.map((c) => [c, hue])));

function pickHue(rand, noBlue = false) {
  const weights = Object.entries(HUE_WEIGHTS).filter(([hue]) => !noBlue || hue !== "blue");
  let r = rand() * weights.reduce((sum, [, w]) => sum + w, 0);
  for (const [hue, weight] of weights) if ((r -= weight) < 0) return hue;
  return "green";
}

/** One shade of a family, avoiding a colour if given */
const shade = (rand, hue, not) => pick(rand, HUES[hue].filter((c) => c !== not));

/** Any colour, picked by the family weights (noBlue for things that would make big blue areas) */
const pickColor = (rand, noBlue = false) => shade(rand, pickHue(rand, noBlue));

// ---- smooth noise, read at world coordinates so terrain flows across chunks ----

const smooth = (t) => t * t * (3 - 2 * t);

function noise(seed, x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = smooth(x - ix), fy = smooth(y - iy);
  const v = (dx, dy) => chance(seed, ix + dx, iy + dy) * 2 - 1;
  const top = v(0, 0) + (v(1, 0) - v(0, 0)) * fx;
  const bottom = v(0, 1) + (v(1, 1) - v(0, 1)) * fx;
  return top + (bottom - top) * fy; // -1..1
}

/** Layered noise: big shapes plus smaller wobbles on top */
function fbm(seed, x, y, octaves = 3) {
  let sum = 0, amp = 1, total = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise(seed + o * 101, x, y) * amp;
    total += amp;
    amp *= 0.5;
    x *= 2;
    y *= 2;
  }
  return sum / total;
}

// ---- lands: warped cells of territory, each with its own field, hills and texture ----

const LAND = 11; // rough width of one land, in grid cells
const FIELDS = ["dot", "dot", "dot", "dot", "thinplus", "ring", "corners"]; // the ground cover
const BLUE_SCATTER = 0.12; // extra chance a scattered piece is blue (on top of the normal colour weights)
const ACCENTS = ["plus", "thinplus", "dot", "ring", "diamond", "circle"]; // the scattered contrast pieces

// patterns inside a land's hills; e is the elevation, so "contour" draws topographic bands
const PATTERNS = [
  () => () => 0, // one look everywhere
  (w) => (x, y) => Math.floor(y / w) % 2, // horizontal stripes
  (w) => (x, y) => Math.floor(x / w) % 2, // vertical stripes
  (w) => (x, y) => Math.floor((x + y) / w) % 2, // diagonal stripes
  (w) => (x, y) => (Math.floor(x / w) + Math.floor(y / w)) % 2, // checkerboard
  () => (x, y, e) => Math.floor(e * 14) % 2, // contour lines
];

const MIN_CONTRAST = 50; // how different the inner circle must be from its block (0-441)
const rgbCache = new Map();
function contrast(a, b) {
  for (const c of [a, b]) if (!rgbCache.has(c)) rgbCache.set(c, toRGB(c));
  const [p, q] = [rgbCache.get(a), rgbCache.get(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/** Blocks get a circle in the middle: a sibling shade, another colour, or the background */
function pickInner(rand, look) {
  delete look.inner;
  // blue never shares an object with another colour
  const blue = HUE_OF[look.color] === "blue";
  const candidates = [...HUES[HUE_OF[look.color]], ...(blue ? [] : [pickColor(rand, true)])];
  // drop shades too close to the block, so it never reads as a plain filled square
  let others = candidates.filter((c) => contrast(c, look.color) >= MIN_CONTRAST);
  if (!others.length) others = (blue ? HUES.blue : COLORS_NO_BLUE).filter((c) => contrast(c, look.color) >= MIN_CONTRAST);
  // the cross / small dot needs a blue to show against the background
  if (!others.length) others = [BACKGROUND]; // nothing contrasts enough: leave the circle white
  if (look.shape === "blockcross" || look.shape === "blockdot") look.inner = pick(rand, others);
  else if (BLOCKS.includes(look.shape)) look.inner = pick(rand, [...others, BACKGROUND]);
  return look;
}

function makeLand(rand) {
  const hue = pickHue(rand); // each land leans toward one colour family
  const a = pickInner(rand, { shape: rand() < 0.6 ? pick(rand, BLOCKS) : pick(rand, SYMBOLS), color: shade(rand, hue) });
  const b = { ...a };
  if (rand() < 0.7) b.shape = pick(rand, SHAPES.filter((s) => s !== a.shape));
  if (b.shape === a.shape || rand() < 0.4) b.color = rand() < 0.7 ? shade(rand, hue, a.color) : pickColor(rand, true);
  pickInner(rand, b);
  return {
    blue: hue === "blue",
    hill: [a, b],
    pattern: pick(rand, PATTERNS)(int(rand, 1, 2)),
    // a blue land only keeps blue on its hilltops, so blue comes in small patches
    field: { shape: pick(rand, FIELDS), color: hue !== "blue" && rand() < 0.75 ? shade(rand, hue) : pickColor(rand, true) },
    sparse: rand() < 0.35, // field only on every other cell
    rim: rand() < 0.35 ? { shape: pick(rand, ["plus", "thinplus"]), color: pickColor(rand, true) } : null,
    height: hue === "blue" ? 0 : rand() * 0.2, // how easily this land rises into hills
  };
}

// ---- the world ----

export class World {
  chunks = new Map();
  lands = new Map();

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

  /** Which land a cell belongs to: the nearest jittered site, after warping the cell so borders wander */
  #landAt(gx, gy) {
    const s = this.seed;
    const wx = gx / LAND + fbm(s + 11, gx / 14, gy / 14) * 0.6;
    const wy = gy / LAND + fbm(s + 23, gx / 14, gy / 14) * 0.6;
    const ix = Math.floor(wx), iy = Math.floor(wy);
    let best = Infinity, key;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const sx = ix + dx, sy = iy + dy;
        const px = sx + chance(s + 31, sx, sy), py = sy + chance(s + 37, sx, sy);
        const d = (px - wx) ** 2 + (py - wy) ** 2;
        if (d < best) [best, key] = [d, `${sx},${sy}`];
      }
    }
    if (!this.lands.has(key)) {
      const [sx, sy] = key.split(",").map(Number);
      this.lands.set(key, { key, ...makeLand(mulberry32(hash(s + 41, sx, sy))) });
    }
    return this.lands.get(key);
  }

  /** Everything about one cell comes from noise at its world position */
  #cellAt(gx, gy) {
    const s = this.seed;

    // a few scattered pieces in a contrasting look, anywhere
    if (chance(s + 3, gx, gy) < 0.012) {
      const rand = mulberry32(hash(s + 5, gx, gy));
      return { shape: pick(rand, ACCENTS), color: rand() < BLUE_SCATTER ? shade(rand, "blue") : pickColor(rand) };
    }

    // rivers run where a slow noise crosses zero; banks either side stay empty
    const r = Math.abs(fbm(s + 7, gx / 34, gy / 34, 2) + fbm(s + 9, gx / 9, gy / 9, 1) * 0.06);
    if (r < 0.03) {
      const rand = mulberry32(hash(s + 13, Math.floor(gx / 40), Math.floor(gy / 40)));
      return { shape: pick(rand, ["hstripes", "stripes", "dot", "bigdot"]), color: pickColor(rand, true) };
    }
    if (r < 0.06) return;

    const land = this.#landAt(gx, gy);
    const e = fbm(s + 17, gx / 22, gy / 22); // elevation

    if (e < -0.22) return; // valleys are open ground
    // blue hills are broken up by finer noise, so blue sits in small pockets
    const pocket = !land.blue || fbm(s + 19, gx / 5, gy / 5, 2) > 0;
    if (e > 0.2 - land.height && pocket) {
      // hills: dense, textured by the land's pattern
      return { ...land.hill[land.pattern(gx, gy, e) & 1] }; // & 1 keeps negative coordinates in 0..1
    }
    // the edge of a land can be outlined
    if (land.rim) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (this.#landAt(gx + dx, gy + dy) !== land) return { ...land.rim };
      }
    }
    if (land.sparse && (gx + gy) & 1) return;
    return { ...land.field };
  }

  #generate(cx, cy) {
    const cells = new Map();
    for (let y = 0; y < CH; y++) {
      for (let x = 0; x < CH; x++) {
        const gx = cx * CH + x, gy = cy * CH + y;
        const item = this.#cellAt(gx, gy);
        if (item) cells.set(`${gx},${gy}`, item);
      }
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
    ctx.imageSmoothingEnabled = false; // keep the pixel art crisp when zoomed
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
