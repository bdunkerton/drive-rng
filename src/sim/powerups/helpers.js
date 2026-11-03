// Small things several powerups share.

/** 0 when leading, 1 when last. Weights use it to favour the karts at the back. */
export const behind = ({ position, racers }) => (racers > 1 ? (position - 1) / (racers - 1) : 0);
