export interface MapPerspective {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

/** An affine tabletop view: the SVG hit areas and labels share this transform. */
export function mapPerspective(
  width: number,
  height: number,
  enabled: boolean,
  focused: boolean,
): MapPerspective {
  if (!enabled) return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

  const angle = ((focused ? -2 : -8) * Math.PI) / 180;
  const squash = focused ? 0.96 : 0.78;
  const size = focused ? 0.97 : 0.92;
  let a = Math.cos(angle) * size;
  let b = Math.sin(angle) * size;
  let c = -Math.sin(angle) * size * squash;
  let d = Math.cos(angle) * size * squash;

  // Also fit narrow screens if the user explicitly opts into 2.5D on mobile.
  const fit = Math.min(
    1,
    (width - 20) / (Math.abs(a) * width + Math.abs(c) * height),
    (height - 40) / (Math.abs(b) * width + Math.abs(d) * height),
  );
  a *= fit;
  b *= fit;
  c *= fit;
  d *= fit;

  return {
    a, b, c, d,
    e: width / 2 - (a * width + c * height) / 2,
    f: height / 2 - (b * width + d * height) / 2 - (focused ? 2 : 8),
  };
}

export function projectMapPoint(x: number, y: number, view: MapPerspective) {
  return { x: view.a * x + view.c * y + view.e, y: view.b * x + view.d * y + view.f };
}

export function perspectiveTransform(view: MapPerspective) {
  return `matrix(${view.a}, ${view.b}, ${view.c}, ${view.d}, ${view.e}, ${view.f})`;
}
