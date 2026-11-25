// Keyboard + pointer input. One-shot presses are queued as flags and taken
// once by the loop, so a press between two frames is never lost or double
// counted. Clicks are reported as logical 1280x720 coordinates so the main
// loop can hit-test bins, grill zones, the plate and the serve button.

export const ACTION_USE = 1;
export const ACTION_SERVE = 2;
export const ACTION_CLEAR = 4;
export const ACTION_START = 8;
export const ACTION_PAUSE = 16;

const SELECT_KEYS = {
  Digit1: 'bunBottom',
  Digit2: 'patty',
  Digit3: 'cheese',
  Digit4: 'lettuce',
  Digit5: 'tomato',
};

export function createInput(canvas) {
  let actions = 0;
  let selectedId = null;
  let click = null;
  let clickTaken = false;

  window.addEventListener('keydown', (event) => {
    if (SELECT_KEYS[event.code]) {
      selectedId = SELECT_KEYS[event.code];
      event.preventDefault();
      return;
    }
    if (event.code === 'Space') {
      if (!event.repeat) actions |= ACTION_USE;
      event.preventDefault();
    } else if (event.code === 'Enter') {
      if (!event.repeat) actions |= ACTION_SERVE | ACTION_START;
      event.preventDefault();
    } else if (event.code === 'KeyC') {
      if (!event.repeat) actions |= ACTION_CLEAR;
    } else if (event.code === 'KeyP') {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyR') {
      if (!event.repeat) actions |= ACTION_START;
    }
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 1280;
    const y = ((event.clientY - rect.top) / rect.height) * 720;
    click = { x, y };
    clickTaken = false;
  });

  return {
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeSelection() {
      const taken = selectedId;
      selectedId = null;
      return taken;
    },
    takeClick() {
      if (!click || clickTaken) return null;
      clickTaken = true;
      return click;
    },
  };
}
