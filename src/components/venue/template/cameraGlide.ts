// A camera glide a phone can keep up with.
//
// Painting a new viewBox on every frame makes the browser draw every seat block again each time. On these maps
// that reached about fifteen frames a second: a tap moved the map in a few jerks. Here the map is drawn once, wide
// enough to hold both the view it leaves and the view it goes to, and that finished picture is moved with a CSS
// transform, which the browser moves at the screen's own rate. The real view is painted once more when the glide ends.

export type CameraBox = readonly [number, number, number, number];
type Size = { width: number; height: number };

/** Longer the further the zoom goes. */
export function glideDuration(fromWidth: number, toWidth: number) {
  return Math.round(Math.min(900, 420 + 170 * Math.abs(Math.log(toWidth / fromWidth))));
}

/** The camera part-way from one view to another: the zoom changes evenly in scale, eased in and out. */
export function cameraAt(from: CameraBox, to: CameraBox, progress: number): [number, number, number, number] {
  const eased = progress < .5 ? 4 * progress ** 3 : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  const width = from[2] * Math.pow(to[2] / from[2], eased), height = from[3] * Math.pow(to[3] / from[3], eased);
  const cx = from[0] + from[2] / 2 + (to[0] + to[2] / 2 - from[0] - from[2] / 2) * eased;
  const cy = from[1] + from[3] / 2 + (to[1] + to[3] / 2 - from[1] - from[3] / 2) * eased;
  return [cx - width / 2, cy - height / 2, width, height];
}

/** A box fitted in the canvas (xMidYMid meet): the map point at the canvas' top-left corner and the pixels per map unit. */
function placement(box: CameraBox, size: Size) {
  const scale = Math.min(size.width / box[2], size.height / box[3]);
  return { scale, x: box[0] - (size.width / scale - box[2]) / 2, y: box[1] - (size.height / scale - box[3]) / 2 };
}

/** The smallest canvas-shaped view that holds everything both views show. */
export function coveringView(a: CameraBox, b: CameraBox, size: Size): [number, number, number, number] {
  const p = placement(a, size), q = placement(b, size);
  const left = Math.min(p.x, q.x), top = Math.min(p.y, q.y);
  const right = Math.max(p.x + size.width / p.scale, q.x + size.width / q.scale), bottom = Math.max(p.y + size.height / p.scale, q.y + size.height / q.scale);
  const scale = Math.min(size.width / (right - left), size.height / (bottom - top));
  const width = size.width / scale, height = size.height / scale;
  return [(left + right - width) / 2, (top + bottom - height) / 2, width, height];
}

/** The CSS transform (origin 0 0) under which a picture drawn for `drawn` shows `view`. */
export function viewTransform(view: CameraBox, drawn: CameraBox, size: Size) {
  const v = placement(view, size), d = placement(drawn, size);
  return `translate(${((d.x - v.x) * v.scale).toFixed(2)}px, ${((d.y - v.y) * v.scale).toFixed(2)}px) scale(${(v.scale / d.scale).toFixed(5)})`;
}

/**
 * A view at the same zoom as `current`, moved only as far as a block needs to show whole inside the visible part
 * of the canvas (its top `visible` pixels). The same view comes back when the block already shows whole; a block
 * larger than the visible part is centred in it.
 */
export function nudgedView(current: CameraBox, block: { left: number; top: number; right: number; bottom: number }, size: Size, visible = size.height, margin = 18): CameraBox {
  const at = placement(current, size);
  const shift = (low: number, high: number, end: number) => high - low > end - margin * 2 ? end / 2 - (low + high) / 2
    : low < margin ? margin - low : high > end - margin ? end - margin - high : 0;
  const dx = shift((block.left - at.x) * at.scale, (block.right - at.x) * at.scale, size.width);
  const dy = shift((block.top - at.y) * at.scale, (block.bottom - at.y) * at.scale, visible);
  return Math.abs(dx) < .5 && Math.abs(dy) < .5 ? current : [current[0] - dx / at.scale, current[1] - dy / at.scale, current[2], current[3]];
}

export type Glide = {
  /** The view the map is drawn for while the glide runs. */
  drawn: CameraBox;
  /** Ends the glide where it is. The caller then paints the view it had reached (the last one given to `track`). */
  stop(): void;
};

/**
 * Glides `layer` (the map's picture) from one view to another.
 * `draw` paints the wide view the glide needs; `track` is told the view on screen as it changes; `done` is called at
 * the end, with the transform already gone, to paint the final view.
 */
export function startGlide(layer: HTMLElement | SVGElement, options: {
  from: CameraBox; to: CameraBox; size: Size; duration: number;
  draw(box: CameraBox): void; track(box: CameraBox): void; done(): void;
}): Glide {
  const { from, to, size, duration } = options;
  const cover = coveringView(from, to, size), start = placement(from, size);
  // Gliding into a part of what is already drawn (a zoom in) needs no new picture.
  const inside = Math.abs(cover[2] - size.width / start.scale) < cover[2] * .002 && Math.abs(cover[0] - start.x) < cover[2] * .002 && Math.abs(cover[1] - start.y) < cover[2] * .002;
  const drawn: CameraBox = inside ? from : cover;
  options.draw(drawn);
  const steps = 24;
  const frames = Array.from({ length: steps + 1 }, (_, index) => ({ transform: viewTransform(cameraAt(from, to, index / steps), drawn, size) }));
  const style = layer.style;
  style.transformOrigin = "0 0"; style.willChange = "transform";
  const animation = layer.animate(frames, { duration, easing: "linear", fill: "forwards" });
  let over = false, frame = 0;
  const end = () => { over = true; cancelAnimationFrame(frame); window.clearTimeout(guard); animation.cancel(); style.willChange = ""; style.transformOrigin = ""; };
  const finish = () => { if (over) return; end(); options.track(to); options.done(); };
  // The view on screen is read from the animation's own clock, so a glide stopped half-way stays where it was seen.
  const follow = () => {
    if (over) return;
    const time = animation.currentTime;
    options.track(cameraAt(from, to, typeof time === "number" ? Math.min(1, Math.max(0, time / duration)) : 0));
    frame = requestAnimationFrame(follow);
  };
  frame = requestAnimationFrame(follow);
  animation.onfinish = finish;
  // A picture taken off the page never reports its end: the glide still finishes.
  const guard = window.setTimeout(finish, duration + 400);
  return { drawn, stop() { if (!over) end(); } };
}
