// Burger Station renderer — one canvas, bright diner palette, everything
// drawn with plain 2D shapes so the game needs no image files at all.
// Layout (1280x720, every edge inside the frame): order board left, grill
// + plate centre on a wooden countertop band, ingredient counter right,
// score top-centre, shift timer top-right, help bar pinned at the bottom.
// The stack sits ON the plate: its bottom layer ends where the plate's top
// rim begins, so the burger never floats.

import { COOK, FIELD, GRILL_ZONES, INGREDIENTS, LAYER_COLORS, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

// Click targets in logical coordinates, shared with main.js hit-testing.
export const HIT = {
  bins: INGREDIENTS.map((ing, i) => ({
    id: ing.id,
    x: 912,
    y: 96 + i * 80,
    w: 340,
    h: 68,
  })),
  grillZones: GRILL_ZONES.map((zone, i) => ({
    zone: i,
    x: 336 + i * 182,
    y: 96,
    w: 168,
    h: 172,
  })),
  serve: { x: 912, y: 500, w: 340, h: 58 },
  clear: { x: 912, y: 570, w: 340, h: 36 },
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

// Plate geometry: the stack's base line is the plate's top rim, so the
// bottom bun touches the plate instead of floating above it.
const PLATE_CX = 600;
const PLATE_CY = 585;
const PLATE_RX = 215;
const PLATE_RY = 30;
const STACK_BASE = PLATE_CY - PLATE_RY; // 555: bottom edge of the bottom layer

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
    // Cream wall with red awning stripes under the top bar, a wooden
    // countertop band across the middle (the plate zone lives on it, so no
    // dead cream gap sits between grill and plate), checkerboard floor.
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (let i = 0; i < 16; i += 1) {
      ctx.fillStyle = i % 2 ? '#fff3dc' : '#ffd9a0';
      ctx.fillRect(i * 80, 64, 80, 8);
    }
    // Countertop band: centre column only, grill and plate sit on it.
    ctx.fillStyle = PALETTE.countertop;
    ctx.fillRect(320, 284, 576, 368);
    ctx.fillStyle = PALETTE.countertopEdge;
    ctx.fillRect(320, 284, 576, 6);
    ctx.fillRect(320, 646, 576, 6);
    for (let px = 416; px < 896; px += 96) {
      ctx.fillStyle = 'rgba(160,106,46,0.35)';
      ctx.fillRect(px, 290, 3, 356);
    }
    const floorY = 660;
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(0, floorY, FIELD.width, FIELD.height - floorY);
    for (let i = 0; i < 16; i += 1) {
      ctx.fillStyle = i % 2 ? PALETTE.floorAlt : PALETTE.floor;
      ctx.fillRect(i * 80, floorY, 80, 30);
      ctx.fillStyle = i % 2 ? PALETTE.floor : PALETTE.floorAlt;
      ctx.fillRect(i * 80, floorY + 30, 80, 30);
    }
  }

  function drawTopBar(state) {
    ctx.fillStyle = PALETTE.red;
    ctx.fillRect(0, 0, FIELD.width, 60);
    ctx.fillStyle = '#fff';
    text(ctx, '🍔 BURGER STATION', 20, 38, 28, '#fff', 900);
    text(ctx, `SCORE  ${state.score}`, 640, 36, 26, '#fff', 900, 'center');
    text(ctx, `SERVED ${state.served}`, 640, 54, 13, '#ffe9a8', 700, 'center');
    if (state.combo >= 2) {
      text(ctx, `🔥 COMBO x${state.combo}`, 880, 38, 20, '#ffd76b', 900, 'center');
    }
    text(ctx, `⏱ SHIFT ${fmtTime(state.shiftLeft)}`, 1260, 38, 22, '#ffe9a8', 800, 'right');
  }

  function drawTicketCard(ticket, x, y, w, h, isCurrent, now) {
    const critical = ticket.patience < 10;
    const blink = critical && Math.floor(now * 2) % 2 === 0;
    ctx.fillStyle = critical ? (blink ? '#ffd0d0' : '#ffe1e1') : PALETTE.panel;
    rr(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.lineWidth = isCurrent ? 4 : 2;
    ctx.strokeStyle = critical ? PALETTE.red : isCurrent ? PALETTE.red : PALETTE.panelEdge;
    ctx.stroke();
    text(ctx, isCurrent ? '▶ NOW SERVING' : 'NEXT UP', x + 14, y + 24, 13, isCurrent ? PALETTE.red : PALETTE.muted, 900);
    // Recipe name auto-fits the card: long names (DOUBLE TROUBLE) shrink
    // instead of colliding with the price at the right edge.
    const priceText = `$${ticket.recipe.price}`;
    ctx.font = '900 20px "Trebuchet MS", "Segoe UI", system-ui, sans-serif';
    const priceW = ctx.measureText(priceText).width;
    let nameSize = 24;
    ctx.font = `900 ${nameSize}px "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;
    while (nameSize > 16 && ctx.measureText(ticket.recipe.name).width > w - 28 - priceW - 10) {
      nameSize -= 1;
      ctx.font = `900 ${nameSize}px "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;
    }
    text(ctx, ticket.recipe.name, x + 14, y + 52, nameSize, PALETTE.ink, 900);
    text(ctx, priceText, x + w - 14, y + 52, 20, PALETTE.score, 900, 'right');
    // Patience bar.
    const frac = Math.max(0, ticket.patience / ticket.max);
    ctx.fillStyle = '#e8dcc8';
    rr(ctx, x + 14, y + 62, w - 28, 12, 6);
    ctx.fill();
    ctx.fillStyle = frac > 0.5 ? PALETTE.green : frac > 0.25 ? '#f0a832' : PALETTE.red;
    if (frac > 0) {
      rr(ctx, x + 14, y + 62, (w - 28) * frac, 12, 6);
      ctx.fill();
    }
    text(ctx, `⏱ ${Math.ceil(ticket.patience)}s`, x + 14, y + 92, 15, critical ? PALETTE.red : PALETTE.muted, 900);
    if (critical) text(ctx, '⚠ HURRY!', x + w - 14, y + 92, 15, PALETTE.red, 900, 'right');
    text(ctx, `${ticket.recipe.layers.length} LAYERS`, x + 14, y + 124, 15, PALETTE.red, 900);
    drawMiniStack(ctx, ticket.recipe.layers, x + 150, y + h - 14, 96);
  }

  function drawOrderBoard(state) {
    text(ctx, 'ORDER BOARD', 24, 88, 20, PALETTE.red, 900);
    const y0 = 96;
    state.tickets.forEach((ticket, i) => {
      drawTicketCard(ticket, 16, y0 + i * 166, 280, 156, i === 0, state.time);
    });
  }

  function drawGrill(state) {
    text(ctx, 'GRILL — 3 HEAT ZONES', 336, 88, 18, PALETTE.ink, 900);
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
      text(ctx, zone.name, hit.x + hit.w / 2, hit.y + 24, 16, '#fff', 900, 'center');
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
        const cy = hit.y + 88;
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
        rr(ctx, bx, hit.y + 126, bw, 12, 6);
        ctx.fill();
        ctx.fillStyle = PALETTE.green;
        ctx.fillRect(bx + (bw * COOK.greenLow) / 100, hit.y + 126, (bw * (COOK.greenHigh - COOK.greenLow)) / 100, 12);
        ctx.fillStyle = burnt ? '#000' : inGreen ? '#7CFC9A' : '#ffb347';
        ctx.fillRect(bx, hit.y + 126, (bw * Math.min(100, done)) / 100, 12);
        const status = burnt ? 'BURNT!' : state.flare[i] > 0.15 ? '🔥 FLARE — GRAB IT!' : inGreen ? 'PERFECT — GRAB IT!' : `${Math.floor(done)}%`;
        text(ctx, status, cx, hit.y + 158, 14, inGreen || state.flare[i] > 0.15 ? '#7CFC9A' : '#fff', 900, 'center');
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
        text(ctx, 'EMPTY', hit.x + hit.w / 2, hit.y + 78, 16, '#8b93a3', 800, 'center');
        text(ctx, 'click to grill', hit.x + hit.w / 2, hit.y + 100, 12, '#6b7280', 700, 'center');
      }
    });
  }

  function drawPlateAndStack(state) {
    text(ctx, 'PLATE — BUILD THE BURGER', 336, 310, 18, PALETTE.ink, 900);
    // Plate: wide ellipse whose top rim is the stack's base line.
    ctx.fillStyle = '#f4f6f8';
    ctx.beginPath();
    ctx.ellipse(PLATE_CX, PLATE_CY, PLATE_RX, PLATE_RY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cfd6dd';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#e8edf0';
    ctx.beginPath();
    ctx.ellipse(PLATE_CX, PLATE_CY - 2, 165, 21, 0, 0, Math.PI * 2);
    ctx.fill();

    const stack = state.stack;
    const layerH = { bunBottom: 26, bunTop: 30, patty: 30, cheese: 18, lettuce: 16, tomato: 20 };
    const w = 300;
    const x = PLATE_CX - w / 2;
    let y = STACK_BASE; // bottom edge of the bottom layer touches the plate
    if (stack.length === 0) {
      text(ctx, 'Empty plate — press 1 for a bottom bun!', PLATE_CX, 520, 18, '#5d4a33', 700, 'center');
    } else {
      // Draw bottom-up; pop animation scales the newest layer.
      for (let i = 0; i < stack.length; i += 1) {
        const layer = stack[i];
        const h = layerH[layer] || 20;
        y -= h + 2;
        const isTop = i === stack.length - 1;
        const scale = isTop && state.pop > 0 ? 1 + 0.12 * state.pop : 1;
        ctx.save();
        ctx.translate(PLATE_CX, y + h / 2);
        ctx.scale(scale, scale);
        ctx.translate(-PLATE_CX, -(y + h / 2));
        drawLayer(ctx, layer, x, y, w, h);
        ctx.restore();
      }
      // Height badge: the tall-stack drama.
      text(ctx, `${stack.length} LAYERS`, PLATE_CX, y - 14, 18, PALETTE.red, 900, 'center');
    }

    // Ticket match hint under the plate, on the countertop band, clear of
    // the plate above and the floor below.
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
      rr(ctx, PLATE_CX - hintW / 2 - 14, 626, hintW + 28, 24, 12);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = PALETTE.panelEdge;
      ctx.stroke();
      text(ctx, hint, PLATE_CX, 642, 15, PALETTE.ink, 800, 'center');
    }
    if (state.message && state.time < state.messageUntil) {
      ctx.font = '900 17px "Trebuchet MS", "Segoe UI", system-ui, sans-serif';
      const mw = ctx.measureText(state.message).width + 36;
      ctx.fillStyle = 'rgba(43,33,24,0.92)';
      rr(ctx, PLATE_CX - mw / 2, 326, mw, 34, 17);
      ctx.fill();
      text(ctx, state.message, PLATE_CX, 349, 17, '#ffe9a8', 900, 'center');
    }
  }

  function drawCounter(state) {
    text(ctx, 'COUNTER', 912, 88, 18, PALETTE.ink, 900);
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
      rr(ctx, hit.x + 12, hit.y + 12, 44, 44, 10);
      ctx.fill();
      if (ing.id === 'patty') {
        ctx.fillStyle = '#5e2f18';
        ctx.beginPath();
        ctx.ellipse(hit.x + 34, hit.y + 34, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      text(ctx, `${ing.key}  ${ing.name}`, hit.x + 68, hit.y + 30, 19, PALETTE.ink, 900);
      text(ctx, selected ? '◉ SELECTED — SPACE to use' : 'click or press ' + ing.key, hit.x + 68, hit.y + 54, 13, selected ? PALETTE.red : PALETTE.muted, 700);
    });
    // Serve button.
    const s = HIT.serve;
    ctx.fillStyle = state.stack.length > 0 ? PALETTE.green : '#9db89f';
    rr(ctx, s.x, s.y, s.w, s.h, 14);
    ctx.fill();
    text(ctx, '🍽  SERVE  (Enter)', s.x + s.w / 2, s.y + 38, 26, '#fff', 900, 'center');
    const c = HIT.clear;
    ctx.fillStyle = '#efe6d4';
    rr(ctx, c.x, c.y, c.w, c.h, 10);
    ctx.fill();
    text(ctx, 'Clear plate  (C)', c.x + c.w / 2, c.y + 24, 16, PALETTE.ink, 800, 'center');
  }

  function drawHintBar() {
    ctx.fillStyle = 'rgba(43,33,24,0.85)';
    ctx.fillRect(0, 684, FIELD.width, 36);
    text(ctx, '1–5 pick ingredient   •   SPACE grill / flip / place   •   ENTER serve   •   C clear plate   •   P pause', 640, 707, 16, '#ffe9a8', 700, 'center');
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
    text(ctx, '3 burgers • 3 grill heat zones • perfect-flip + flare-grab combo', 90, 366, 18, PALETTE.ink, 700);
    text(ctx, 'Watch the green zone — a burnt patty is charcoal.', 90, 394, 18, PALETTE.ink, 700);
    text(ctx, '▶  Press ENTER or click to start cooking', 90, 460, 22, PALETTE.red, 900);
    text(ctx, `BEST SCORE  ${Math.max(best, state.best)}`, 90, 500, 18, PALETTE.score, 900);
  }

  // Shift-over: the kitchen stays visible behind a dim veil, the results
  // panel sits over the centre, and the final burger stays on the plate
  // below the panel — a score card that is still the game, not a bare card.
  function drawOver(state, best) {
    drawBackground();
    drawTopBar(state);
    drawOrderBoard(state);
    drawGrill(state);
    drawPlateAndStack(state);
    drawCounter(state);
    drawHintBar();
    ctx.fillStyle = 'rgba(43,33,24,0.28)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = 'rgba(255,253,246,0.98)';
    rr(ctx, 330, 88, 620, 296, 20);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = PALETTE.red;
    ctx.stroke();
    text(ctx, 'SHIFT COMPLETE!', 640, 148, 44, PALETTE.red, 900, 'center');
    text(ctx, state.overReason || 'Great cooking!', 640, 186, 18, PALETTE.ink, 700, 'center');
    text(ctx, `FINAL SCORE  ${state.score}`, 640, 240, 34, PALETTE.score, 900, 'center');
    text(ctx, `Burgers served: ${state.served}   •   Perfect serves: ${state.servedPerfect}   •   Best combo: x${Math.max(state.comboBest, state.combo)}`, 640, 276, 18, PALETTE.ink, 800, 'center');
    const bestScore = Math.max(best, state.score);
    text(ctx, `BEST  ${bestScore}`, 640, 308, 20, PALETTE.red, 900, 'center');
    const stars = state.served >= 8 ? '★★★' : state.served >= 5 ? '★★☆' : state.served >= 2 ? '★☆☆' : '☆☆☆';
    text(ctx, stars, 640, 346, 36, '#f0a832', 900, 'center');
    text(ctx, 'Press ENTER to cook another shift', 640, 374, 15, PALETTE.red, 900, 'center');
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
    if (state.paused) {
      ctx.fillStyle = 'rgba(43,33,24,0.92)';
      const label = '⏸ PAUSED — press P to resume';
      ctx.font = '900 20px "Trebuchet MS", "Segoe UI", system-ui, sans-serif';
      const pw = ctx.measureText(label).width + 40;
      rr(ctx, 640 - pw / 2, 380, pw, 44, 22);
      ctx.fill();
      text(ctx, label, 640, 409, 20, '#ffe9a8', 900, 'center');
    }
  }

  return { draw };
}
