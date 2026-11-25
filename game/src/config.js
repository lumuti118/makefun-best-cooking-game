// Burger Station — every tuning number, recipe and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

export const STEP = 1 / 60;

// A shift lasts 3 minutes; each ticket has its own patience clock.
export const SHIFT_SECONDS = 180;
export const TICKET_PATIENCE = 45;

export const RECIPES = [
  {
    id: 'classic',
    name: 'CLASSIC',
    price: 120,
    layers: ['bunBottom', 'patty', 'lettuce', 'tomato', 'bunTop'],
    label: 'Classic',
  },
  {
    id: 'deluxe',
    name: 'CHEESE DELUXE',
    price: 160,
    layers: ['bunBottom', 'patty', 'cheese', 'lettuce', 'bunTop'],
    label: 'Cheese Deluxe',
  },
  {
    id: 'double',
    name: 'DOUBLE TROUBLE',
    price: 220,
    layers: ['bunBottom', 'patty', 'cheese', 'patty', 'tomato', 'bunTop'],
    label: 'Double Trouble',
  },
];

// Ingredient bins along the right counter, in selection order (keys 1-5).
export const INGREDIENTS = [
  { id: 'bunBottom', key: '1', name: 'BUN (BOTTOM / TOP)', short: 'BUN', color: '#e8a94e' },
  { id: 'patty', key: '2', name: 'PATTY (GRILL)', short: 'PATTY', color: '#8a4b2d' },
  { id: 'cheese', key: '3', name: 'CHEESE', short: 'CHEESE', color: '#ffc93c' },
  { id: 'lettuce', key: '4', name: 'LETTUCE', short: 'LETTUCE', color: '#58b368' },
  { id: 'tomato', key: '5', name: 'TOMATO', short: 'TOMATO', color: '#e23b2e' },
];

export const LAYER_COLORS = {
  bunBottom: '#e8a94e',
  bunTop: '#f0b95c',
  patty: '#7c3f22',
  pattyRaw: '#c46a5a',
  cheese: '#ffc93c',
  lettuce: '#58b368',
  tomato: '#e23b2e',
};

// The grill has three heat zones, left to right: gentle, medium, fierce.
// Fierce cooks ~2.5x faster but flares grease and burns quickly.
export const GRILL_ZONES = [
  { id: 0, name: 'LOW', heat: 0.55, color: '#ffb347' },
  { id: 1, name: 'MED', heat: 1.0, color: '#ff7b2f' },
  { id: 2, name: 'HIGH', heat: 2.4, color: '#e23b2e' },
];

// Doneness 0-100. Green window = perfectly cooked; past 100 = burnt.
export const COOK = { greenLow: 55, greenHigh: 90, burnAt: 100, baseRate: 9 };

export const PALETTE = {
  wall: '#fff3dc',
  wallStripe: '#ffe3b3',
  floor: '#d92b2b',
  floorAlt: '#fff6e8',
  counter: '#8a5a2b',
  counterTop: '#c98d4b',
  grill: '#3a3f47',
  grillEdge: '#22252b',
  panel: '#fffdf6',
  panelEdge: '#e8d9b8',
  ink: '#2b2118',
  muted: '#7a6a55',
  red: '#d92b2b',
  gold: '#ffc93c',
  green: '#58b368',
  score: '#1d7a3a',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
export const BEST_KEY = 'burger-station.best';
