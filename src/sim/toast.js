// A short message for one kart's driver ("HIT BY BOLT!", "SLOTS X2"). The HUD shows
// the ones meant for the player; everything else ignores them.
//
// colour: 'white' | 'gold' | 'good' | 'bad'

export function toast(race, kart, text, colour = 'white') {
  race.events.emit('toast', { kart, text, colour });
}
