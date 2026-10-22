//claude used to help me make sure my design stays flexible
//math and. decoration inspired by https://github.com/b2renger/p5js_patterns
const PIXEL = 2; 
export const frame = document.createElement("canvas");
frame.className = "frame";
document.body.appendChild(frame);

const css = getComputedStyle(document.documentElement);
const ink = css.getPropertyValue("--ink").trim();

const TAU = Math.PI * 2;
const THIN = 0.46, WIDE = 0.7; 
const LACE = 0.16; 

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
function depth(x, half, B) {
  const middle = 1 - smooth((x - B * 0.7) / (B * 1.1)); 
  const corner = smooth((x - (half - B * 2)) / (B * 1.3)); 
  return B * (THIN + (WIDE - THIN) * Math.max(middle, corner));
}

function dot(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}
function spiral(ctx, x, y, r, turns, dir, from) {
  ctx.beginPath();
  for (let t = 0; t <= 1.001; t += 0.02) {
    const a = from + dir * t * turns * TAU, rad = r * (1 - 0.7 * t);
    const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
    t === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.stroke();
}
function laceSpots(half, B) {
  const count = Math.max(1, Math.round(half / (B * 0.16)));
  const p = half / count, spots = [];
  for (let i = 0; i < count; i++) spots.push(i * p); 
  return spots;
}
function halfSideFill(ctx, half, B) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(half, 0);
  for (let x = half; x >= 0; x -= 2) ctx.lineTo(x, depth(x, half, B));
  ctx.lineTo(0, depth(0, half, B));
  ctx.fill();
  for (const x of laceSpots(half, B)) dot(ctx, x, depth(x, half, B), B * LACE);
}

function halfSideCut(ctx, half, B) {
  for (const x of laceSpots(half, B)) dot(ctx, x, depth(x, half, B) - B * 0.02, B * 0.055);
  spiral(ctx, B * 0.34, B * 0.36, B * 0.22, 1.2, -1, Math.PI); 
  ctx.beginPath(); 
  ctx.moveTo(B * 0.12, B * 0.58);
  ctx.lineTo(0, B * 0.64);
  ctx.stroke();
}
function cornerFill(ctx, B) {
  dot(ctx, 0, 0, B * 0.76);
  for (let i = 0; i <= 4; i++) {
    const a = (Math.PI / 2) * (i / 4);
    dot(ctx, Math.cos(a) * B * 0.78, Math.sin(a) * B * 0.78, B * LACE);
  }
}
function cornerCut(ctx, B) {
  spiral(ctx, B * 0.36, B * 0.36, B * 0.2, 1.3, 1, Math.PI * 1.25);
  for (let i = 1; i <= 3; i++) { 
    const a = (Math.PI / 2) * (i / 4);
    dot(ctx, Math.cos(a) * B * 0.76, Math.sin(a) * B * 0.76, B * 0.055);
  }
}
function eachSide(ctx, w, h, drawHalf, drawCorner, B) {
  for (const [x, y, angle, length] of [[0, 0, 0, w], [w, 0, Math.PI / 2, h], [w, h, Math.PI, w], [0, h, -Math.PI / 2, h]]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    for (const flip of [1, -1]) {
      ctx.save();
      ctx.translate(length / 2, 0);
      ctx.scale(flip, 1);
      drawHalf(ctx, length / 2, B);
      ctx.restore();
    }
    drawCorner(ctx, B);
    ctx.restore();
  }
}

function draw() {
  const w = window.innerWidth, h = window.innerHeight;
  const probe = document.createElement("div");
  probe.style.width = "var(--border)";
  document.body.appendChild(probe);
  const B = probe.offsetWidth || 60;
  probe.remove();
  const cw = Math.ceil(w / PIXEL), ch = Math.ceil(h / PIXEL);
  frame.width = cw;
  frame.height = ch;
  frame.style.width = `${cw * PIXEL}px`;
  frame.style.height = `${ch * PIXEL}px`;
  const ctx = frame.getContext("2d", { willReadFrequently: true });
  ctx.setTransform(1 / PIXEL, 0, 0, 1 / PIXEL, 0, 0); 
  ctx.fillStyle = ctx.strokeStyle = ink;
  ctx.lineWidth = B * 0.07;
  ctx.lineCap = "round";
  eachSide(ctx, w, h, halfSideFill, cornerFill, B);
  ctx.globalCompositeOperation = "destination-out";
  eachSide(ctx, w, h, halfSideCut, cornerCut, B);
  ctx.globalCompositeOperation = "source-over";
  const img = ctx.getImageData(0, 0, cw, ch), d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] < 128 ? 0 : 255;
  ctx.putImageData(img, 0, 0);
}

draw();
window.addEventListener("resize", draw);
