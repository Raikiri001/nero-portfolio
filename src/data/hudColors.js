// The HUD palette for code that can't read CSS variables — canvas 2D
// drawing, SVG built in JS. These MUST equal the `--rgb-*` tokens in
// src/index.css; `npm run check` fails if the two drift apart.
export const HUD_RGB = {
  primary: [0, 144, 217],
  red: [255, 0, 60],
  green: [0, 255, 102],
  yellow: [255, 230, 0],
  white: [255, 255, 255],
  black: [0, 0, 0],
  void: [2, 5, 10],
};

/** `rgba(...)` string for a HUD colour at an alpha. */
export const hudRgba = (name, alpha = 1) => `rgba(${HUD_RGB[name].join(', ')}, ${alpha})`;
