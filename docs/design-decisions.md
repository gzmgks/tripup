# Design decisions not covered by Figma

The visual language is Gizem's. Hi-fi 1 (Plan tab with the live poll) and Hi-fi 2 (Log the bill) are built 1:1 from Figma. Every other screen extends the same tokens, components and spacing. This file lists every call Figma didn't make, so it can be reviewed and changed.

## Figma edits made while building
All originals are in the **Originals** frame, which now sits in the "Working files (not part of the review)" section, out of the review area.
- Status bar time changed from 5:13 to 9:41, on both hi-fi screens.
- "Live Pool" corrected to "Live Poll", in Hi-fi 1 and in the Timeline item component. The variant was renamed from Pool to Poll.
- "Ren (Guest)" pill: 4px more right padding, so the ")" no longer hides under "+ Add".
- Key decisions: removed the trade-off line that appeared twice.
- **Review round 1 (text only, so the hi-fi screens and the prototype still match):**
  - Hi-fi 1 map chip: "Upcoming > Dinner 20:30 (not decided)" → "Next · Dinner 20:30 · not decided".
  - Hi-fi 2 wine caption: "pre-filled from “Who's in for drinks?”" → "pre-filled from “Who's having wine?”".
  - Hi-fi 2 hint: "Pre-selected from tonight’s drinks answers" → "Pre-selected from tonight’s wine answers".
  - **Review round 2 (Gizem's own Figma edits, matched here):** the question is "Who's having drinks?" and the hint is back to "tonight’s drinks answers"; the bill item stays "Wine".
  - Reference device on the Cover and in the Wireflow legend: "iPhone 15 · 393×852" → "iPhone 17 Pro Max · 440×956".
  - The old texts are in the "before" copies in Originals (a copy of the Wireflow legend was added), and the change list there logs them.

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
  - **Contents:** Restart demo, jump to any step, skip to 22:30 (time skips live here, not in the product), run the next group event, and make the next bank payment fail.
  - **Look:** black and grey, kept out of the product's violet.
  - **Deep links:** any step opens directly with `?step=<id>`.
- **Toasts:** a white card with a hairline Grey 4 border, a soft ink shadow and ink Body text (no black fill). Confirmations ("✓ …") get a small Lime check badge. It sits above the bottom buttons when a sheet or Log the bill is open, and clears when a sheet opens.
- **Tap areas:** small controls get invisible 44pt tap areas, so nothing moves visually.
- **Error colour:** one new token, `#D93636` with `#FDEEEE` behind it, used only for the failed payment.

## 01 Home
- **Page:** white with the light status bar. The TripUp logo sits at the top: the Figma mark (158:294) and the "TripUp" wordmark in Baloo Tamma 2 Regular, black, at the Figma lockup's exact ratios (mark 54px high → 62px wide, wordmark 17px / 18px line, 7.2px gap). Ari's avatar stays on the right; "My trips" is the H1 below.
- **Active trip card:** violet, like the trip header it opens into. Its header is a photo of Lisbon (tram 28) with a white "Last night in Lisbon" tag ("Day N in Lisbon" on other days), then a white "Next" card and crew avatars. "You owe €156" is calm light text, never red.
- **Other cards:** "Plan a new trip" is a grey card with a violet "Plan with AI" and a white "Start from scratch". Past trips are grey cards with a 72px photo, the name, "March · Squared up ✓" and that trip's people as small stacked avatars (Porto: Ari, Maya, Sam and Nic).
- **After Squared up:** the Active section goes away, "Plan a new trip" moves up, and Lisbon is the first past trip ("October · Squared up ✓", the tram photo, the crew and Ren's monogram). Tapping it opens the trip's Money tab, all settled; Porto says "Porto is squared up · nothing left to settle".
- **App icon:** the mark on white for the favicon, the home-screen icon and the web manifest.

## 02 · 05 · 06 Plan tab
- **Open slot:** a white card with a dashed Grey 2 border and a dashed violet "?" badge, plus a violet "Decide" pill and a "Pick a place" chip. People are added only from the header "+ Add" (review round 2 removed the card's "+ Add Ren" and its hint); while Ren is invited and hasn't joined, the card carries a quiet "R Ren · Invited · waiting to join" line.
- **Map:** the chip reads "Next · Dinner 20:30 · not decided" (Hi-fi 1, synced in Figma). Once dinner is decided, a numbered "3" pin covers the dashed "?", and the chip changes to "Next · Dinner at Cervejaria Ramiro · 20:30"; after 22:30 it's "Next · Drinks in Bairro Alto · 23:30".
- **Day 1–4 tabs:** each opens a read-only past day on the same paper timeline: the day's stops from the ledger, each with ✓ and its expense line ("Castelo de São Jorge · Tickets · €75 · paid by Nic"), and "6 stops · €711.70 spent" by the date. The selected day is Lime; a demo jump returns to today.
- **Live poll:**
  - No "Leading" badge, as in the hi-fi: a single leader is the violet bar. Tied options look identical (grey, like the rest), so no place looks ahead when none is.
  - When Nic changes his vote, a caption under the options says "**Nic** switched to Ramiro" (announced to screen readers), so the moving bars make sense.
  - Each option keeps a row for voters, so nothing jumps when votes land.
- **Poll callouts:** the 4th place and tie callouts are grey cards under the options. "Keep my vote" is white, "See options" violet, and "🎲 Spin the dice" violet.
- **Decided stop:**
  - Chips: grey for facts (walk time, "Picked by 4 of 6" / "Picked by chance" / "Picked by Maya", "Picked by you"), violet for actions (Directions, Switch spot). Switch spot only shows when the decision had votes (a direct pick has no runner-up).
  - "Who's having drinks?" (review round 2; round 1 had "wine"): "It's split among the people who are in. No answer counts as in." Ari's answer turns Lime with a ✓; unanswered buttons are violet (waiting on you). Under "In", anyone who hasn't answered is listed on their own line, e.g. "R Ren · no answer, counted in", until they opt out. Names fade in place, never slide over each other.
- **Getting to 22:30:** the evening moves on by itself about 5s after the drinks answers are in. A quiet line under the card, "Dinner ends at 22:30 · Skip ahead" (only "Skip ahead" violet), skips there; Demo controls have "Skip to 22:30" too.
- **After 22:30:** the stop shows "Log the bill". Once the bill is saved, it shows "Dinner · €198 · paid by you" with a ✓, like the other finished stops.
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
- **Add plan** (02 callout): "Pick a place" opens Explore on Food, "Ask AI for ideas" opens the agent ("A short chat: what, where, when, budget").
- **Full trip map** (02 callout, now full screen): the Figma map edge to edge with today's stops on the route as drawn, 1 Belém Tower and 2 LX Factory (✓, with what they cost), "?" for the open dinner and 4 Drinks. Done stops are filled violet, the ones still ahead are outlined (review round 2). The next stop's card is open by default: "Next · Dinner 20:30 · place not decided" with Decide; "poll live, 4 of 6 voted" with See the poll (focus moves to the poll); once decided the pin becomes 3. The group's Ideas are ★ pins, shown or hidden with "Ideas · 7". On a wide, short screen (landscape) the map keeps today's stops in view.
- **Explore** (02 callout, now full screen and trip-wide): three tabs (Ask AI, Lists, Your Ideas · N).
  - The AI travel agent asks what, where, when and budget, one chip question at a time, and answers with up to three real Lisbon places, a line about tonight's plan, and "Start over". When it relaxes the search, it says so. It never invents ratings, prices or opening hours. Ari's bubbles are Lime (her choices), the agent's are BG.
  - Curated lists: Top 10 in Lisbon, Food, Nightlife, Hidden gems. Places the group already visited say so ("Been here · Day 2").
  - Every place has "+ Add": Add to Ideas, tonight's 20:30 dinner, tonight's 23:30 drinks (bars), or tonight's dinner poll (no poll yet → Decide opens with that place as an option). Each row says where it stands before you tap, and a slot that's taken says why.

## 07 Log the bill
- **Ren's tile (review round 2):** the two-button pill ("Ren · waiting", ✓ / ✕) is only his pending state. Once his answer is set (he answers, or Ari taps ✓ or ✕) he is a tile like everyone else's: R monogram with a single ✓ or ✕ that toggles.
- **Ren's monogram on his wine pill (review round 1, kept):** his "R" sits in the "Ren · waiting" pill, the way "Paid by" puts an avatar in its pill, so he is a monogram everywhere. Gizem adds it to Hi-fi 2 in Figma herself; until then it is the only visual difference from the frame (about 200 px in the pixel comparison).
- **Ren's tile, once Ari answers for him:** the pill reads "in" or "off" and its ring turns Lime dark or grey. The picked button gets a ring and the other one greys out.
- **Tip:** "No tip added +" adds a 10% tip on top of the €198, split in proportion to each share. The pill then reads "Tip €19.80 · split by share" with an × to remove it.
- **Light actions:** "Paid by ▾" opens a small picker. The camera adds a mock receipt photo. "Each pays own", "Split equally ▾" and "+ Split out another item" show a toast that says why it isn't part of this demo (e.g. "tonight only the wine is split out").

## 08 Money · 09 Pay · 10 Squared up (calm voice)
- **Surfaces:** flat white and BG, with no paper texture and no red for debts.
- **Balance card:** "You owe €20.00" in Baloo violet, like "Your share" on Log the bill (violet = something waits on you). Once Ari has paid Maya it becomes "You're square with the group" with "Ren owes you €25" under it, because his share sits outside the group balance; once Ren pays too, "You're all square". The same wording is on the Pay sheet, Home and Everyone's balance.
- **Transfer rows:** BG cards with your own row first. Pay is a small violet pill. Paid rows show a Lime-dark ✓ "Paid"; cash shows "Waiting for Maya to confirm".
- **Ren's row:** a quiet white "Requested" pill and "Auto-reminder tomorrow if unpaid". There is no nudge button, because the app does the reminding ("Nobody chases anyone").
- **Friends' payments:** every member has a scripted payment, so whoever ends up owing after the bill (who paid, a tip: Nic owes Maya €2.50 with a 10% tip on Ari's bill) pays once Ari has paid everything she owes. A member who owes nothing just never pays.
- **Counts:** "Simplified · 3 payments instead of 10": 10 is the real unsimplified count (each pair of the five friends, netted across all 23 expenses, owes something). Progress reads "x of 4 payments (incl. Ren)" in the poll-bar shape in Lime, and Squared up says "4 payments (incl. Ren)", so the numbers agree.
- **Everyone's balance:** a collapsed row (new), so the brief's "each person's balance updates" is visible without putting anyone on show. Inside, each person's balance is listed before → now.
- **Recent:** the three newest expenses; "See all (23)" opens the full list.
- **Pay sheet:**
  - The amount block is centred.
  - The phases share one fixed-height area so the sheet doesn't jump: approve in your bank app (a neutral drawing, no bank branding), sending, paid (Lime ✓), waiting for Maya (cash), and failed.
  - Failed is the only red: "Payment didn't go through", with "Try again" and "Pay another way".
- **Squared up:** the one warm moment on the settle side. A Lime circle with an ink ✓ and a soft halo, the six avatars with "all ✓", a summary card ("5 days · 23 expenses · 4 payments (incl. Ren) to close it all"), and "Share a trip recap" / "Plan the next trip". "Plan the next trip" goes back to My trips, where Lisbon is now a past trip; restarting the demo is only in Demo controls.

## Ren's phone (G0, G1, G2) and notifications
- **How Ren joins (review round 2):** Ari invites him from the header "+ Add" (guest for tonight's dinner; "Add Ren & share link" puts the link on the clipboard, with Copy link / WhatsApp / QR beside it). He is "Invited · waiting to join" (a dashed "Ren (Invited)" pill in the header, a line on the dinner card) and can't vote yet. On his phone (G0, mobile web, no app or account) the link shows "Ari invited you to tonight's dinner"; he enters his name and taps Join. Back on Ari's phone a toast says "✓ Ren joined" and he is a guest member with the R monogram. With the group on autopilot this plays by itself: his phone shows 2.2s after the invite, his name types in, Join lands 2.4s later, and Ari's phone is back after 1.5s. Demo controls can open the invite link too.
- **Ren's pages:** look like the mobile web, with an address bar (tripup.app/p/lisbon-dinner for the invite and the poll, tripup.app/pay/lisbon-dinner) and a "Back to Ari's phone" pill drawn like the toast (white, hairline, soft shadow). Ren never has a photo (he joined by link, without the app): he is an "R" monogram everywhere, in the poll, the wine list, the bill and the money tab.
- **The group's notification:** Ari can't get the push for her own poll, so after "Send to group" the Figma push appears with a white "What the group got" label, drawn like the toast. On Ari's phone, its quick-vote chips explain that friends vote from their lock screen.
- **22:30 "Who paid at Cervejaria Ramiro?":** the same notification card, with a violet "Log the bill".

## New copy (where Figma has none)
- **Home:** "Last night in Lisbon"; "You're owed €X" / "You're square with the group · Ren owes you €25" / "You're all square" / "Dinner 20:30 · 4 of 6 voted" / "Dinner 20:30 · not decided"; "October · Squared up ✓"; Profile toast.
- **Plan tab:** "Dinner ends at 22:30 · Skip ahead", "Runner-up · 2 of 6" (after Switch spot), "Picked by chance", "Picked by {name}", "Want to vote for it?", "Nic switched to Ramiro", "Ren · no answer, counted in"; "Next · Dinner at {place} · 20:30"; past days "6 stops · €711.70 spent".
- **Full trip map:** "Next · Dinner 20:30 · place not decided", "Next · Dinner 20:30 · poll live, 4 of 6 voted", "See the poll", "Tickets · €50 · paid by Sam".
- **Explore:** the agent's script ("Hi Ari! I can find something for tonight, for tomorrow morning before you fly, or for your next trip.", "What are you in the mood for?", "Where should I look?", "When is it for?", "And the budget?"), the list blurbs, the "+ Add" rows ("Add to Ideas", "In Ideas · Saved by Maya", "Open · you pick, the group is notified", "A poll is live: add it to the poll instead", "Live · 3 of 4 places · add it", "Tonight's open slots are dinner and drinks, so {place} is one for Ideas").
- **Sheets:**
  - "Name", "Save Ren's plans", "Hide QR code", "Scan to join"
  - "Keep at least 2 places", "Tonight's dinner is already decided", "Tonight's poll is already live"
  - "Spinning…", "Let {name} pick", "Waiting for {name}…"
  - Titles "Suggest a place", "Explore", "Full trip map"; "Up to 4 places per poll", "The poll already has 4 options."
  - "Tap a ★ to add it to a plan or a poll."
  - Explore toasts
- **Bill:** "Tip €19.80 · split by share", "Who paid?" (picker title), "Receipt photo attached".
- **Money and Pay:**
  - "You're square with the group · Ren owes you €25", "You're all square", "Paid · Maya received €20.00", "Waiting for Maya to confirm", "Paid via link"
  - "Everyone's balance", "See all (23)"
  - "Approve in your bank app", "Sending €20.00 to Maya…", "Mark as paid", "Pay €20.00", "Done"
- **Ren's pages:** "Back to Ari's phone", "You're in! We'll tell you where.", "You're all set. Thanks for joining!"; the "What the group got" label.
- **Toasts:** "✓ Ren invited for tonight's dinner · link copied", "✓ Ren joined", "✓ Ren's plans are saved", "✓ {place} added to tonight's plan", "✓ Switched to {place} · the group is notified", "✓ Link copied · tripup.app/p/lisbon-dinner", "✓ {place} saved to Ideas", "✓ {place} added to tonight's poll", "Porto is squared up · nothing left to settle", "Not part of this demo" (only Profile, Plan with AI and Start from scratch).

## Motion and timing (stage 4)
- **Autopilot:** the group's actions run on fixed timers (`src/store/autopilot.ts`), so the demo plays the same way every time.
  - **Votes:** 3s after sending, then about 1.3s apart. Nic switches, then Sam and Ren vote, only after Ari's vote, so Hi-fi 1's "4 of 6" always shows. Nic switches 2.6s after Ari's vote.
  - **No tie on the happy path:** Hi-fi 1 fixes the first four votes (Maya Ramiro, Theo and Nic Taberna, Ari's own), so if Ari picks Taberna, Sam and Ren alone could only make it 3–3. Nic switching to Ramiro makes Ramiro win whatever Ari picks (4–1–1, 4–2 or 5–1; 3 of 5 without Ren). Scripted votes only go to places that are in the poll (Ramiro, or the poll's first place if Ari left it out), and if Ren votes from his link for Ari's place, Theo comes round as well. The 3–3 tie and the dice stay reachable from Demo controls.
  - **Close:** "6 of 6 · closing…" holds for 1.9s.
  - **Wine answers:** about 1s apart. Then, after 5s, the evening moves on to 22:30.
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

**Mixed apostrophes:** some Figma strings use a straight apostrophe (Tonight's guest, Who's having drinks?, It's a tie!) and new copy uses ’. One choice for both would be cleaner.

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
- **Drinks question:** (superseded: "Who's having drinks?" since review round 2, see the Plan tab.)
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
