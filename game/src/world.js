// Burger Station world: tickets, grill, stack, score, combo and timers.
// Pure state + step logic; rendering lives in render.js, input in input.js.
// Events are returned as a list of strings the main loop turns into sounds
// and floating messages ("+160", "BURNT!", "PERFECT FLIP!").
//
// The combo is the streak mechanic: a perfect patty (flipped, lifted inside
// the green doneness window) or a fast serve (patience still over 60%)
// raises it by 1; a wrong serve, a walk-out ticket or a burnt patty resets
// it to 0. Serving with a streak of 2+ pays +10 per streak level on top.

import {
  COMBO_SERVE_BONUS,
  COOK,
  GRILL_ZONES,
  INGREDIENTS,
  PERFECT_PATTY_BONUS,
  PERFECT_SERVE_FRACTION,
  RECIPES,
  SHIFT_SECONDS,
  TICKET_PATIENCE,
} from './config.js';

export function createWorld(random) {
  const state = {
    screen: 'title', // title | play | over
    score: 0,
    served: 0,
    servedPerfect: 0,
    best: 0,
    shiftLeft: SHIFT_SECONDS,
    selected: 'bunBottom',
    stack: [], // layer ids on the plate, bottom first
    grill: [null, null, null], // one patty per heat zone: { doneness, flipped } | null
    tickets: [], // queue of { recipe, patience, max }
    message: '',
    messageUntil: 0,
    flash: 0, // 0..1 red flash intensity (wrong serve / burnt)
    flare: [0, 0, 0], // grease-flare intensity per grill zone
    pop: 0, // serve pop animation timer
    time: 0,
    overReason: '',
    combo: 0, // perfect streak: perfect patties + fast serves
    comboBest: 0,
    paused: false,
    _burned: false, // set for one frame when a patty burns (burn sound cue)
  };

  function newTicket() {
    const recipe = random.pick(RECIPES);
    return { recipe, patience: TICKET_PATIENCE, max: TICKET_PATIENCE };
  }

  function reset() {
    state.score = 0;
    state.served = 0;
    state.servedPerfect = 0;
    state.shiftLeft = SHIFT_SECONDS;
    state.selected = 'bunBottom';
    state.stack = [];
    state.grill = [null, null, null];
    state.tickets = [newTicket(), newTicket(), newTicket()];
    state.message = '';
    state.flash = 0;
    state.flare = [0, 0, 0];
    state.pop = 0;
    state.time = 0;
    state.screen = 'play';
    state.overReason = '';
    state.combo = 0;
    state.comboBest = 0;
    state.paused = false;
    state._burned = false;
  }

  function currentTicket() {
    return state.tickets[0] || null;
  }

  function say(text, seconds = 1.6) {
    state.message = text;
    state.messageUntil = state.time + seconds;
  }

  function raiseCombo() {
    state.combo += 1;
    if (state.combo > state.comboBest) state.comboBest = state.combo;
  }

  function breakCombo() {
    state.combo = 0;
  }

  function isPerfect(patty) {
    return (
      patty.doneness >= COOK.greenLow &&
      patty.doneness <= COOK.greenHigh &&
      patty.flipped
    );
  }

  // Lift a cooked patty off a grill zone onto the stack. A perfect lift
  // (flipped, inside the green window) pays the perfect bonus and raises
  // the combo; any other cooked lift just stacks the patty.
  function liftPatty(zone) {
    const patty = state.grill[zone];
    if (!patty) return null;
    state.grill[zone] = null;
    state.stack.push('patty');
    if (isPerfect(patty)) {
      raiseCombo();
      state.score += PERFECT_PATTY_BONUS;
      say(`PERFECT PATTY! +${PERFECT_PATTY_BONUS}`);
    } else {
      say('Patty on the stack!');
    }
    return 'place';
  }

  // Space / click: do the contextual action for the selected ingredient.
  // Returns an event name for sound + feedback.
  function useSelected() {
    if (state.screen !== 'play') return null;
    const sel = state.selected;

    if (sel === 'patty') {
      // A cooked patty on the grill goes to the stack; otherwise flip the
      // best-cooked patty, or drop a raw patty onto the medium zone.
      const cookedIdx = state.grill.findIndex(
        (p) => p && p.doneness >= COOK.greenLow && p.doneness <= COOK.burnAt,
      );
      if (cookedIdx !== -1) return liftPatty(cookedIdx);
      const cookingIdx = state.grill.findIndex((p) => p && !p.flipped);
      if (cookingIdx !== -1) {
        state.grill[cookingIdx].flipped = true;
        say('FLIPPED! Nice timing!');
        return 'flip';
      }
      const freeIdx = state.grill[1] === null ? 1 : state.grill.findIndex((p) => p === null);
      if (freeIdx === -1) {
        say('Grill is full!');
        return 'error';
      }
      state.grill[freeIdx] = { doneness: 0, flipped: false };
      say(`Patty on the ${GRILL_ZONES[freeIdx].name} zone — watch it!`);
      return 'place';
    }

    // The bun bin is contextual: bottom bun on an empty plate, top bun when
    // the ticket wants it as the next layer (key 1 covers both).
    if (sel === 'bunBottom') {
      const ticket = currentTicket();
      if (
        state.stack.length > 0 &&
        ticket &&
        ticket.recipe.layers[state.stack.length] === 'bunTop'
      ) {
        state.stack.push('bunTop');
        return 'place';
      }
      if (state.stack.length > 0) {
        say('Bottom bun goes first — clear the plate!');
        return 'error';
      }
      state.stack.push(sel);
      return 'place';
    }
    if (sel === 'bunTop' && !state.stack.includes('patty')) {
      say('Top bun needs a patty first!');
      return 'error';
    }
    state.stack.push(sel);
    return 'place';
  }

  // Click a grill zone: place a raw patty there, flip it, or lift it cooked.
  function grillZoneAction(zone) {
    if (state.screen !== 'play') return null;
    const patty = state.grill[zone];
    if (patty) {
      if (patty.doneness >= COOK.greenLow && patty.doneness <= COOK.burnAt) {
        return liftPatty(zone);
      }
      if (!patty.flipped) {
        patty.flipped = true;
        say('FLIPPED! Nice timing!');
        return 'flip';
      }
      say('Still cooking — wait for the green zone!');
      return null;
    }
    state.grill[zone] = { doneness: 0, flipped: false };
    say(`Patty on the ${GRILL_ZONES[zone].name} zone — watch it!`);
    return 'place';
  }

  function clearPlate() {
    state.stack = [];
    say('Plate cleared.');
    return 'select';
  }

  function serve() {
    if (state.screen !== 'play') return null;
    const ticket = currentTicket();
    if (!ticket) return null;
    const want = ticket.recipe.layers;
    const got = state.stack;
    const match =
      got.length === want.length && got.every((layer, i) => layer === want[i]);
    if (!match) {
      state.flash = 1;
      breakCombo();
      if (got.length === 0) say('Nothing on the plate yet!');
      else if (got.length < want.length) say('Not finished — check the ticket!');
      else say('WRONG STACK! Check the ticket!');
      return 'error';
    }
    // Score: recipe price + patience bonus + combo bonus for a hot streak.
    const patienceBonus = Math.round((ticket.patience / ticket.max) * 60);
    const comboBonus = state.combo >= 2 ? state.combo * COMBO_SERVE_BONUS : 0;
    const points = ticket.recipe.price + patienceBonus + comboBonus;
    state.score += points;
    state.served += 1;
    if (ticket.patience / ticket.max > PERFECT_SERVE_FRACTION) {
      state.servedPerfect += 1;
      raiseCombo();
    } else {
      breakCombo();
    }
    state.pop = 1;
    state.stack = [];
    state.tickets.shift();
    state.tickets.push(newTicket());
    say(`SERVED ${ticket.recipe.name}! +${points}`);
    return 'serve';
  }

  function update(dt) {
    state.time += dt;
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 1.8);
    if (state.pop > 0) state.pop = Math.max(0, state.pop - dt * 1.4);
    if (state.screen !== 'play' || state.paused) return;

    state.shiftLeft -= dt;
    if (state.shiftLeft <= 0) {
      state.shiftLeft = 0;
      state.screen = 'over';
      state.overReason = `Shift over — ${state.served} burger${state.served === 1 ? '' : 's'} served!`;
      return;
    }

    // Ticket patience ticks down; an expired ticket is lost and replaced.
    const ticket = currentTicket();
    if (ticket) {
      ticket.patience -= dt;
      if (ticket.patience <= 0) {
        state.flash = 1;
        breakCombo();
        say(`Too slow — ${ticket.recipe.name} walked out!`);
        state.tickets.shift();
        state.tickets.push(newTicket());
      }
    }

    // Grill: each patty cooks at its zone's heat. Past 100 it burns.
    let anyCooking = false;
    for (let z = 0; z < 3; z += 1) {
      const patty = state.grill[z];
      if (!patty) {
        state.flare[z] = Math.max(0, state.flare[z] - dt * 2);
        continue;
      }
      anyCooking = true;
      const rate = COOK.baseRate * GRILL_ZONES[z].heat * (patty.flipped ? 1.25 : 1);
      patty.doneness += rate * dt;
      if (patty.doneness > COOK.greenHigh && patty.doneness <= COOK.burnAt) {
        // Grease flare on the fierce zone when greedy: visual warning.
        state.flare[z] = Math.min(1, state.flare[z] + dt * 2.5);
      } else {
        state.flare[z] = Math.max(0, state.flare[z] - dt * 2);
      }
      if (patty.doneness > COOK.burnAt) {
        state.grill[z] = null;
        state.flash = 1;
        breakCombo();
        state._burned = true;
        say('BURNT! That patty is charcoal!');
      }
    }
    state._cooking = anyCooking;
  }

  return {
    state,
    reset,
    currentTicket,
    useSelected,
    grillZoneAction,
    clearPlate,
    serve,
    update,
    select(id) {
      if (INGREDIENTS.some((ing) => ing.id === id)) state.selected = id;
    },
  };
}
