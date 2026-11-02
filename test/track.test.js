import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Track } from '../src/sim/track.js';
import meadow from '../src/tracks/meadow.js';

// Every track definition should pass these. Add new tracks to this list.
const TRACKS = [meadow];

for (const def of TRACKS) {
  const track = new Track(def);

  test(`${def.name}: stretches of road never come close enough to cut across`, () => {
    const gap = track.minimumSeparation();
    assert.ok(gap > track.fenceOffset * 2 + 10, `closest stretches are ${gap.toFixed(1)}px apart`);
  });

  test(`${def.name}: the whole course fits inside the world`, () => {
    const margin = track.fenceOffset + 8;
    for (let i = 0; i < track.count; i++) {
      assert.ok(track.xs[i] > margin && track.xs[i] < def.world.width - margin, `x ${track.xs[i]} at sample ${i}`);
      assert.ok(track.ys[i] > margin && track.ys[i] < def.world.height - margin, `y ${track.ys[i]} at sample ${i}`);
    }
  });

  test(`${def.name}: projecting a point finds where it came from`, () => {
    for (const s of [0, 123.4, track.length / 2, track.length - 3]) {
      for (const lateral of [-20, 0, 15]) {
        const p = track.pointAt(s, lateral);
        const back = track.project(p.x, p.y);
        const ds = Math.abs(back.s - s);
        assert.ok(Math.min(ds, track.length - ds) < 1, `s ${s} -> ${back.s}`);
        assert.ok(Math.abs(back.lateral - lateral) < 0.5, `lateral ${lateral} -> ${back.lateral}`);
      }
    }
  });

  test(`${def.name}: the start grid sits on the road, behind the line, facing forward`, () => {
    for (const slot of track.startGrid(8)) {
      const p = track.project(slot.x, slot.y);
      assert.equal(track.surfaceAt(p.lateral), 'road');
      assert.ok(slot.s < 0);
    }
  });
}

test('surfaces go road, curb, grass from the centre out', () => {
  const track = new Track(meadow);
  assert.equal(track.surfaceAt(0), 'road');
  assert.equal(track.surfaceAt(-track.halfWidth), 'road');
  assert.equal(track.surfaceAt(track.halfWidth + 1), 'curb');
  assert.equal(track.surfaceAt(-(track.halfWidth + track.curbWidth + 1)), 'grass');
});
