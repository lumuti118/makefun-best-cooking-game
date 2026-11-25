// Burger Station boot + main loop: input every frame, world in fixed 1/60 s
// steps, renderer paints what is there. Screens: title, play, over.
// ?seed=N fixes the ticket order. ?shot=start|play|rush|combo|end stages
// that scene, paints it twice and sets window.__shotReady for a screenshot.
// play is the hero cover, rush the ticket-rush beat, combo the flare-grab
// beat, end the shift-complete panel over the kitchen.
//
// Test hooks: window.__burger exposes the live state (score, stack, ticket,
// grill, screen) so an automated play test can drive and assert the game.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { ACTION_CLEAR, ACTION_PAUSE, ACTION_SERVE, ACTION_START, ACTION_USE, createInput } from './input.js';
import { createRenderer, HIT, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import { sfx } from './audio.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): best then lasts this visit only.
  }
}

function announce(message) {
  status.textContent = message;
}

function pointIn(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

// Expose live state for automated testing (harmless in normal play).
window.__burger = {
  state: world.state,
  ticket() {
    const t = world.currentTicket();
    return t ? { name: t.recipe.name, layers: t.recipe.layers, patience: t.patience } : null;
  },
  serve: () => world.serve(),
  use: () => world.useSelected(),
  select: (id) => world.select(id),
};

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function startGame() {
    sfx.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Build the burger on the ticket, then serve it!');
  }

  function endGame() {
    screen = SCREEN_OVER;
    sfx.stopSizzle();
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Shift over. Score ${world.state.score}. Best ${best}.`);
  }

  function playEvent(event) {
    if (!event) return;
    if (event === 'serve') sfx.serve();
    else if (event === 'flip') sfx.flip();
    else if (event === 'place') sfx.place();
    else if (event === 'error') sfx.error();
    else if (event === 'select') sfx.select();
    else if (event === 'burn') sfx.burn();
  }

  function handleClick(click) {
    if (!click) return;
    sfx.unlock();
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      startGame();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    for (const bin of HIT.bins) {
      if (pointIn(bin, click.x, click.y)) {
        world.select(bin.id);
        sfx.select();
        return;
      }
    }
    for (const zone of HIT.grillZones) {
      if (pointIn(zone, click.x, click.y)) {
        playEvent(world.grillZoneAction(zone.zone));
        return;
      }
    }
    if (pointIn(HIT.serve, click.x, click.y)) {
      playEvent(world.serve());
      return;
    }
    if (pointIn(HIT.clear, click.x, click.y)) {
      playEvent(world.clearPlate());
      return;
    }
    if (pointIn(HIT.plate, click.x, click.y)) {
      playEvent(world.useSelected());
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;

    const selection = input.takeSelection();
    if (selection) {
      world.select(selection);
      sfx.select();
    }
    handleClick(input.takeClick());

    const actions = input.takeActions();
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      world.state.paused = !world.state.paused;
      announce(world.state.paused ? 'Paused. Press P to resume.' : 'Playing.');
    }
    if (actions & ACTION_START && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_USE) {
        sfx.unlock();
        playEvent(world.useSelected());
      }
      if (actions & ACTION_SERVE) playEvent(world.serve());
      if (actions & ACTION_CLEAR) playEvent(world.clearPlate());
    }

    if (screen === SCREEN_PLAY) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        world.update(STEP);
        accumulator -= STEP;
      }
      if (world.state._burned) {
        world.state._burned = false;
        sfx.burn();
      }
      if (world.state._cooking && !world.state.paused) sfx.startSizzle();
      else sfx.stopSizzle();
      if (world.state.screen === 'over') endGame();
    }

    renderer.draw(world.state, screen, best);
  }

  requestAnimationFrame(frame);
}

if (shot === 'start' || shot === 'play' || shot === 'rush' || shot === 'combo' || shot === 'end') runShot(shot);
else runGame();
