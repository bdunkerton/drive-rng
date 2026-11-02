// Small helpers for off-screen canvases. Only used in the browser.

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: false });
  g.imageSmoothingEnabled = false;
  return { canvas: c, g };
}

/** Draw a sprite defined as rows of characters, using a char -> colour map. */
export function paintRows(g, rows, map, ox = 0, oy = 0) {
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const col = map[rows[y][x]];
      if (col) {
        g.fillStyle = col;
        g.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  }
}

/** Stable pseudo-random value in [0,1) for a pixel coordinate. */
export function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
