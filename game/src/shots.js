// Deterministic screenshot scenes for ?shot=play|rush|combo|end|start&seed=N.
// Each stages the world into a fixed, legible moment and returns the screen
// to paint; every scene shows a BUSY kitchen — all three grill zones filled,
// a burger mid-stack attached to the plate, three live tickets.
//
// COHERENCE RULE (the four shots are one run, in order):
//   play  -> score 340,  served 2, shift 2:22
//   rush  -> score 520,  served 3, shift 1:35
//   combo -> score 690,  served 4, shift 1:12
//   end   -> score 1240, served 7, shift 0:00
// Score strictly rises, served never falls, the clock strictly falls.

import { RECIPES } from './config.js';

function busyGrill(state, zones, flares) {
  state.grill = zones;
  state.flare = flares;
}

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
    // Shift-complete WITH the game visible: the renderer paints the kitchen
    // first and the results panel over it, the final burger on the plate.
    world.reset();
    state.screen = 'over';
    state.score = 1240;
    state.served = 7;
    state.servedPerfect = 4;
    state.combo = 0;
    state.comboBest = 3;
    state.shiftLeft = 0;
    state.overReason = 'Shift over — 7 burgers served!';
    state.selected = 'bunBottom';
    // The final burger, fully built: a Double Trouble, all six layers.
    state.stack = ['bunBottom', 'patty', 'cheese', 'patty', 'tomato', 'bunTop'];
    busyGrill(state,
      [{ doneness: 30, flipped: false }, { doneness: 65, flipped: true }, null],
      [0, 0, 0]);
    // The current ticket is the Double Trouble the final burger matches,
    // so the hint under the plate reads "Matching 6/6 — next: SERVE!".
    state.tickets = [
      { recipe: RECIPES[2], patience: 30, max: 45 },
      { recipe: RECIPES[0], patience: 45, max: 45 },
      { recipe: RECIPES[1], patience: 45, max: 45 },
    ];
    state.message = '';
    return { screen: 'over', best: 1240 };
  }
  if (name === 'rush') {
    // Beat 2 — ticket rush: the current ticket is 8 seconds from walking
    // out, red and pulsing, while the grill stays busy.
    world.reset();
    state.score = 520;
    state.served = 3;
    state.combo = 1;
    state.shiftLeft = 95; // 1:35 left on the shift clock
    state.selected = 'lettuce';
    state.stack = ['bunBottom', 'patty', 'cheese'];
    busyGrill(state,
      [{ doneness: 42, flipped: false }, { doneness: 68, flipped: true }, { doneness: 24, flipped: false }],
      [0, 0, 0.3]);
    state.tickets = [
      { recipe: RECIPES[1], patience: 8, max: 45 },
      { recipe: RECIPES[2], patience: 30, max: 45 },
      { recipe: RECIPES[0], patience: 44, max: 45 },
    ];
    state.message = 'HURRY! 8 SECONDS LEFT!';
    state.messageUntil = 9999;
    return { screen: 'play', best: 520 };
  }
  if (name === 'combo') {
    // Beat 3 — perfect-flip + combo moment: a flare is burning on HIGH,
    // a perfect patty just paid off, combo x2, five layers stacked.
    world.reset();
    state.score = 690;
    state.served = 4;
    state.combo = 2;
    state.comboBest = 2;
    state.shiftLeft = 72; // 1:12 left on the shift clock
    state.selected = 'bunBottom';
    state.stack = ['bunBottom', 'patty', 'cheese', 'patty', 'tomato'];
    busyGrill(state,
      [{ doneness: 55, flipped: true }, { doneness: 78, flipped: true }, { doneness: 91, flipped: true }],
      [0, 0, 0.95]);
    state.tickets = [
      { recipe: RECIPES[2], patience: 22, max: 45 },
      { recipe: RECIPES[0], patience: 38, max: 45 },
      { recipe: RECIPES[1], patience: 45, max: 45 },
    ];
    state.message = 'PERFECT PATTY! +20';
    state.messageUntil = 9999;
    return { screen: 'play', best: 690 };
  }
  // play: mid-action hero shot — the cover.
  world.reset();
  state.score = 340;
  state.served = 2;
  state.combo = 1;
  state.shiftLeft = 142; // 2:22 left on the shift clock
  state.selected = 'tomato';
  // Burger mid-stack on the plate, attached: bun, patty, cheese, lettuce.
  state.stack = ['bunBottom', 'patty', 'cheese', 'lettuce'];
  // All three zones cooking: raw on LOW, perfect on MED, flaring on HIGH.
  busyGrill(state,
    [{ doneness: 18, flipped: false }, { doneness: 72, flipped: true }, { doneness: 88, flipped: true }],
    [0, 0, 0.9]);
  state.tickets = [
    { recipe: RECIPES[2], patience: 28, max: 45 },
    { recipe: RECIPES[0], patience: 41, max: 45 },
    { recipe: RECIPES[1], patience: 45, max: 45 },
  ];
  state.message = 'PERFECT PATTY! +20';
  state.messageUntil = 9999;
  return { screen: 'play', best: 340 };
}
