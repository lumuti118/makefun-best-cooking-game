// Deterministic screenshot scenes for ?shot=start|play|end&seed=N.
// Each stages the world into a fixed, legible moment and returns the screen
// to paint; the play scene is the hero: a tall burger mid-stack, a patty on
// the grill in the green zone, the ticket board, the timer and the plate.

import { RECIPES } from './config.js';

export function stageShot(name, world) {
  const state = world.state;
  if (name === 'start') {
    state.screen = 'title';
    state.score = 0;
    state.served = 0;
    state.shiftLeft = 180;
    state.tickets = [
      { recipe: RECIPES[0], patience: 45, max: 45 },
      { recipe: RECIPES[1], patience: 45, max: 45 },
      { recipe: RECIPES[2], patience: 45, max: 45 },
    ];
    return { screen: 'title', best: 0 };
  }
  if (name === 'end') {
    state.screen = 'over';
    state.score = 1240;
    state.served = 7;
    state.servedPerfect = 4;
    state.shiftLeft = 0;
    state.overReason = 'Shift over — 7 burgers served!';
    state.tickets = [
      { recipe: RECIPES[1], patience: 30, max: 45 },
      { recipe: RECIPES[0], patience: 45, max: 45 },
      { recipe: RECIPES[2], patience: 45, max: 45 },
    ];
    return { screen: 'over', best: 1240 };
  }
  // play: mid-action hero shot.
  world.reset();
  state.score = 340;
  state.served = 2;
  state.shiftLeft = 142; // 2:22 left on the shift clock
  state.selected = 'tomato';
  // Tall burger mid-stack on the plate: bun, patty, cheese, lettuce.
  state.stack = ['bunBottom', 'patty', 'cheese', 'lettuce'];
  // A patty sizzling in the green zone on MED, one raw on LOW.
  state.grill = [
    { doneness: 18, flipped: false },
    { doneness: 72, flipped: true },
    null,
  ];
  state.flare = [0, 0.35, 0];
  state.tickets = [
    { recipe: RECIPES[2], patience: 28, max: 45 },
    { recipe: RECIPES[0], patience: 41, max: 45 },
    { recipe: RECIPES[1], patience: 45, max: 45 },
  ];
  state.message = 'PERFECT PATTY! +20';
  state.messageUntil = 9999;
  return { screen: 'play', best: 340 };
}
