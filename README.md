# TripUp: the final night in Lisbon

TripUp is a group travel app, and this is an interactive prototype of it for the Bending Spoons product design exercise (October 2026). The idea behind it:

> **TripUp is the group's live trip timeline.** Polls and expenses aren't separate tools; they happen on the timeline, in the context of the plan.

The prototype walks through the brief's scenario: the last evening of a five-day trip to Lisbon, from an open dinner slot to a squared-up trip.

- **Prototype:** https://tripup-six.vercel.app
- **Figma (wireflow, hi-fi screens, design system):** https://www.figma.com/design/BvoXLAMBt9pp0A9KjaEMaD/BendingSpoons_Case_10_26
- **Design:** Gizem Göksu

Data, restaurant details and AI suggestions are mock. The concept has not been tested with real users.

---

## Try it

**On a computer** the app shows at exactly 1:1 at the reference size: an iPhone 16/17 Pro Max screen, 440×956 pt, in a minimal phone frame. If the window is shorter, the page scrolls; the app is never scaled down. **On a phone** it fills the screen.

You are **Ari**. The rest of the group (Maya, Theo, Sam, Nic, and Ren, who joins for dinner) acts on their own, on fixed timers, so the demo plays the same way every time.

| # | You tap | What happens |
|---|---|---|
| 01 | **Lisbon with the crew** on My trips | The trip opens on today's plan. Dinner at 20:30 is still open ("Next · Dinner 20:30 · not decided"). |
| 03 | **+ Add** → **Add Ren & share link** | Ren is invited as a guest for the dinner only: "Invited · waiting to join". A moment later his phone shows the link (no app or account); he types his name and taps Join, and Ari's phone says "Ren joined". |
| 04 | **Decide** on the 20:30 slot → **Send to group (6)** | The poll goes out with three places that have different vibes. You see the notification the group got. |
| 05 | Wait a moment, then tap **A Cevicheria** | Votes land live and the leader updates in real time: Taberna leads 2–1–1 with 4 of 6 voted (Hi-fi 1). |
| 05B | (the group) | Nic changes his mind ("Nic switched to Ramiro"), then Sam and Ren vote for Ramiro; "6 of 6 voted · closing…". |
| 06 | (the group) | The winner moves into the 20:30 slot: "Dinner at Cervejaria Ramiro · Picked by 4 of 6", and the map gets its pin 3. "Who's having drinks?" answers come in: Nic skips, and Ren never answers, so he's "no answer, counted in". |
| 06B | (time passes) | "Later that evening · 22:30", then **Who paid at Cervejaria Ramiro?** |
| 07 | **Log the bill** → tap **✕** under Ren | €198 total, wine €48 split out (Nic is already off from his wine answer), the rest split equally. Hi-fi 2 shows Your share €34.60; with Ren off the wine it becomes €37.00. |
| 08 | **Save** | Everyone's trip balance updates. You owe **€20.00, was €156.00**. Debts are reduced to **3 payments instead of 10**, and Ren pays his €25 to you directly. |
| 09 | **Pay** → **Continue to your bank** → **Done** | A simulated bank approval, then "You're square with the group · Ren owes you €25". Your friends pay from their own phones: "x of 4 payments (incl. Ren)". |
| 10 | (the group) | **Lisbon is squared up:** "5 days · 23 expenses · 4 payments (incl. Ren) to close it all". **Plan the next trip** goes back to My trips, where Lisbon is now a past trip. |

Around the scenario:
- **My trips** opens with the TripUp logo. The active trip has a photo header and "Last night in Lisbon"; past trips show a photo and the people who went.
- **Full trip map** (the expand button on the Plan tab map): today's stops 1–4 on the route, with the open dinner as "?" and a Decide action, plus the group's ★ Ideas.
- **Day 1–4** tabs show the earlier days, read-only: the stops that happened and what each cost.
- **Explore** (Explore or Ideas on the Plan tab) covers the whole trip: an AI travel agent asks what, where, when and budget in a short chat, and there are curated lists (Top 10 in Lisbon, Food, Nightlife, Hidden gems) and the group's Ideas. Any place can go to Ideas, a plan slot (tonight's dinner or drinks) or tonight's poll.

The whole run takes about 40 seconds if you tap straight away, closer to a minute at presenting pace. Buttons outside the scenario either work in a light way or say so with a friendly toast.

### Demo controls (for presenting)
- **Opening them:** on a computer, use the faint **Demo controls** button below the phone. On a phone, long-press the top of the screen (the status bar or the header).
- **What they do:** restart the demo, jump to any step (including the tie, the 4th place, the failed payment and Ren's phone), skip to 22:30, pause "Group plays by itself", run the group's next action now, and make the next bank payment fail.
- **Deep links:** `?step=<id>` opens a step directly, for example `?step=hifi-1` or `?step=money`. Add `&auto=0` to pause the group.

### Edge cases from the wireflow you can reach
- **Tie:** the happy path never ties (Ramiro wins whatever you pick). The tie is a jump in the demo controls: the poll ends 3–3, then "It's a tie! Let fate decide" → Spin the dice.
- **A 4th place:** "+ Suggest a place", or Theo adding Time Out Market (via the jump list).
- **Switch spot:** the runner-up takes the slot, with no re-vote.
- **Other ways to decide:** Chance (spin) or Someone picks.
- **Ren's phone** (mobile web, no account): his poll link and his pay link, opened from the demo controls.
- **Paying by cash:** Maya has to confirm before it counts.
- **A failed payment:** the only red in the app. Nothing is charged, and "Try again" or "Pay another way" follow.
- **On the bill:** a tip (split by share), Share all, and "Paid by" someone else.

---

## How the logic works

Nothing is hard-coded: every number on screen is computed from data.

- **The trip as data** (`src/data/seed.ts`):
  - members, and a guest whose access is scoped to the plans he was added to
  - the day's plans, the poll and its votes, and the "Who's having drinks?" answers
  - 22 earlier expenses with per-item participants, plus tonight's €198 bill, which becomes the 23rd when you save it
- **Earlier expenses:** the 22 expenses before dinner are mock, but they reproduce the balances in the Figma data sheet to the cent: Ari −€156, Maya +€137, Theo +€7, Sam −€13, Nic +€25.
- **The money engine** (`src/domain/money.ts`) works in **integer cents**:
  - **Item-level splits:** for example, the wine among the people who drank it. The rest of the bill is split equally.
  - **Rounding:** leftover cents go one each to the payer first, then to the others in a fixed order.
  - **Tips:** split in proportion to each share.
  - **Balances:** what each person paid minus their share, across all trip expenses (the €84 lunch included).
  - **Guests:** a guest's share is a direct debt to whoever paid, kept outside the group's balances.
  - **Simplifying debts:** a greedy min-cash-flow pass. The "instead of 10" is the number of person-to-person debts before simplifying (each person owing each payer, netted per pair): all 10 pairs of the five friends end up owing each other something.
- **The scenario** (`src/store/scenario.ts`, `events.ts`) is a set of pure state transitions, and `autopilot.ts` runs the group's actions on fixed timers. Each scripted action waits until it makes sense (Nic switches and Sam and Ren vote only after Ari has, so the Hi-fi 1 state always appears) and then runs after a fixed delay. Nic's switch is what keeps the happy path from tying: Hi-fi 1 fixes the first four votes (Maya Ramiro, Theo and Nic Taberna, then Ari), so if Ari picks Taberna, Sam and Ren alone could only make it 3–3.

**The wireflow's numbers all add up**, so nothing needed correcting:

| Figure | Check |
|---|---|
| €198.00 | €150 food + €48 wine |
| €25.00 each | €150 ÷ 6 |
| €9.60 each, €34.60 | €48 ÷ 5 (Ren hasn't answered, so he still counts) → €25 + €9.60 |
| €12.00 each, €37.00 | €48 ÷ 4 once Ren is off → €25 + €12 |
| €136 | €198 − Ari's €37 − Ren's €25 (Ren pays Ari directly) |
| €156 → €20 | −156 + 136 |
| 3 transfers | Ari → Maya €20, Theo → Maya €30, Sam → Maya €50 |
| €84 | Theo's LX Factory lunch, one of the 23 expenses |

`npm test` runs 70 tests. They cover the split engine, rounding and tips, the balances, debt simplification, the poll rules, the seed data against the ledger, Explore's agent and slot rules, and replays of the whole scenario (including every pick Ari can make, every set of places in the poll, and Ren voting from his link). Together they assert every figure above and that the happy path never ties.

---

## Design fidelity

The two hi-fi screens (05 Live poll, 07 Log the bill) are built from Figma's exact values: variables, text styles, spacing and exported assets. They were then diffed pixel by pixel against the Figma frames.

| | Figma \| Prototype \| Diff | Differing pixels |
|---|---|---|
| Hi-fi 1 (Plan tab with the live poll) | [docs/hifi-compare/side-by-side-hifi-1.png](docs/hifi-compare/side-by-side-hifi-1.png) | 1.58% |
| Hi-fi 2 (Log the bill) | [docs/hifi-compare/side-by-side-hifi-2.png](docs/hifi-compare/side-by-side-hifi-2.png) | 1.50% |

What remains is text anti-aliasing (Figma's text renderer vs the browser's) and photo resampling, plus, on Hi-fi 2, Ren's monogram in his wine pill (added in review round 1; it goes into the Figma frame next). The Figma exports are fresh after review round 1's text syncs (the map chip and the two wine lines), so those texts match. The element positions measured against Figma's layout data matched to within 1px. Rerun the comparison with `node scripts/compare-hifi.mjs docs/hifi-compare/figma-hifi-1.png docs/hifi-compare/figma-hifi-2.png <out-dir>` while the dev server runs (it needs Google Chrome installed; the path is the macOS one).

Screens that exist only as wireframes extend the same tokens, components and spacing. Every visual decision and every new string that Figma doesn't cover is listed in [docs/design-decisions.md](docs/design-decisions.md).

The tokens (`src/styles/tokens.css`) are the Figma variables, one to one. Components never use raw colour values, and the colour rules are applied strictly:
- **Violet** is for acting: brand, navigation, and anything waiting on you.
- **Lime** is for chosen, agreed or done. It is never used for text.
- **Red** appears only for a real error (the failed payment), never for debts.
- **Paper texture** appears only on the trip timeline. The money screens stay flat and calm.

**Accessibility:**
- An axe audit (WCAG 2.1 AA) of every state at both sizes has no issues left, apart from colour contrast in a few of the designer's own hi-fi colours, which are listed in the design notes.
- Sheets trap focus and close with Escape, and tabs and radios work with the arrow keys.
- Live updates are summarised for screen readers, and every tap target is at least 44pt.

**Motion** follows the two voices. Deciding is the upbeat friend: votes pop in, the winner travels into its slot, and the dice roll. Settling is the calm friend: the balance counts down, payments tick in, and a quiet ✓ confirms. With *Reduce motion* turned on, every state appears without animation.

---

## Stack

- **Core:** Vite 8, React 19, TypeScript 6
- **Motion and state:** Framer Motion 14 for motion, Zustand 5 for the scenario store
- **Styling:** CSS modules plus one tokens file. Fonts from Google Fonts: Plus Jakarta Sans (headings), Geist (body, numbers, money), Baloo Tamma 2 (the accent voice, and the "TripUp" wordmark at Regular), and Inter for two labels, matching Figma.
- **Testing:** Vitest for unit tests; playwright-core driving the installed Google Chrome and WebKit for screenshots, layout measurements, the pixel comparison and an end-to-end walkthrough (`node scripts/walk.mjs chrome|webkit|iphone17|iphone|android`; `iphone17` is the 440×956 reference device)
- **Backend:** none; everything runs in the browser.

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run build
```

Node 22.12 or newer (built and tested on Node 24).

```
src/
  styles/tokens.css     Figma variables and text styles as CSS variables
  domain/               money engine and poll rules (pure, unit-tested)
  data/seed.ts          the trip as data
  data/explore.ts       Explore's catalog and curated lists
  data/pastDays.ts      Days 1–4, read-only, from the ledger
  store/                scenario transitions, scripted group events, autopilot, selectors
  components/           Avatar, Icon, Sheet, Button, OptionCard, …
  screens/              home, hub (Plan tab), explore, sheets, bill, money, pay, squared, guest
  shell/                device frame, status bar, banners, interlude, toast, demo controls
docs/                   hi-fi comparison, design decisions
scripts/                asset pipeline, screenshots, hi-fi pixel comparison
```

**Photos** on My trips, compressed to WebP (`src/assets/images/`), both under the [Unsplash License](https://unsplash.com/license):
- Lisbon tram (Rua da Prata): [Aayush Gupta](https://unsplash.com/@aayush_gupta) on Unsplash
- Porto Ribeira: [Evgeni Gitlits](https://unsplash.com/@egitlits) on Unsplash

The map, avatars, logo and icons are exported from the Figma file.

---

## How I used AI

I designed the product myself in Figma: the problem framing, the competitive lens, the wireflow, the visual direction and both hi-fi screens. No part of the visual design was generated by AI.

The prototype's code was generated with **Claude Code** (Anthropic's coding agent) under my direction, and I reviewed it at every stage. In practice:

- **A written brief first.** Before any code, I wrote down the decisions: the reference device, the colour rules, the screen-by-screen flow, that all logic must be real (integer cents, item-level splits, debt simplification), and how the demo should behave. Claude read the Figma file through Figma's MCP connection (layers, variables, text styles, exported assets) and came back with a build plan and a list of questions. I answered them before it started.
- **Small stages, each reviewed before the next:**
  1. tokens and shell
  2. the two hi-fi screens
  3. the rest of the flow
  4. timed simulations and motion
  5. polish (accessibility, copy)
  6. deploy
- **Fidelity checked mechanically, not by eye.** The prototype was screenshotted and diffed pixel by pixel against the Figma exports, and element positions were measured against Figma's layout data. This found real problems: line heights, stroke alignment, avatar rings.
- **Independent reviews.** Parallel agents rebuilt and verified the money maths, reviewed the screens against my wireframes and colour rules, and clicked through every button of the scenario. Their findings were fixed before each stage was shown to me.
- **It pointed out issues in my file** (for example a "Live Pool" typo, inconsistent device labels, and two labels set in Inter). With my OK it made only small fixes in Figma, after copying the originals into an **Originals** frame for comparison.
- **A design review round, the same way.** After my first review (19 items: a full-screen map, a trip-wide Explore, a livelier Home, no tie on the happy path, Ren counted in on the wine, consistent payment counts, my logo, Figma text syncs), four agents built the changes in parallel, each owning its own files. Five independent reviewers then checked the running app against my wording, the logic, the design system, accessibility and phone sizes, and a skeptic had to reproduce every finding before it counted (29 did). After the fixes, a second pass re-checked each one and the regressions it found were fixed too. The whole scenario was replayed on an iPhone 17 Pro Max-sized screen (440×956), and every step was compared with the version before the round.
- **Every decision it made is written down.** Where my file didn't cover something (screens that only exist as wireframes, motion, an error colour), the choice is listed in `docs/design-decisions.md` so I could review it.
