// Paints a track once into a big off-screen canvas: forest, fence, grass, curbs,
// road, the start line, a pond, trees and flowers. The race view just copies the
// visible part each frame.
//
// Method: stroke the centreline at decreasing widths with canvas paths, snap every
// pixel to the nearest palette colour (kills anti-aliasing), then texture and decorate
// pixel by pixel.

import { PAL, TRACK_COLOURS, hexToRgb } from './palette.js';
import { makeCanvas, hash2 } from './canvas.js';
import { Rng } from '../core/rng.js';

export function paintTrack(track) {
  const { width: W, height: H } = track.world;
  const { canvas, g } = makeCanvas(W, H);

  const path = () => {
    g.beginPath();
    g.moveTo(track.xs[0], track.ys[0]);
    for (let i = 1; i < track.count; i++) g.lineTo(track.xs[i], track.ys[i]);
    g.closePath();
  };
  const stroke = (width, colour, dash = null) => {
    path();
    g.lineWidth = width;
    g.lineJoin = 'round';
    g.strokeStyle = colour;
    g.setLineDash(dash ?? []);
    g.stroke();
  };

  g.fillStyle = PAL.forest;
  g.fillRect(0, 0, W, H);
  const fence = track.fenceOffset;
  stroke((fence + 2) * 2, PAL.fence);
  stroke(fence * 2, PAL.grass);
  stroke((track.halfWidth + track.curbWidth) * 2, PAL.curbRed);
  stroke((track.halfWidth + track.curbWidth) * 2, PAL.curbWhite, [6, 6]);
  stroke(track.halfWidth * 2, PAL.road);
  g.setLineDash([]);

  // Snap to palette, then texture each surface.
  const img = g.getImageData(0, 0, W, H);
  const d = img.data;
  const base = TRACK_COLOURS.map(hexToRgb);
  const C = Object.fromEntries(
    Object.entries(PAL).filter(([, v]) => v.startsWith('#')).map(([k, v]) => [k, hexToRgb(v)]),
  );
  const forestIdx = TRACK_COLOURS.indexOf(PAL.forest);
  const grassIdx = TRACK_COLOURS.indexOf(PAL.grass);
  const roadIdx = TRACK_COLOURS.indexOf(PAL.road);
  const kind = new Uint8Array(W * H); // palette index per pixel, for decorating later

  for (let y = 0, p = 0, q = 0; y < H; y++) {
    for (let x = 0; x < W; x++, p += 4, q++) {
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < base.length; i++) {
        const dr = d[p] - base[i][0];
        const dg = d[p + 1] - base[i][1];
        const db = d[p + 2] - base[i][2];
        const dd = dr * dr + dg * dg + db * db;
        if (dd < bestD) {
          bestD = dd;
          best = i;
        }
      }
      kind[q] = best;
      let col = base[best];
      const r = hash2(x, y);
      if (best === grassIdx) {
        // Mowed stripes plus the odd darker tuft.
        const stripe = (((x + y) >> 4) & 1) === 0;
        col = stripe ? C.grass : C.grassDark;
        if (r < 0.04) col = stripe ? C.grassDark : C.grass;
      } else if (best === roadIdx) {
        if (r < 0.05) col = C.roadLight;
        else if (r > 0.95) col = C.roadDark;
      } else if (best === forestIdx) {
        col = hash2(x >> 2, y >> 2) < 0.5 ? C.forest : C.forestLight;
        if (r < 0.06) col = C.treeDark;
      }
      d[p] = col[0];
      d[p + 1] = col[1];
      d[p + 2] = col[2];
      d[p + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);

  const rng = new Rng(track.id + ':art');
  const isGrass = (x, y) => x >= 0 && y >= 0 && x < W && y < H && kind[(y | 0) * W + (x | 0)] === grassIdx;
  const isForest = (x, y) => x >= 0 && y >= 0 && x < W && y < H && kind[(y | 0) * W + (x | 0)] === forestIdx;

  paintFencePosts(g, track);
  paintStartLine(g, track);
  paintGridSlots(g, track);
  if (track.def.scenery?.pond) paintPond(g, track.def.scenery.pond, isForest);
  paintTrees(g, rng, track, isForest, track.def.scenery?.trees ?? 120);
  paintFlowers(g, rng, isGrass, isForest, track, track.def.scenery?.flowers ?? 200);

  return canvas;
}

function paintFencePosts(g, track) {
  const off = track.fenceOffset + 1;
  g.fillStyle = PAL.fencePost;
  for (let s = 0; s < track.length; s += 10) {
    for (const side of [-1, 1]) {
      const p = track.pointAt(s, side * off);
      g.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 2, 2);
    }
  }
}

function paintStartLine(g, track) {
  // A checkered band two squares deep across the road at s = 0.
  const sq = 3;
  for (let row = 0; row < 2; row++) {
    for (let lat = -track.halfWidth; lat < track.halfWidth; lat += sq) {
      const col = Math.round((lat + track.halfWidth) / sq);
      g.fillStyle = (col + row) % 2 === 0 ? PAL.white : PAL.black;
      for (let a = 0; a < sq; a++) {
        for (let b = 0; b < sq; b++) {
          const p = track.pointAt(row * sq + a - sq, lat + b);
          g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
        }
      }
    }
  }
}

function paintGridSlots(g, track) {
  g.fillStyle = PAL.curbWhite;
  for (const slot of track.startGrid(8)) {
    // A small bracket ahead of each grid slot.
    for (let k = -5; k <= 5; k++) {
      const base = track.project(slot.x, slot.y);
      const p = track.pointAt(base.s + 7, base.lateral + k);
      g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
  }
}

function paintPond(g, pond, isForest) {
  // Only paint where the forest (infield) is, so it can never cover the course.
  for (let y = pond.y - pond.ry - 3; y <= pond.y + pond.ry + 3; y++) {
    for (let x = pond.x - pond.rx - 3; x <= pond.x + pond.rx + 3; x++) {
      if (!isForest(x, y)) continue;
      const wobble = Math.sin(x * 0.07) * 4 + Math.cos(y * 0.11) * 3;
      const e = ((x - pond.x) / (pond.rx + wobble)) ** 2 + ((y - pond.y) / (pond.ry + wobble * 0.5)) ** 2;
      if (e > 1.12) continue;
      let col = PAL.sand;
      if (e < 0.92) col = hash2(x >> 1, y) < 0.06 ? PAL.waterLight : PAL.water;
      g.fillStyle = col;
      g.fillRect(x, y, 1, 1);
    }
  }
}

function paintTrees(g, rng, track, isForest, count) {
  for (let placed = 0, tries = 0; placed < count && tries < count * 20; tries++) {
    const x = Math.floor(rng.range(10, track.world.width - 10));
    const y = Math.floor(rng.range(10, track.world.height - 10));
    const r = rng.int(4, 7);
    if (!isForest(x - r, y) || !isForest(x + r, y) || !isForest(x, y - r) || !isForest(x, y + r + 2)) continue;
    placed++;
    // Shadow, trunk, canopy with a highlight.
    g.fillStyle = PAL.treeDark;
    disc(g, x + 2, y + 3, r);
    g.fillStyle = PAL.trunk;
    g.fillRect(x - 1, y + r - 2, 2, 3);
    g.fillStyle = PAL.treeMid;
    disc(g, x, y, r);
    g.fillStyle = PAL.treeLight;
    disc(g, x - Math.ceil(r / 3), y - Math.ceil(r / 3), Math.max(1, Math.floor(r / 2)));
  }
}

function paintFlowers(g, rng, isGrass, isForest, track, count) {
  const colours = [PAL.flowerYellow, PAL.flowerPink, PAL.flowerWhite];
  for (let placed = 0, tries = 0; placed < count && tries < count * 30; tries++) {
    const x = Math.floor(rng.range(0, track.world.width));
    const y = Math.floor(rng.range(0, track.world.height));
    // Flowers on the grass verge and in clearings of the infield.
    if (!isGrass(x, y) && !(isForest(x, y) && rng.chance(0.25))) continue;
    placed++;
    g.fillStyle = rng.pick(colours);
    g.fillRect(x, y, 1, 1);
  }
}

function disc(g, cx, cy, r) {
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.6));
    g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
  }
}

/** A small top-down picture of the course for the HUD minimap. */
export function paintMinimap(track, maxW, maxH) {
  const pad = 3;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < track.count; i++) {
    minX = Math.min(minX, track.xs[i]);
    maxX = Math.max(maxX, track.xs[i]);
    minY = Math.min(minY, track.ys[i]);
    maxY = Math.max(maxY, track.ys[i]);
  }
  const scale = Math.min((maxW - pad * 2) / (maxX - minX), (maxH - pad * 2) / (maxY - minY));
  const w = Math.ceil((maxX - minX) * scale + pad * 2);
  const h = Math.ceil((maxY - minY) * scale + pad * 2);
  const { canvas, g } = makeCanvas(w, h);
  const toMap = (x, y) => [Math.round((x - minX) * scale + pad), Math.round((y - minY) * scale + pad)];
  for (const [colour, thick] of [[PAL.black, 2], [PAL.silver, 1]]) {
    g.fillStyle = colour;
    for (let i = 0; i < track.count; i++) {
      const [x, y] = toMap(track.xs[i], track.ys[i]);
      g.fillRect(x - (thick === 2 ? 1 : 0), y - (thick === 2 ? 1 : 0), thick === 2 ? 3 : 1, thick === 2 ? 3 : 1);
    }
  }
  const [sx, sy] = toMap(track.xs[0], track.ys[0]);
  g.fillStyle = PAL.white;
  g.fillRect(sx - 1, sy - 2, 2, 4);
  return { canvas, toMap, width: w, height: h };
}
