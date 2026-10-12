import { InfiniteCanvas } from "./infinite-canvas.js";

const infiniteCanvas = new InfiniteCanvas(30);
document.addEventListener("contextmenu", (e) => e.preventDefault(), false);

/** Scroll with trackpad or mouse wheel */
document.getElementById("canvas").addEventListener(
  "wheel",
  (event) => {
    event.preventDefault(); // stop the browser's own scroll/zoom
    infiniteCanvas.offsetLeft(event.deltaX);
    infiniteCanvas.offsetUp(event.deltaY);
  },
  { passive: false } // required so preventDefault() works
);
