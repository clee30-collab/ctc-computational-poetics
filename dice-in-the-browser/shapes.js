export const BLUES = ["#5f7bdf", "#2e66eb", "#3d8ae6", "#78b6f0"];
export const HUES = {
  green: ["#6b8f5e", "rgb(169, 187, 169)", "#a1c08e", "rgb(161, 226, 138)"], 
  yellow: ["#ffc86f", "#eef4a5", "#ecd06a"],
  purple: ["#d2c2f0", "#8f8594", "#a898c0"], 
  maroon: ["#9ad2ab", "#dbb591", "#a95a63"], 
  magenta: ["#e5bed0",  "#f9b5e4"],
  blue: BLUES,
};
export const HUE_WEIGHTS = { green: 52, yellow: 15, magenta: 9, purple: 8, maroon: 8, blue: 7 };
export const COLORS = Object.values(HUES).flat();
export const BACKGROUND = "#ffffff";
const CIRCLE = 0.36;
const DOT = 0.17;

function edgeDots(ctx, x, y, s, points) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, s, s);
  ctx.clip();
  ctx.beginPath();
  for (const [px, py] of points) {
    ctx.moveTo(x + px * s + s * DOT, y + py * s);
    ctx.arc(x + px * s, y + py * s, s * DOT, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

function petals(ctx, cx, cy, s) {
  const len = s * 0.68, half = s * 0.17;
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4 + (Math.PI / 2) * i);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(len * 0.25, half, len * 0.75, half, len, 0);
    ctx.bezierCurveTo(len * 0.75, -half, len * 0.25, -half, 0, 0);
    ctx.fill();
    ctx.restore();
  }
}

export const SHAPES = [
  "block", "blockcorners", "blockcross", "blockdot", "blocksquares", "plus", "pluscorners", "thinplus", "corners", "cornersbig", "cross", "diamond", "dot", "bigdot", "ring", "stripes", "hstripes", "stripescross", "hstripescross", "frame", "rhombus",
  "frameleft", "frameright", "frametop", "framebottom", "frameleftright", "frametopbottom",
];

const SIDES = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };
const CIRCLE_LINES = { circle: [] };
const sideNames = Object.keys(SIDES);
sideNames.forEach((a, i) => {
  CIRCLE_LINES[`circle${a}`] = [SIDES[a]];
  for (const b of sideNames.slice(i + 1)) CIRCLE_LINES[`circle${a}${b}`] = [SIDES[a], SIDES[b]];
});
for (const name of Object.keys(CIRCLE_LINES)) CIRCLE_LINES[`${name}dot`] = CIRCLE_LINES[name];
SHAPES.push(...Object.keys(CIRCLE_LINES));

const FRAME_LINES = {
  frameleft: [[-1, 0]],
  frameright: [[1, 0]],
  frametop: [[0, -1]],
  framebottom: [[0, 1]],
  frameleftright: [[-1, 0], [1, 0]],
  frametopbottom: [[0, -1], [0, 1]],
};



const PIXELS = 10; //8bit look
const sprites = new Map();

const swatch = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
export function toRGB(color) {
  swatch.clearRect(0, 0, 1, 1);
  swatch.fillStyle = color;
  swatch.fillRect(0, 0, 1, 1);
  return [...swatch.getImageData(0, 0, 1, 1).data.slice(0, 3)];
}

function sprite(shape, color, inner) {
  const key = `${shape}|${color}|${inner}`;
  if (sprites.has(key)) return sprites.get(key);
  const c = document.createElement("canvas");
  c.width = c.height = PIXELS;
  const ctx = c.getContext("2d");
  drawSmooth(ctx, shape, color, 0, 0, PIXELS, inner);
  const img = ctx.getImageData(0, 0, PIXELS, PIXELS), d = img.data;
  const palette = [color, inner, BACKGROUND].map(toRGB);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) { d[i + 3] = 0; continue; }
    let best = palette[0], bestDist = Infinity;
    for (const p of palette) {
      const dist = (d[i] - p[0]) ** 2 + (d[i + 1] - p[1]) ** 2 + (d[i + 2] - p[2]) ** 2;
      if (dist < bestDist) { best = p; bestDist = dist; }
    }
    [d[i], d[i + 1], d[i + 2], d[i + 3]] = [...best, 255];
  }
  ctx.putImageData(img, 0, 0);
  sprites.set(key, c);
  return c;
}

export function drawShape(ctx, shape, color, x, y, s, inner = BACKGROUND) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite(shape, color, inner), x, y, s, s);
  ctx.restore();
}

function drawSmooth(ctx, shape, color, x, y, s, inner = BACKGROUND) {
  const cx = x + s / 2, cy = y + s / 2;
  ctx.fillStyle = ctx.strokeStyle = color; // random color
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();

  // shape 28 - shape 49
  if (shape in CIRCLE_LINES) {
    ctx.lineWidth = s * 0.12;
    ctx.lineCap = "butt";
    ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
    for (const [dx, dy] of CIRCLE_LINES[shape]) {
      ctx.moveTo(cx + dx * s * 0.3, cy + dy * s * 0.3);
      ctx.lineTo(cx + dx * s * 0.5, cy + dy * s * 0.5);
    }
    ctx.stroke();
    if (shape.endsWith("dot")) {
      ctx.beginPath();
      ctx.arc(cx, cy, s * DOT, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  switch (shape) {
    // shape 1
    case "block":
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = inner; // random color
      ctx.arc(cx, cy, s * CIRCLE, 0, Math.PI * 2);
      ctx.fill();
      return;

    // shape 2
    case "blockcorners":
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = inner; // random color
      ctx.arc(cx, cy, s * CIRCLE, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = BACKGROUND;
      edgeDots(ctx, x, y, s, [[0, 0], [1, 0], [0, 1], [1, 1]]);
      return;

    // shape 3
    case "blockcross": {
      ctx.save();
      ctx.arc(cx, cy, s * CIRCLE, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = BACKGROUND;
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = inner; // random color
      petals(ctx, cx, cy, s);
      ctx.restore();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.rect(x, y, s, s);
      ctx.arc(cx, cy, s * CIRCLE, 0, Math.PI * 2);
      ctx.fill("evenodd");
      return;
    }

    // shape 9
    case "corners":
    // shape 10
    case "cornersbig": {
      const q = s * (shape === "corners" ? DOT : CIRCLE);
      ctx.fillRect(x, y, q, q);
      ctx.fillRect(x + s - q, y, q, q);
      ctx.fillRect(x, y + s - q, q, q);
      ctx.fillRect(x + s - q, y + s - q, q, q);
      return;
    }

    // shape 8
    case "thinplus": {
      const w = s / 6;
      ctx.fillRect(cx - w / 2, y, w, s);
      ctx.fillRect(x, cy - w / 2, s, w);
      return;
    }

    // shape 5
    case "blocksquares": {
      const q = s * DOT;
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = inner; // random color
      ctx.arc(cx, cy, s * DOT, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = BACKGROUND;
      ctx.fillRect(x, y, q, q);
      ctx.fillRect(x + s - q, y, q, q);
      ctx.fillRect(x, y + s - q, q, q);
      ctx.fillRect(x + s - q, y + s - q, q, q);
      return;
    }

    // shape 4
    case "blockdot":
      ctx.rect(x, y, s, s);
      ctx.arc(cx, cy, s * CIRCLE, 0, Math.PI * 2);
      ctx.fill("evenodd");
      ctx.fillStyle = BACKGROUND;
      ctx.beginPath();
      ctx.arc(cx, cy, s * CIRCLE, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = inner; // random color
      ctx.beginPath();
      ctx.arc(cx, cy, s * DOT, 0, Math.PI * 2);
      ctx.fill();
      return;

    // shape 6
    case "plus":
    // shape 7
    case "pluscorners": {
      const t = s * 0.34;
      ctx.fillRect(cx - t / 2, y, t, s);
      ctx.fillRect(x, cy - t / 2, s, t);
      if (shape === "pluscorners") edgeDots(ctx, x, y, s, [[0, 0], [1, 0], [0, 1], [1, 1]]);
      return;
    }

    // shape 11
    case "cross": {
      petals(ctx, cx, cy, s);
      edgeDots(ctx, x, y, s, [[0.5, 0], [0.5, 1]]);
      return;
    }

    // shape 12
    case "diamond": {
      ctx.moveTo(cx, y);
      ctx.lineTo(x + s, cy);
      ctx.lineTo(cx, y + s);
      ctx.lineTo(x, cy);
      ctx.closePath();
      ctx.fill();
      const q = s * DOT;
      ctx.fillRect(x, y, q, q);
      ctx.fillRect(x + s - q, y, q, q);
      ctx.fillRect(x, y + s - q, q, q);
      ctx.fillRect(x + s - q, y + s - q, q, q);
      return;
    }

    // shape 13
    case "dot":
      ctx.arc(cx, cy, s * DOT, 0, Math.PI * 2);
      ctx.fill();
      return;

    // shape 14
    case "bigdot":
      ctx.arc(cx, cy, s * CIRCLE, 0, Math.PI * 2);
      ctx.fill();
      return;

    // shape 15
    case "ring":
      ctx.lineWidth = s * 0.12;
      ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      edgeDots(ctx, x, y, s, [[0, 0], [1, 0], [0, 1], [1, 1]]);
      return;

    // shape 16
    case "stripes": {
      const w = s / 6;
      for (let i = 0; i < 3; i++) ctx.fillRect(x + w * (0.5 + i * 2), y, w, s);
      return;
    }

    // shape 17
    case "hstripes": {
      const w = s / 6;
      for (let i = 0; i < 3; i++) ctx.fillRect(x, y + w * (0.5 + i * 2), s, w);
      return;
    }

    // shape 18
    case "stripescross": {
      const w = s / 6;
      for (let i = 0; i < 3; i++) ctx.fillRect(x + w * (0.5 + i * 2), y, w, s);
      for (const f of [0.25, 0.75]) ctx.fillRect(x, y + s * f - w / 2, s, w);
      return;
    }

    // shape 19
    case "hstripescross": {
      const w = s / 6;
      for (let i = 0; i < 3; i++) ctx.fillRect(x, y + w * (0.5 + i * 2), s, w);
      for (const f of [0.25, 0.75]) ctx.fillRect(x + s * f - w / 2, y, w, s);
      return;
    }

    // shape 21
    case "rhombus": {
      const r = s * 0.3;
      ctx.save();
      ctx.rect(x, y, s, s);
      ctx.clip();
      ctx.beginPath();
      ctx.lineWidth = s * 0.1;
      ctx.lineJoin = "miter";
      ctx.lineCap = "butt";
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      for (const [px, py] of [[x, y], [x + s, y], [x, y + s], [x + s, y + s]]) {
        const dx = px === x ? 1 : -1, dy = py === y ? 1 : -1;
        ctx.moveTo(px + dx * r * 1.2, py - dy * r * 0.2);
        ctx.lineTo(px - dx * r * 0.2, py + dy * r * 1.2);
      }
      ctx.stroke();
      ctx.restore();
      edgeDots(ctx, x, y, s, [[0, 0.5], [1, 0.5]]);
      return;
    }

    // shape 20
    case "frame": {
      const w = s * 0.14;
      ctx.lineWidth = w;
      ctx.lineJoin = "miter";
      ctx.strokeRect(x + s * 0.18, y + s * 0.18, s * 0.64, s * 0.64);
      return;
    }

    // shape 22
    case "frameleft":
    // shape 23
    case "frameright":
    // shape 24
    case "frametop":
    // shape 25
    case "framebottom":
    // shape 26
    case "frameleftright":
    // shape 27
    case "frametopbottom": {
      ctx.lineWidth = s * 0.14;
      ctx.lineJoin = "miter";
      ctx.lineCap = "butt";
      ctx.strokeRect(x + s * 0.18, y + s * 0.18, s * 0.64, s * 0.64);
      for (const [dx, dy] of FRAME_LINES[shape]) {
        ctx.moveTo(cx + dx * s * 0.32, cy + dy * s * 0.32);
        ctx.lineTo(cx + dx * s * 0.5, cy + dy * s * 0.5);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, s * DOT, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
  }
}
