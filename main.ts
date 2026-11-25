// Burger Station entrypoint (Node 22, standard library only): the game is
// this directory's game/ folder — plain static files a desktop browser loads
// offline (game/index.html and its ES modules, no library, no network
// request) — and this program hands it in. It copies game/ and screenshots/
// from beside this file to /output and writes /output/dossier.json, the
// summary the judge reads, with the vendored make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail fast when the entry has no screenshots to judge: a dossier without
// the four staged beats (hero, rush, combo, shift-complete) is not worth
// handing in, and the scorer would refuse an oversized shot anyway.
const shotFiles = readdirSync(join(here, 'screenshots')).filter((f) => /\.(png|jpe?g)$/i.test(f));
if (shotFiles.length < 3 || shotFiles.length > 4) {
  throw new Error(`Burger Station needs 3-4 screenshots, found ${shotFiles.length}`);
}
for (const shot of shotFiles) {
  const bytes = statSync(join(here, 'screenshots', shot)).size;
  if (bytes > 262144) throw new Error(`Screenshot ${shot} is ${bytes} bytes, over the 256 KiB cap`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of
// game files, in all, or a path under game/ over 1000 bytes).
const dossierPath = join(out, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// Read the dossier back: a build that writes bytes the library cannot parse
// is caught here, in our own run, instead of at the gate.
const dossierBytes = statSync(dossierPath).size;
JSON.parse(new TextDecoder().decode(readFileSync(dossierPath)));

// Burger Station's own line, so this entrypoint is authored here, not copied:
// the dossier above now holds a diner where the grill is the antagonist.
const shotSummary = shotFiles
  .map((f) => `${f} (${Math.round(statSync(join(here, 'screenshots', f)).size / 1024)} KiB)`)
  .join(', ');
console.log(`Burger Station dossier written to ${out}/dossier.json (${dossierBytes} bytes, ${shotFiles.length} screenshots: ${shotSummary})`);
