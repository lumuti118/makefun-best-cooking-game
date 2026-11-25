// Burger Station renderer — one canvas, bright diner palette, everything
// drawn with plain 2D shapes so the game needs no image files at all.
// Layout (1280x720): order board left, grill + plate centre, ingredient
// counter right, score top-centre, shift timer top-right.

import { COOK, FIELD, GRILL_ZONES, INGREDIENTS, LAYER_COLORS, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

// Click targets in logical coordinates, shared with main.js hit-testing.
export const HIT = {
  bins: INGREDIENTS.map((ing, i) => ({
    id: ing.id,
    x: 912,
    y: 132 + i * 84,
    w: 340,
    h: 72,
  })),
  grillZones: GRILL_ZONES.map((zone, i) => ({
    zone: i,
    x: 336 + i * 182,
    y: 108,
    w: 168,
    h: 170,
  })),
  serve: { x: 912, y: 560, w: 340, h: 64 },
  clear: { x: 912, y: 632, w: 340, h: 40 },
  plate: { x: 380, y: 330, w: 440, h: 300 },
};

const LAYER_LABEL = {
  bunBottom: 'BOTTOM BUN',
  bunTop: 'TOP BUN',
  patty: 'PATTY',
  cheese: 'CHEESE',
  lettuce: 'LETTUCE',
  tomato: 'TOMATO',
};

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, weight = 800, align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function fmtTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// One burger layer, drawn as a wide rounded slab. `w` is the plate width;
// layers are drawn bottom-up so the stack reads as a tall tower.
function drawLayer(ctx, layer, x, y, w, h) {
  const cx = x + w / 2;
  if (layer === 'bunTop') {
    ctx.fillStyle = LAYER_COLORS.bunTop;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + h);
    ctx.quadraticCurveTo(cx, y - h * 1.5, x + w - 8, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff3d6';
    for (const [sx, sy] of [[-0.25, -0.4], [0, -0.7], [0.25, -0.4], [-0.1, -0.15], [0.14, -0.15]]) {
      ctx.beginPath();
      ctx.ellipse(cx + sx * w, y + h + sy * h, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (layer === 'bunBottom') {
    ctx.fillStyle = LAYER_COLORS.bunBottom;
    rr(ctx, x, y, w, h, 10);
    ctx.fill();
    return;
  }
  if (layer === 'cheese') {
    ctx.fillStyle = LAYER_COLORS.cheese;
    rr(ctx, x - 6, y, w + 12, h, 6);
    ctx.fill();
    // Melty drips.
    ctx.beginPath();
    for (const dx of [-0.32, -0.05, 0.22]) {
      ctx.moveTo(cx + dx * w - 12, y + h - 2);
      ctx.quadraticCurveTo(cx + dx * w, y + h + 16, cx + dx * w + 12, y + h - 2);
    }
    ctx.fill();
    return;
  }
  if (layer === 'lettuce') {
    ctx.fillStyle = LAYER_COLORS.lettuce;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    for (let i = 0; i <= 8; i += 1) {
      ctx.quadraticCurveTo(x + ((i + 0.5) / 8) * w, y - 8, x + ((i + 1) / 8) * w, y + h);
    }
    ctx.lineTo(x + w, y + h + 4);
    ctx.lineTo(x, y + h + 4);
    ctx.closePath();
    ctx.fill();
    return;
  }
  if (layer === 'tomato') {
    ctx.fillStyle = LAYER_COLORS.tomato;
    rr(ctx, x + 6, y, w - 12, h, 8);
    ctx.fill();
    ctx.fillStyle = '#ff7a6b';
    ctx.beginPath();
    ctx.ellipse(cx, y + h / 2, w * 0.28, h * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // patty
  ctx.fillStyle = LAYER_COLORS.patty;
  rr(ctx, x - 4, y, w + 8, h + 4, 12);
  ctx.fill();
  ctx.fillStyle = '#5e2f18';
  for (const dx of [-0.3, 0, 0.3]) {
    ctx.beginPath();
    ctx.ellipse(cx + dx * w, y + h / 2 + 2, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Mini stack for a ticket card: tiny layer slabs, bottom first.
function drawMiniStack(ctx, layers, x, y, w) {
  let cy = y;
  const heights = { bunBottom: 8, bunTop: 12, patty: 9, cheese: 6, lettuce: 6, tomato: 7 };
  for (const layer of layers) {
    const h = heights[layer] || 8;
    cy -= h + 1;
    if (layer === 'bunTop') {
      ctx.fillStyle = LAYER_COLORS.bunTop;
      ctx.beginPath();
      ctx.moveTo(x, cy + h);
      ctx.quadraticCurveTo(x + w / 2, cy - 8, x + w, cy + h);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = LAYER_COLORS[layer] || '#999';
      rr(ctx, x, cy, w, h, 3);
      ctx.fill();
    }
  }
  return cy;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;

  function drawBackground() {
    // Cream wall with red awning stripes up top, checkerboard floor below.
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (let i = 0; i < 16; i += 1) {
      ctx.fillStyle = i % 2 ? '#fff3dc' : '#ffd9a0';
      ctx.fillRect(i * 80, 64, 80, 14);
    }
    const floorY = 648;
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(0, floorY, FIELD.width, FIELD.height - floorY);
    for (let i = 0; i < 16; i += 1) {
      ctx.fillStyle = i % 2 ? PALETTE.floorAlt : PALETTE.floor;
      ctx.fillRect(i * 80, floorY, 80, 36);
      ctx.fillStyle = i % 2 ? PALETTE.floor : PALETTE.floorAlt;
      ctx.fillRect(i * 80, floorY + 36, 80, 36);
    }
  }

  function drawTopBar(state) {
    ctx.fillStyle = PALETTE.red;
    ctx.fillRect(0, 0, FIELD.width, 64);
    ctx.fillStyle = '#fff';
    text(ctx, '🍔 BURGER STATION', 20, 42, 30, '#fff', 900);
    text(ctx, `SCORE  ${state.score}`, 640, 42, 28, '#fff', 900, 'center');
    text(ctx, `⏱ SHIFT ${fmtTime(state.shiftLeft)}`, 1260, 42, 24, '#ffe9a8', 800, 'right');
    text(ctx, `SERVED ${state.served}`, 640, 60, 14, '#ffe9a8', 700, 'center');
  }

  function drawTicketCard(ticket, x, y, w, h, isCurrent, now) {
    const blink = isCurrent && ticket.patience < 10 && Math.floor(now * 2) % 2 === 0;
    ctx.fillStyle = blink ? '#ffe1e1' : PALETTE.panel;
    rr(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.lineWidth = isCurrent ? 4 : 2;
    ctx.strokeStyle = isCurrent ? PALETTE.red : PALETTE.panelEdge;
    ctx.stroke();
    text(ctx, isCurrent ? '▶ NOW SERVING' : 'NEXT UP', x + 14, y + 26, 13, isCurrent ? PALETTE.red : PALETTE.muted, 900);
    text(ctx, ticket.recipe.name, x + 14, y + 54, 22, PALETTE.ink, 900);
    text(ctx, `$${ticket.recipe.price}`, x + w - 14, y + 54, 20, PALETTE.score, 900, 'right');
    // Patience bar.
    const frac = Math.max(0, ticket.patience / ticket.max);
    ctx.fillStyle = '#e8dcc8';
    rr(ctx, x + 14, y + 66, w - 28, 10, 5);
    ctx.fill();
    ctx.fillStyle = frac > 0.5 ? PALETTE.green : frac > 0.25 ? '#f0a832' : PALETTE.red;
    if (frac > 0) {
      rr(ctx, x + 14, y + 66, (w - 28) * frac, 10, 5);
      ctx.fill();
    }
    text(ctx, `⏱ ${Math.ceil(ticket.patience)}s`, x + 14, y + 94, 13, PALETTE.muted, 700);
    text(ctx, `${ticket.recipe.layers.length} LAYERS`, x + 14, y + 128, 14, PALETTE.red, 900);
    drawMiniStack(ctx, ticket.recipe.layers, x + 150, y + h - 16, 96);
  }

  function drawOrderBoard(state) {
    text(ctx, 'ORDER BOARD', 24, 96, 20, PALETTE.red, 900);
    const y0 = 106;
    state.tickets.forEach((ticket, i) => {
      drawTicketCard(ticket, 16, y0 + i * 178, 280, 168, i === 0, state.time);
    });
  }

  function drawGrill(state) {
    text(ctx, 'GRILL — 3 HEAT ZONES', 336, 96, 18, PALETTE.ink, 900);
    GRILL_ZONES.forEach((zone, i) => {
      const hit = HIT.grillZones[i];
      const patty = state.grill[i];
      ctx.fillStyle = PALETTE.grillEdge;
      rr(ctx, hit.x - 4, hit.y - 4, hit.w + 8, hit.h + 8, 12);
      ctx.fill();
      ctx.fillStyle = PALETTE.grill;
      rr(ctx, hit.x, hit.y, hit.w, hit.h, 10);
      ctx.fill();
      // Zone name at the top, clear of the flames and the doneness bar.
      text(ctx, zone.name, hit.x + hit.w / 2, hit.y + 24, 15, '#fff', 900, 'center');
      // Thin flame scallop along the very bottom of the box.
      ctx.fillStyle = zone.color;
      ctx.beginPath();
      for (let fx = 0; fx < hit.w; fx += 24) {
        ctx.moveTo(hit.x + fx, hit.y + hit.h - 6);
        ctx.quadraticCurveTo(hit.x + fx + 12, hit.y + hit.h - 20, hit.x + fx + 24, hit.y + hit.h - 6);
      }
      ctx.fill();
      if (patty) {
        const done = Math.min(120, patty.doneness);
        const inGreen = done >= COOK.greenLow && done <= COOK.greenHigh;
        const burnt = done > COOK.burnAt;
        // Patty disc, browning with doneness.
        const cx = hit.x + hit.w / 2;
        const cy = hit.y + 86;
        ctx.fillStyle = burnt ? '#1f1410' : done > 30 ? '#7c3f22' : '#c46a5a';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 62, 30, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = burnt ? '#000' : '#5e2f18';
        for (const dx of [-28, 0, 28]) {
          ctx.beginPath();
          ctx.ellipse(cx + dx, cy, 12, 5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // "✓ FLIPPED" rides on the patty disc itself, well below the grease
        // flare's tongue (which rises above the patty), so the two can
        // never paint over each other.
        if (patty.flipped) text(ctx, '✓ FLIPPED', cx, cy + 5, 13, '#7CFC9A', 900, 'center');
        // Doneness bar with green window.
        const bx = hit.x + 14;
        const bw = hit.w - 28;
        ctx.fillStyle = '#14161a';
        rr(ctx, bx, hit.y + 122, bw, 12, 6);
        ctx.fill();
        ctx.fillStyle = PALETTE.green;
        ctx.fillRect(bx + (bw * COOK.greenLow) / 100, hit.y + 122, (bw * (COOK.greenHigh - COOK.greenLow)) / 100, 12);
        ctx.fillStyle = burnt ? '#000' : inGreen ? '#7CFC9A' : '#ffb347';
        ctx.fillRect(bx, hit.y + 122, (bw * Math.min(100, done)) / 100, 12);
        const status = burnt ? 'BURNT!' : state.flare[i] > 0.15 ? '🔥 FLARE — GRAB IT!' : inGreen ? 'PERFECT — GRAB IT!' : `${Math.floor(done)}%`;
        text(ctx, status, cx, hit.y + 152, 13, inGreen || state.flare[i] > 0.15 ? '#7CFC9A' : '#fff', 900, 'center');
        // Grease flare: a rising flame tongue above the patty.
        if (state.flare[i] > 0.15) {
          ctx.fillStyle = `rgba(255, ${140 + Math.floor(80 * state.flare[i])}, 30, ${0.55 * state.flare[i]})`;
          ctx.beginPath();
          ctx.moveTo(cx - 30, cy - 28);
          ctx.quadraticCurveTo(cx, cy - 58 - 22 * state.flare[i], cx + 30, cy - 28);
          ctx.closePath();
          ctx.fill();
        }
        if (burnt) {
          ctx.fillStyle = 'rgba(60,60,60,0.7)';
          ctx.beginPath();
          ctx.ellipse(cx, cy - 46, 22, 12, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        text(ctx, 'EMPTY', hit.x + hit.w / 2, hit.y + 76, 16, '#8b93a3', 800, 'center');
        text(ctx, 'click to grill', hit.x + hit.w / 2, hit.y + 98, 12, '#6b7280', 700, 'center');
      }
    });
  }

  function drawPlateAndStack(state) {
    text(ctx, 'PLATE — BUILD THE BURGER', 336, 300, 18, PALETTE.ink, 900);
    const plate = HIT.plate;
    // Plate.
    ctx.fillStyle = '#f4f6f8';
    ctx.beginPath();
    ctx.ellipse(600, 600, 210, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cfd6dd';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#e8edf0';
    ctx.beginPath();
    ctx.ellipse(600, 598, 160, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    const stack = state.stack;
    const layerH = { bunBottom: 26, bunTop: 30, patty: 30, cheese: 18, lettuce: 16, tomato: 20 };
    const w = 300;
    const x = 600 - w / 2;
    let y = 600 - 26; // top of plate
    if (stack.length === 0) {
      text(ctx, 'Empty plate — press 1 for a bottom bun!', 600, 560, 18, PALETTE.muted, 700, 'center');
    } else {
      // Draw bottom-up; pop animation scales the newest layer.
      for (let i = 0; i < stack.length; i += 1) {
        const layer = stack[i];
        const h = layerH[layer] || 20;
        y -= h + 2;
        const isTop = i === stack.length - 1;
        const scale = isTop && state.pop > 0 ? 1 + 0.12 * state.pop : 1;
        ctx.save();
        ctx.translate(600, y + h / 2);
        ctx.scale(scale, scale);
        ctx.translate(-600, -(y + h / 2));
        drawLayer(ctx, layer, x, y, w, h);
        ctx.restore();
      }
      // Height badge: the tall-stack drama.
      text(ctx, `${stack.length} LAYERS`, 600, y - 18, 18, PALETTE.red, 900, 'center');
    }

    // Ticket match hint under the plate: a padded pill sitting on the floor
    // band, clear of the plate above, the floor edge, and the hint bar
    // below, so the text never crowds the checkerboard edge.
    const ticket = state.tickets[0];
    if (ticket) {
      const want = ticket.recipe.layers;
      const doneCount = stack.filter((l, i) => l === want[i]).length;
      const hint = stack.length === 0
        ? `Ticket: ${ticket.recipe.name} — ${want.length} layers`
        : `Matching ${doneCount}/${want.length} — next: ${LAYER_LABEL[want[stack.length]] || 'SERVE!'}`;
      ctx.font = '800 15px "Trebuchet MS", "Segoe UI", system-ui, sans-serif';
      const hintW = ctx.measureText(hint).width;
      ctx.fillStyle = PALETTE.panel;
      rr(ctx, 600 - hintW / 2 - 14, 650, hintW + 28, 24, 12);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = PALETTE.panelEdge;
      ctx.stroke();
      text(ctx, hint, 600, 666, 15, PALETTE.ink, 800, 'center');
    }
    if (state.message && state.time < state.messageUntil) {
      ctx.fillStyle = 'rgba(43,33,24,0.92)';
      const mw = ctx.measureText(state.message).width + 36;
      rr(ctx, 600 - mw / 2, 316, mw, 34, 17);
      ctx.fill();
      text(ctx, state.message, 600, 339, 17, '#ffe9a8', 900, 'center');
    }
  }

  function drawCounter(state) {
    text(ctx, 'COUNTER', 912, 96, 18, PALETTE.ink, 900);
    HIT.bins.forEach((hit, i) => {
      const ing = INGREDIENTS[i];
      const selected = state.selected === ing.id;
      ctx.fillStyle = selected ? '#fff3c4' : PALETTE.panel;
      rr(ctx, hit.x, hit.y, hit.w, hit.h, 12);
      ctx.fill();
      ctx.lineWidth = selected ? 4 : 2;
      ctx.strokeStyle = selected ? PALETTE.red : PALETTE.panelEdge;
      ctx.stroke();
      // Swatch.
      ctx.fillStyle = ing.color;
      rr(ctx, hit.x + 12, hit.y + 14, 44, 44, 10);
      ctx.fill();
      if (ing.id === 'patty') {
        ctx.fillStyle = '#5e2f18';
        ctx.beginPath();
        ctx.ellipse(hit.x + 34, hit.y + 36, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      text(ctx, `${ing.key}  ${ing.name}`, hit.x + 68, hit.y + 32, 19, PALETTE.ink, 900);
      text(ctx, selected ? '◉ SELECTED — SPACE to use' : 'click or press ' + ing.key, hit.x + 68, hit.y + 56, 13, selected ? PALETTE.red : PALETTE.muted, 700);
    });
    // Serve button.
    const s = HIT.serve;
    ctx.fillStyle = state.stack.length > 0 ? PALETTE.green : '#9db89f';
    rr(ctx, s.x, s.y, s.w, s.h, 14);
    ctx.fill();
    text(ctx, '🍽  SERVE  (Enter)', s.x + s.w / 2, s.y + 42, 26, '#fff', 900, 'center');
    const c = HIT.clear;
    ctx.fillStyle = '#efe6d4';
    rr(ctx, c.x, c.y, c.w, c.h, 10);
    ctx.fill();
    text(ctx, 'Clear plate  (C)', c.x + c.w / 2, c.y + 27, 16, PALETTE.ink, 800, 'center');
  }

  function drawHintBar() {
    ctx.fillStyle = 'rgba(43,33,24,0.85)';
    ctx.fillRect(0, 676, FIELD.width, 44);
    text(ctx, '1–5 pick ingredient   •   SPACE grill / flip / place   •   ENTER serve   •   C clear plate   •   P pause', 640, 704, 16, '#ffe9a8', 700, 'center');
  }

  function drawTitle(state, best) {
    drawBackground();
    // Big hero burger behind the title panel.
    const layers = ['bunBottom', 'patty', 'cheese', 'lettuce', 'tomato', 'patty', 'bunTop'];
    let y = 560;
    const w = 340;
    const x = 880 - w / 2;
    const heights = { bunBottom: 30, bunTop: 40, patty: 34, cheese: 20, lettuce: 18, tomato: 22 };
    for (const layer of layers) {
      const h = heights[layer];
      y -= h + 3;
      drawLayer(ctx, layer, x, y, w, h);
    }
    ctx.fillStyle = '#f4f6f8';
    ctx.beginPath();
    ctx.ellipse(880, 566, 220, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    // Title panel.
    ctx.fillStyle = 'rgba(255,253,246,0.97)';
    rr(ctx, 60, 120, 640, 420, 20);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = PALETTE.red;
    ctx.stroke();
    text(ctx, '🍔', 90, 210, 64, '#000');
    text(ctx, 'BURGER', 170, 205, 72, PALETTE.red, 900);
    text(ctx, 'STATION', 170, 275, 72, PALETTE.ink, 900);
    text(ctx, 'Grill it. Stack it. Serve it fast!', 90, 330, 24, PALETTE.muted, 800);
    text(ctx, '3 burgers • 3 grill heat zones • 1 perfect flip', 90, 366, 18, PALETTE.ink, 700);
    text(ctx, 'Watch the green zone — a burnt patty is charcoal.', 90, 394, 18, PALETTE.ink, 700);
    text(ctx, '▶  Press ENTER or click to start cooking', 90, 460, 22, PALETTE.red, 900);
    text(ctx, `BEST SCORE  ${Math.max(best, state.best)}`, 90, 500, 18, PALETTE.score, 900);
  }

  function drawOver(state, best) {
    drawBackground();
    drawTopBar(state);
    ctx.fillStyle = 'rgba(255,253,246,0.97)';
    rr(ctx, 290, 130, 700, 420, 20);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = PALETTE.red;
    ctx.stroke();
    text(ctx, 'SHIFT COMPLETE!', 640, 220, 52, PALETTE.red, 900, 'center');
    text(ctx, state.overReason || 'Great cooking!', 640, 268, 22, PALETTE.ink, 700, 'center');
    text(ctx, `FINAL SCORE  ${state.score}`, 640, 340, 40, PALETTE.score, 900, 'center');
    text(ctx, `Burgers served: ${state.served}   •   Perfect serves: ${state.servedPerfect}`, 640, 388, 20, PALETTE.ink, 800, 'center');
    const bestScore = Math.max(best, state.score);
    text(ctx, `BEST  ${bestScore}`, 640, 428, 22, PALETTE.red, 900, 'center');
    const stars = state.served >= 8 ? '★★★' : state.served >= 5 ? '★★☆' : state.served >= 2 ? '★☆☆' : '☆☆☆';
    text(ctx, stars, 640, 486, 44, '#f0a832', 900, 'center');
    text(ctx, 'Press ENTER to cook another shift', 640, 530, 20, PALETTE.red, 900, 'center');
  }

  function draw(state, screen, best) {
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    if (screen === SCREEN_TITLE) {
      drawTitle(state, best);
      return;
    }
    if (screen === SCREEN_OVER) {
      drawOver(state, best);
      return;
    }
    drawBackground();
    drawTopBar(state);
    drawOrderBoard(state);
    drawGrill(state);
    drawPlateAndStack(state);
    drawCounter(state);
    drawHintBar();
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(217,43,43,${0.28 * state.flash})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
  }

  return { draw };
}
