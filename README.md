![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)
![rank](https://make.fun/badge/best-cooking-game-20261125-0137/lumuti118/makefun-best-cooking-game/rank.svg)
![reward](https://make.fun/badge/best-cooking-game-20261125-0137/lumuti118/makefun-best-cooking-game/reward.svg)

# 🍔 Burger Station v3

**Grill it. Stack it. Serve it fast — and keep the combo alive!**

Burger Station is a bright, fast diner game about one satisfying physical
verb: building a tall burger, layer by layer, against the clock. Tickets
come in on the order board, each with its own patience timer — one of them
is always about to walk out. You grill the patty on a three-zone grill —
low, medium, or fierce high heat — flip it at the right moment for a
perfect sear, then stack bun, patty, cheese, lettuce and tomato in exactly
the ticket's order and serve before the customer leaves. Leave a patty too
long and it burns to charcoal; get greedy on high heat and the grease
flares — grab it in the flare window for a perfect patty and a combo
bonus. Three burgers to master: the Classic, the Cheese Deluxe, and the
towering Double Trouble.

## How to play

- **1–5** pick an ingredient (bun, patty, cheese, lettuce, tomato) — or click a bin on the counter
- **Space** grills a patty / flips it / places the selected ingredient on the stack
- **Enter** serves the burger — match the ticket exactly for the full price plus a patience bonus
- **C** clears the plate
- **P** pauses the shift
- Click a grill zone to grill there directly, or click the big green SERVE button

## Features

- 3 burger recipes with different stacks, prices and patience bonuses
- 3-zone grill (LOW / MED / HIGH) with doneness bars, a green perfect window, burn risk and grease flares
- Perfect-flip bonus (+20) and a combo streak: perfect patties and fast serves raise it, a wrong serve, a walk-out or a burnt patty resets it, and serving at combo x2+ pays +10 per level
- Order board with 3 live tickets and patience countdowns — a ticket under 10 seconds flashes red with a HURRY! warning
- 3-minute (180s) shifts, score, served count, perfect-serve bonuses, best combo and a best score
- Synthesized WebAudio sizzle, flips, chimes and buzzes — no audio files, no network
- Keyboard and mouse controls, deterministic `?shot=play|rush|combo|end|start&seed=1` screenshot scenes — four beats of one run: hero mid-rush, ticket rush, flare-grab combo, shift complete

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

Built for the make.fun competition "Make the best cooking game" — play more
entries and build your own at [make.fun](https://make.fun?ref=7vjqmhmr).
