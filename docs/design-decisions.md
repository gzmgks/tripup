# Design decisions not covered by Figma

The visual language is Gizem's. Hi-fi 1 (Plan tab with the live poll) and Hi-fi 2 (Log the bill) are built 1:1 from Figma. Every other screen extends the same tokens, components and spacing. This file lists every call Figma didn't make, so it can be reviewed and changed.

## Figma edits made while building
All originals are in the **Originals** frame, next to the Hi-fi Screens section.
- Status bar time changed from 5:13 to 9:41, on both hi-fi screens.
- "Live Pool" corrected to "Live Poll", in Hi-fi 1 and in the Timeline item component. The variant was renamed from Pool to Poll.
- "Ren (Guest)" pill: 4px more right padding, so the ")" no longer hides under "+ Add".
- Key decisions: removed the trade-off line that appeared twice.

## Things to know about the Figma file
- Two labels on Log the bill use **Inter** rather than Geist: "Pre-selected from tonight's drinks answers" and "Tip". The prototype keeps Inter so it matches.
- Three colours are not in the variables collection: `#737378` (times, hints), `#1C1C1F` (some titles and amounts) and `#F4F4F5` (the "From your plan" card). They are tokens in `src/styles/tokens.css`.
- The poll question uses Plus Jakarta Sans Bold 16, while the design system says poll questions use Baloo. The prototype follows the frame.
- The split preset reads "Partially separate" in Hi-fi 2, but "Drinks separate" in the wireflow and in Key decisions. The prototype follows Hi-fi 2.
- "Sun 12 Oct" is a Monday in 2026.

## Shell
- **Desktop:** the 440×956 device at 1:1 in a frame like the hi-fi frames (36px radius, 1px Grey 3 border), on a Grey 4 page with a soft shadow. The page scrolls if the window is shorter than 956px.
- **Phones** (under 440px wide): full screen. The phone's real status bar replaces the 9:41 one, the layout keeps clear of the notch and home bar, and the browser bar takes the colour of the top of each screen.
- **Demo controls** (presenter only): a faint button outside the phone on desktop, or a long-press on the status bar.
  - **Contents:** restart, jump to any step, run the next group event, and make the next bank payment fail.
  - **Look:** black and grey, kept out of the product's violet.
  - **Deep links:** any step opens directly with `?step=<id>`.
- **Toasts:** a dark pill with white Body text. It sits above the bottom buttons when a sheet or Log the bill is open.
- **Tap areas:** small controls get invisible 44pt tap areas, so nothing moves visually.
- **Error colour:** one new token, `#D93636` with `#FDEEEE` behind it, used only for the failed payment.

## 01 Home
- **Page:** white with the light status bar; "My trips" is an H2 with Ari's avatar on the right.
- **Active trip card:** violet, like the trip header it opens into. It has a map cover (the "3" pin appears once dinner is decided), a white "Next" card and crew avatars. "You owe €156" is calm light text, never red.
- **Other cards:** "Plan a new trip" is a grey card with a violet "Plan with AI" and a white "Start from scratch". Porto shows a Lime-dark ✓ tile.

## 02 · 05 · 06 Plan tab
- **Open slot:** a white card with a dashed Grey 2 border and a dashed violet "?" badge, plus a violet "Decide" pill and a "Pick a place" chip.
- **Map:** once dinner is decided, a numbered "3" pin covers the dashed "?", and the chip changes to "Upcoming > Dinner at Cervejaria Ramiro 20:30".
- **Live poll:**
  - No "Leading" badge, as in the hi-fi: the leader is the violet bar. In a tie, every tied leader is violet.
  - Each option keeps a row for voters, so nothing jumps when votes land.
- **Poll callouts:** the 4th place and tie callouts are grey cards under the options. "Keep my vote" is white, "See options" violet, and "🎲 Spin the dice" violet.
- **Decided stop:**
  - Chips: grey for facts (walk time, "Picked by 3 of 6" / "Picked by chance" / "Picked by Maya", "Picked by you"), violet for actions (Directions, Switch spot).
  - "Who's in for drinks?": Ari's answer turns Lime with a ✓; unanswered buttons are violet (waiting on you).
- **Getting to 22:30:** the evening moves on by itself about 5s after the drinks answers are in. "Skip to 22:30 →" is a black demo pill (deliberately not product UI) for presenters who don't want to wait.
- **After 22:30:** the stop shows "Log the bill". Once the bill is saved, it shows "Dinner · €198.00 · paid by you" with a ✓.
- **23:30 Drinks in Bairro Alto:** no ✓, because it hasn't happened yet.

## 03 Add people · 04 Decide (sheets)
- **Sheet layout:** sheets use the Hi-fi 2 header (centred H2 and a circled ×). They start with a grabber, keep the main action at the bottom, focus their own content when they open, and close with Escape.
- **Selection:**
  - Option cards are BG cards. When chosen, the card turns white with a 2px Lime-dark ring and a ✓ (Lime = chosen).
  - Chips for sources, closing time and filters use the day-chip style, Lime when selected.
  - Small actions (Show QR code, Copy link, WhatsApp, + Add) use the "Live Poll" chip style.
- **Add people:**
  - Full trip member can be selected, but confirming it shows a "not part of this demo" toast.
  - The QR code is a placeholder pattern.
- **Decide sheet:**
  - The question sits on a grey card under a "Question" caption.
  - "30 min" and "1 h" really change the closing time.
- **Chance:** a short spin through the places that lands on a Lime card, then the dinner is decided.
- **Someone picks:** choosing a person doesn't decide straight away. "Let Maya pick" in the footer confirms it, and the stop then says "Picked by Maya".
- **Add plan / Explore / Full map** (the 02 callouts): working sheets, kept light. "Add to a plan" (from Explore or a ★ on the map) puts that place straight into tonight's 20:30 slot, with "Picked by you".

## 07 Log the bill
- **Ren's tile, once Ari answers for him:** the pill reads "in" or "off" and its ring turns Lime dark or grey. The picked button gets a ring and the other one greys out.
- **Tip:** "No tip added +" adds a 10% tip on top of the €198, split in proportion to each share. The pill then reads "Tip €19.80 · split by share" with an × to remove it.
- **Light actions:** "Paid by ▾" opens a small picker. The camera adds a mock receipt photo. "Each pays own", "Split equally ▾" and "+ Split out another item" show a toast that says why it isn't part of this demo (e.g. "tonight only the wine is split out").

## 08 Money · 09 Pay · 10 Squared up (calm voice)
- **Surfaces:** flat white and BG, with no paper texture and no red for debts.
- **Balance card:** "You owe €20.00" in Baloo violet, like "Your share" on Log the bill (violet = something waits on you). Once paid it becomes "You're all square" in ink, with a Lime-dark "✓ Paid · Maya received €20.00".
- **Transfer rows:** BG cards with your own row first. Pay is a small violet pill. Paid rows show a Lime-dark ✓ "Paid"; cash shows "Waiting for Maya to confirm".
- **Ren's row:** a quiet white "Requested" pill and "Auto-reminder tomorrow if unpaid". There is no nudge button, because the app does the reminding ("Nobody chases anyone").
- **Progress:** "4 of 4 payments" uses the poll-bar shape in Lime, shown once the first payment is in.
- **Everyone's balance:** a collapsed row (new), so the brief's "each person's balance updates" is visible without putting anyone on show. Inside, each person's balance is listed before → now.
- **Recent:** the three newest expenses; "See all (23)" opens the full list.
- **Pay sheet:**
  - The amount block is centred.
  - The phases share one fixed-height area so the sheet doesn't jump: approve in your bank app (a neutral drawing, no bank branding), sending, paid (Lime ✓), waiting for Maya (cash), and failed.
  - Failed is the only red: "Payment didn't go through", with "Try again" and "Pay another way".
- **Squared up:** the one warm moment on the settle side. A Lime circle with an ink ✓ and a soft halo, the six avatars with "all ✓", a summary card ("5 days · 23 expenses · 4 payments to close it all"), and "Share a trip recap" / "Plan the next trip".

## Ren's phone (G1, G2) and notifications
- **Ren's pages:** look like the mobile web, with an address bar (tripup.app/p/lisbon-dinner, tripup.app/pay/lisbon-dinner) and a black "Back to Ari's phone" pill.
- **The group's notification:** Ari can't get the push for her own poll, so after "Send to group" the Figma push appears with a black "What the group got" label. On Ari's phone, its quick-vote chips explain that friends vote from their lock screen.
- **22:30 "Who paid at Cervejaria Ramiro?":** the same notification card, with a violet "Log the bill".

## New copy (where Figma has none)
- **Home:** "You're owed €X" / "You're all square" / "Dinner tonight · 4 of 6 voted"; Profile toast.
- **Plan tab:** "Skip to 22:30 →", "Runner-up · 2 of 6" (after Switch spot), "Picked by chance", "Picked by {name}", "Want to vote for it?"; "Upcoming > Dinner at {place} 20:30".
- **Sheets:**
  - "Name", "Save Ren's plans", "Hide QR code", "Scan to join"
  - "Keep at least 2 places", "Tonight's dinner is already decided", "Tonight's poll is already live"
  - "Spinning…", "Let {name} pick", "Waiting for {name}…"
  - Titles "Suggest a place", "Explore", "Full trip map"; "Up to 4 places per poll", "The poll already has 4 options."
  - "Tap a ★ to add it to a plan or a poll."
  - Explore toasts
- **Bill:** "Tip €19.80 · split by share", "Who paid?" (picker title), "Receipt photo attached".
- **Money and Pay:**
  - "You're all square", "Paid · Maya received €20.00", "Waiting for Maya to confirm", "Paid via link"
  - "Everyone's balance", "See all (23)"
  - "Approve in your bank app", "Sending €20.00 to Maya…", "Mark as paid", "Pay €20.00", "Done"
- **Ren's pages:** "Back to Ari's phone", "You're in! We'll tell you where.", "You're all set. Thanks for joining!"; the "What the group got" label.
- **Toasts:** "Ren is in for tonight's dinner", "Ren's plans are saved", "✓ {place} added to tonight's plan", "Switched to {place} · the group is notified", "Link copied · tripup.app/p/lisbon-dinner", "Not part of this demo".

## Motion and timing (stage 4)
- **Autopilot:** the group's actions run on fixed timers (`src/store/autopilot.ts`), so the demo plays the same way every time.
  - **Votes:** 3s after sending, then about 1.3s apart. Sam and Ren wait for Ari's vote, so Hi-fi 1's "4 of 6" always shows.
  - **Close:** "6 of 6 · closing…" holds for 1.9s.
  - **Drinks:** answers about 1s apart. Then, after 5s, the evening moves on to 22:30.
  - **Payments:** friends pay 1–2s apart, once Ari has paid and closed the Pay sheet.
  - **Pausing:** turn "Group plays by itself" off in Demo controls, or add `?auto=0`.
- **Decision moments (lively):**
  - **Votes:** avatars pop in, bars spring, counts roll.
  - **Winner:** at closing the winning row turns Lime with a small 🎉✨. Its name then travels from the poll into "Dinner at Cervejaria Ramiro", and the map's "3" pin pops in.
  - **Tie:** the dice wiggle and then roll.
  - **Drinks:** answers slide into their row.
  - **06B:** "Log the bill" rises in with one violet pulse.
- **Scrolling:** the Plan tab scrolls to whatever just changed (the poll, a callout, the decided stop).
- **22:30 interlude:** "Later that evening" on Purple Dark, with the hour rolling 20 → 21 → 22 (about 1.7s). Taps are blocked while it shows.
- **Settle moments (calm):**
  - **Log the bill:** "Your share" counts between values.
  - **Money:** the balance counts down "You owe €156.00 → €20.00", then "was €156.00" fades in and the transfer rows rise in one by one.
  - **Pay:** the bank step pulses gently, processing shows a spinner, and paid draws a ✓ on a Lime circle. Failed gives the red badge one short shake.
  - **Payments landing:** each one ticks in, and the progress bar fills in Lime.
  - **Squared up:** the Lime ✓ scales in with one soft halo, then the avatars pop in one after another. No confetti, because this is the calm voice.
- **Reduced motion:** every state appears at once, with no particles, loops, shakes or counting. Only the payment spinner keeps turning, slowly, so it never looks stuck.
- **To review:** the Lime highlight on the winning row at "closing…" (05B) is new, so `poll-all` now differs slightly from the wireframe.

## Accessibility (stage 5)
- **Automated check:** axe (WCAG 2.1 AA) ran on 47 states at both sizes. Every rule except colour contrast is down to zero.
- **Structure:** one main region per screen, and headings in order.
- **Controls:** tabs, radios and switches have complete roles and keyboard arrows. Sheets and Demo controls trap focus and close with Escape. Focus moves to each new screen's title.
- **Screen readers:** live updates are summarised, for example "4 of 6 voted" is read once votes pause, never every digit as it rolls. Every icon button has a name.
- **Tap targets:** at least 44pt everywhere, using invisible extensions so nothing moves visually.
- **Contrast fixed on the new screens:** Home trip meta, "+ Add expense", the banner ×, and the demo trigger.

**Contrast in Gizem's own colours, left as designed** (worth deciding on; WCAG asks for 4.5:1 for text and 3:1 for icons):

| Where | Colours | Ratio |
|---|---|---|
| Header subtitle "Day 5 of 5 · Sun 12 Oct", unselected tab | Grey 3 on violet | 3.8 |
| "+ Suggest a place" | Grey 2 on BG | 2.5 |
| "+ Split out another item" | Grey 2 on white | 2.8 |
| Timeline times, "Optional" | #737378 on BG / paper | 3.9–4.2 |
| Lime-dark ✓ icons | on white / BG | 2.4 / 2.1 (always paired with text or a spoken state) |

**Mixed apostrophes:** some Figma strings use a straight apostrophe (Tonight's guest, Who's in for drinks?, It's a tie!) and new copy uses ’. One choice for both would be cleaner.

## Phones (stage 5)
- **Opening the demo controls:** long-press anywhere in the top 64pt of the screen (status bar or header). A quick tap there still works as normal, and the release after a long press can't close the panel by accident.
- **Pull-down:** there is no pull-to-refresh and no rubber-banding, because a reload would reset the demo. Sheets and lists scroll inside themselves.
- **Text selection:** text doesn't get selected on a long press, except in the name field, which makes it feel like an app.
- **Landscape:** a phone held sideways also gets the full-screen layout (not the desktop frame).
- **Log the bill:** the title and × stay fixed while the bill scrolls, so they never slide under the clock.
- **Small phones (320–360pt, e.g. iPhone SE):**
  - the split presets wrap onto two lines
  - the wine tiles use 30pt avatars and Ren's tile is narrower
  - "Auto-calculated · €25.00 each" wraps before the "Split equally" pill
  - long place names in the poll end in "…"
- **Toasts:** a toast clears when a sheet opens.
- **Browser bar colour:** follows the top of each screen (violet on trip screens, white elsewhere).

## After the final review (stage 6)
New copy is in quotes.
- **Add Ren first:** until Ren is added, the open 20:30 slot says "Ren joins you for this dinner: add him first, so he can vote too." Its first button is a violet "+ Add Ren", and Decide becomes a chip. The Decide sheet repeats the prompt with its own "+ Add Ren". If Ren is added while the poll is live, he still gets a vote.
- **Vote hint:** "Tap a place to vote" (violet, because it's waiting on you) shows on the live poll until Ari has voted. It's never visible in Hi-fi 1, where she already has.
- **Drinks question:** "Who's in for drinks?" now has the line "For the wine at dinner: it's split among the people who are in", so it isn't read as the 23:30 bar.
- **Everyone's balance:** opens by itself once the bill is saved, so each person's updated balance is visible (the brief's "each person's total trip balance"). It can still be collapsed.
- **Log the bill:**
  - With a tip, Total shows the bill plus the tip.
  - Turning the last person off the wine says "Someone has to share the wine. Or pick Share all."
- **Desktop:**
  - Less padding around the phone.
  - Scrolling over the phone also scrolls the page.
  - When a sheet, Log the bill or Squared up opens on a window shorter than the frame, the page scrolls so its button is on screen.
  - While a hi-fi screen is showing, a caption under the phone says so: "★ Hi-fi 1: built 1:1 from the Figma frame (Plan tab, live poll)". It is desktop only.
- **Link preview:** an image of the two hi-fi screens with the title, for sharing the URL.
