// Based on "Infinite HTML <canvas>" by Sandro Maglione (MIT License, see LICENSE)
// https://github.com/SandroMaglione/infinite-html-canvas
// Converted from TypeScript to plain JavaScript.

export class InfiniteCanvas {
  canvas = null;
  context = null;
  cellSize;
  showGrid;
  onDraw;

  #scale = 1;
  #offsetX = 0;
  #offsetY = 0;

  #touchMode = "single";
  #prevTouch = [null, null];

  constructor(cellSize = 40, { showGrid = true, onDraw = null } = {}) {
    this.cellSize = cellSize;
    this.showGrid = showGrid;
    this.onDraw = onDraw; // called with (context, this) every time the canvas redraws

    const canvas = document.getElementById("canvas");
    if (canvas && canvas instanceof HTMLCanvasElement) {
      this.canvas = canvas;
      this.#setupEvents(canvas);

      const context = canvas.getContext("2d");

      if (context) {
        this.context = context;
        this.#draw();
      } else {
        console.error(`<canvas> element is missing context 2d`);
      }
    } else {
      console.error(`<canvas> element with id="canvas" not found`);
    }
  }

  toVirtualX(xReal) {
    return (xReal + this.#offsetX) * this.#scale;
  }
  toVirtualY(yReal) {
    return (yReal + this.#offsetY) * this.#scale;
  }
  toRealX(xVirtual) {
    return xVirtual / this.#scale - this.#offsetX;
  }
  toRealY(yVirtual) {
    return yVirtual / this.#scale - this.#offsetY;
  }

  virtualHeight() {
    return (this.canvas?.clientHeight ?? 0) / this.#scale;
  }

  virtualWidth() {
    return (this.canvas?.clientWidth ?? 0) / this.#scale;
  }

  get scale() {
    return this.#scale;
  }

  /** coded with Claude, assisted in moving the canvas but keep the bird center */
  centerOn(x, y) {
    this.#offsetX = Math.round(this.virtualWidth() / 2 - x);
    this.#offsetY = Math.round(this.virtualHeight() / 2 - y);
  }

  render() {
    this.#draw();
  }

  zoom(amount) {
    this.#scale *= amount;
    this.#draw();
  }

  offsetLeft(amount) {
    this.#offsetX -= amount;
    this.#draw();
  }

  offsetRight(amount) {
    this.#offsetX += amount;
    this.#draw();
  }

  offsetUp(amount) {
    this.#offsetY -= amount;
    this.#draw();
  }

  offsetDown(amount) {
    this.#offsetY += amount;
    this.#draw();
  }

  #draw() {
    if (this.canvas && this.context) {
    //claude assisted in making the canvas responsive to window size changes and ensurig it runs
      const dpr = window.devicePixelRatio || 1;
      const width = document.body.clientWidth, height = document.body.clientHeight;
      if (this.canvas.width !== Math.round(width * dpr) || this.canvas.height !== Math.round(height * dpr)) {
        this.canvas.width = Math.round(width * dpr);
        this.canvas.height = Math.round(height * dpr);
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
      }
    
      this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.context.clearRect(0, 0, width, height);
      if (this.onDraw) this.onDraw(this.context, this);
      if (this.showGrid) this.#drawGrid();
    }
  }

  #setupEvents(canvas) {
    canvas.addEventListener("touchstart", (event) =>
      this.#onTouchStart(event.touches)
    );
    canvas.addEventListener("touchmove", (event) =>
      this.#onTouchMove(event.touches)
    );
    window.addEventListener("resize", () => this.#draw());
  }

  #onTouchStart(touches) {
    if (touches.length == 1) {
      this.#touchMode = "single";
    } else if (touches.length >= 2) {
      this.#touchMode = "double";
    }
    this.#prevTouch[0] = touches[0];
    this.#prevTouch[1] = touches[1];
    this.#onTouchMove(touches);
  }

  #onTouchMove(touches) {
    const touch0X = touches[0].pageX;
    const touch0Y = touches[0].pageY;
    const prevTouch0X = this.#prevTouch[0].pageX;
    const prevTouch0Y = this.#prevTouch[0].pageY;

    if (this.#touchMode === "single") {
    } else if (this.#touchMode === "double") {
      const touch1X = touches[1].pageX;
      const touch1Y = touches[1].pageY;
      const prevTouch1X = this.#prevTouch[1].pageX;
      const prevTouch1Y = this.#prevTouch[1].pageY;
      const scaleAmount = this.#zoom(
        [touch0X, touch0Y],
        [prevTouch0X, prevTouch0Y],
        [touch1X, touch1Y],
        [prevTouch1X, prevTouch1Y]
      );

      this.#pan(
        scaleAmount,
        [touch0X, touch0Y],
        [prevTouch0X, prevTouch0Y],
        [touch1X, touch1Y],
        [prevTouch1X, prevTouch1Y]
      );
      this.#draw();
    }

    this.#prevTouch[0] = touches[0];
    this.#prevTouch[1] = touches[1];
  }


  #pan(
    scaleAmount,
    [touch0X, touch0Y],
    [prevTouch0X, prevTouch0Y],
    [touch1X, touch1Y],
    [prevTouch1X, prevTouch1Y]
  ) {
   
    const midX = (touch0X + touch1X) / 2;
    const midY = (touch0Y + touch1Y) / 2;
    const prevMidX = (prevTouch0X + prevTouch1X) / 2;
    const prevMidY = (prevTouch0Y + prevTouch1Y) / 2;
    const panX = midX - prevMidX;
    const panY = midY - prevMidY;

    this.#offsetX += panX / this.#scale;
    this.#offsetY += panY / this.#scale;
    const zoomRatioX = midX / (this.canvas?.clientWidth ?? 1);
    const zoomRatioY = midY / (this.canvas?.clientHeight ?? 1);
    const unitsZoomedX = this.virtualWidth() * scaleAmount;
    const unitsZoomedY = this.virtualHeight() * scaleAmount;
    const unitsAddLeft = unitsZoomedX * zoomRatioX;
    const unitsAddTop = unitsZoomedY * zoomRatioY;

    this.#offsetX += unitsAddLeft;
    this.#offsetY += unitsAddTop;
  }

  #zoom(
    [touch0X, touch0Y],
    [prevTouch0X, prevTouch0Y],
    [touch1X, touch1Y],
    [prevTouch1X, prevTouch1Y]
  ) {
    const hypot = Math.sqrt(
      Math.pow(touch0X - touch1X, 2) + Math.pow(touch0Y - touch1Y, 2)
    );

    const prevHypot = Math.sqrt(
      Math.pow(prevTouch0X - prevTouch1X, 2) +
        Math.pow(prevTouch0Y - prevTouch1Y, 2)
    );

    const zoomAmount = hypot / prevHypot;
    this.zoom(zoomAmount);

    const scaleAmount = 1 - zoomAmount;
    return scaleAmount;
  }

  #drawGrid() {
    if (this.canvas && this.context) {
      this.context.strokeStyle = "rgb(229,231,235)";
      this.context.lineWidth = 1;
      this.context.font = "10px serif";
      this.context.beginPath();

      const width = this.canvas.clientWidth;
      const height = this.canvas.clientHeight;

      for (
        let x = (this.#offsetX % this.cellSize) * this.#scale;
        x <= width;
        x += this.cellSize * this.#scale
      ) {
        const source = x;
        this.context.moveTo(source, 0);
        this.context.lineTo(source, height);

        this.context.fillText(
          `${this.toVirtualX(source).toFixed(0)}`,
          source,
          10
        );
      }

      for (
        let y = (this.#offsetY % this.cellSize) * this.#scale;
        y <= height;
        y += this.cellSize * this.#scale
      ) {
        const destination = y;
        this.context.moveTo(0, destination);
        this.context.lineTo(width, destination);

        this.context.fillText(
          `${this.toVirtualY(destination).toFixed(0)}`,
          0,
          destination
        );
      }
      this.context.stroke();
    }
  }
}
