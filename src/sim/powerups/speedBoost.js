import { powerups } from './registry.js';

export const SPEED_BOOST = {
  duration: 1.5,
  maxSpeed: 1.55,
  accel: 3,
  kick: 45,
};

powerups.register({
  id: 'speed-boost',
  name: 'BOOST',
  description: 'A burst of speed for a second and a half.',
  icon: 'boost',
  weight: 1,
  use({ kart, race }) {
    kart.kick(SPEED_BOOST.kick);
    kart.addEffect(
      {
        id: 'speed-boost',
        duration: SPEED_BOOST.duration,
        modifiers: { maxSpeed: SPEED_BOOST.maxSpeed, accel: SPEED_BOOST.accel },
        tags: ['boost'],
        // A boost drives you forward even if you let go of the throttle.
        onTick(k) {
          k.controls.throttle = 1;
          k.controls.brake = 0;
        },
      },
      race,
    );
    race.events.emit('sfx', { name: 'boost', kart });
  },
});
