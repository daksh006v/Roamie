# Roamie — Expenses System: Complete Spec

Mental model the whole system is built around:

> I paid for something → I choose who shared it → Roamie handles the rest.

Everything below — every screen, every field, every backend function — exists to protect that one sentence. If a feature would make the user do arithmetic, or make them explain something Roamie could have inferred, it's wrong.

---

## 1. Information architecture

Two layers, on purpose:

- **Main page** — answers "how are we doing" and "what do I owe / am I owed" at a glance, plus the one action people do constantly: add an expense.
- **Menu (behind a header icon, not a slide-out drawer)** — every deeper view: full history, everyone's balances, spending breakdown, full settlement list, tags, receipts.

Why not a real drawer: in React Navigation terms, a side drawer is an app-level nav pattern (switching Rooms, account settings). Using one for a single tab's sub-pages fights that mental model and adds a swipe gesture that's easy to trigger by accident mid-scroll through an expense list. Instead, the menu opens as a bottom sheet (or a pushed stack screen) from a `⋮` icon in the Expenses header. It's scoped to "more views of this trip's money," which is what it actually is.

Menu ordering is deliberate, not alphabetical — sorted by how often a person actually opens each one:

1. **My expenses** — "do I owe anyone"
2. **All expenses** — the complete Room history; the main page only ever shows 3–4 recent cards and My Expenses is scoped to one person, so this is the actual full-history view (section 8.1a)
3. **Everyone** — "who owes whom, in detail" — the full destination behind the main page's Who Owes Whom "View all" link; see the debt management doc, section 6, for the full per-person breakdown this page shows (expenses paid, balances, owes/owed-to lists, Paid buttons)
4. **Spending breakdown** — transparency/curiosity, opened less often
5. **Tags** — closer to a search tool than something browsed
6. **Receipts** — same
7. **Trip budget** (Owner only, settings-adjacent) — sits below a divider, separate from the money-viewing items above it

Settlements and Everyone's Balances, as two separate flat pages, are deliberately not built — they'd both just be different slices of the same underlying per-person data, and splitting them forces a person to open two pages to answer one question ("what's Vineet's situation"). See the debt management doc for why they're merged.

---

## 2. Main Expenses page

Top to bottom:

### 2.1 Header
- Trip name (small, muted)
- "Expenses" title
- `⋮` icon → opens the menu described in section 8

### 2.2 Summary card
One card, two halves — the person opening this page usually wants both "how's the trip doing" and "where do I personally stand," so both live in the same glance instead of the second one being buried a tap away.

**Top half — trip total** (if the Owner has set a Room budget):
```
₹18,420
Trip total spent

████████████████░░░░  73.7% used
₹6,580 of ₹25,000 remaining
```
If no budget is set, just the total, no bar.

**Bottom half — your spending**, separated by a thin divider:
```
YOUR SPENDING

You paid              Still outstanding
₹6,200                ₹700

₹1,300 already settled
```
This reuses the gross/outstanding split from section 9.1 rather than inventing a new number: "You paid" is `totalPaid` (money that actually left the user's pocket — the same figure the personal budget tracks, section 8.8); "Still outstanding" is the user's own `outstandingBalance` (what's actually left to settle, after any already-`settled` records are netted out); "already settled" is the delta between their `grossBalance` and `outstandingBalance`, shown only when non-zero.

Both halves recalculate immediately on any expense or settlement change (section 10). No manual refresh.

### 2.3 Recent expenses
The 3–4 most recent expense cards only (see section 6 for card contents), with a **"See all →"** link in the section header that opens the All Expenses page (section 8.1a). This is intentionally not a full feed — Chat already receives an activity message for every new expense (section 7.1), so the main page doesn't need to double as a history log.

### 2.4 Who owes whom
Grouped **by person**, not by individual transfer — see the debt management doc, section 3, for the full design and why. Each debtor gets one collapsed card showing their name and total owed; tapping expands it to reveal every person they owe, each with its own **Paid** button (debtor-only — see debt management doc, section 4). Cards are sorted biggest-total-owed first, and capped to the top 3–4 on the main page, with **"See all →"** below into the Everyone page (section 8.2), which shows the same information for every person, in full, alongside their expense history.

### 2.5 Add Expense (floating action button)
A FAB, not a full-width button buried at the bottom of a scrolling list. Adding an expense is the single most frequent action in this whole system, often done in the moment (at a restaurant table, right after paying a cab) — it needs to be reachable without scrolling, regardless of how long the expense list has grown.

---

## 3. Add Expense flow

Six short steps, not one long form. Every default is chosen so the common case (a shared trip expense) takes the fewest possible taps.

**Step 1 — What was it for**
- Title (text)
- Amount (numeric, ₹)
- Paid by — defaults to the current user; tapping opens a member picker
- Category — single-select from the fixed list (section 4)

**Step 2 — Tags (optional)**
- Predefined chips (#food, #stay, #transport, etc. — full list in section 5) plus a "+ Create custom tag" option
- Capped at 3–5 tags so it never turns into a taxonomy exercise
- Fully skippable

**Step 3 — Who shares it**
- Opens with **every Room member checked** and **Equal split selected** — the zero-tap default, since most trip expenses are shared by the whole group
- User can uncheck anyone
- Live count: "6 people selected"
- Toggle: **Equally** (default) / **Custom**

**Step 3a — Equal split (default path)**
Roamie computes and displays the per-person amount immediately:
```
₹2,400 ÷ 6 people
₹400 each
```
No manual math, ever.

**Step 3b — Custom split**
Per-person rupee input fields, running total shown live:
```
₹2,300 assigned
₹100 remaining
```
The **Next** button stays disabled until assigned amounts exactly equal the total — validated on both the client (immediate feedback) and the server (source of truth, see section 11). Percentage-based splitting is explicitly out of scope for v1; only direct rupee amounts.

**Step 4 — Receipt and note (optional)**
- "+ Add Receipt" → Take Photo / Choose from Gallery
- Optional free-text note
- Both skippable with one tap forward

**Step 5 — Review**
Read-only confirmation screen showing exactly what will post: title, amount, category, tags, payer, and the full per-person breakdown. This is the last chance to catch a mistake before it hits the ledger and fires a chat message.

**Step 6 — Add Expense**
On confirm, the pipeline in section 10 runs.

---

## 4. Categories

Fixed, small, non-extendable list (organizational + used for the Spending Breakdown view):

`Stay · Food · Transport · Activities · Tickets · Shopping · Fuel · Drinks · Other`

Every expense has exactly one category. Categories never affect balances or splits — purely organizational.

---

## 5. Tags

- Predefined: `#stay #food #transport #activity #tickets #shopping #fuel #drinks #booking #breakfast #lunch #dinner`
- Custom tags allowed (e.g. `#scuba`, `#villa`) — created inline during Step 2 of Add Expense
- Multiple tags per expense, capped at 3–5
- **Tags are metadata only.** They must never factor into any balance, split, or settlement calculation — enforced as an invariant in the backend, not just a UI convention (see section 11)
- Used for: filtering the main list, the Tags menu page (section 8.5), and the Spending Breakdown page

---

## 6. Expense card (collapsed, list view)

Shown on the main page and inside My Expenses / the full list. Deliberately minimal — not every field:

```
🏨 Hotel
₹9,000
Paid by Vineet
Shared by 6 people
#stay #booking
Your share: ₹1,500
                                ⋮
```

Fields: title, amount, payer, share-count, tags, current user's own share (only shown when relevant — omitted if the current user isn't in the split), and a `⋮` menu for edit/delete. Receipt presence shown as a small indicator icon, not the image itself.

Tapping the card (not the `⋮`) opens the full Expense Details screen.

---

## 7. Expense details screen

Full, unabridged view of one expense:

- Title, amount
- Paid by
- Shared by — every person's exact rupee share, listed
- Category
- Tags
- Note
- Receipt image, if attached
- Added — date and time
- `⋮` → Edit / Delete (permission-gated, section 11)

This is the screen that makes the split fully auditable — a user should never have to trust a number without being able to see exactly how it was built.

### 7.1 Chat integration
After an expense is added, Roamie posts a rich message into Room Chat:
```
💰 Daksh added an expense
Dinner at Thalassa
₹2,400 · Paid by Daksh · Split between 4
View Expense →
```
Only meaningful events post to Chat (new expense). Recalculations, edits to tags, or minor field updates do **not** spam Chat with a message each time — only the creation event does, plus optionally a distinct "edited" system message if the amount or split materially changed.

---

## 8. The menu (deeper views)

### 8.1 My Expenses
Answers: *how much did I personally pay, what was my share, what's my net position?*
```
You paid        ₹6,200
Your share      ₹4,750
Net             +₹1,450   (you are owed ₹1,450)

Your payments:
Hotel     ₹3,000
Dinner    ₹1,200
Cab         ₹800
Scuba     ₹1,200
Total     ₹6,200
```
If the user has set a personal budget (section 9 in the earlier plan / now folded here), it's shown at the top of this page too — not just buried in a menu, since this is the page someone opens specifically to check their own money.

### 8.1a All Expenses
The complete Room expense history — every card, not just the 3–4 recent ones on the main page, and not scoped to one person the way My Expenses is. Supports:
- Filter chips: `All · You · Food · Stay · Transport · Activities · ...`
- Tag filtering (e.g. tapping `#scuba` shows every expense tagged with it)
- Search by title

This is what makes the information architecture complete — without it there's a gap between "3-4 recent" and "your own expenses only," with no page that just shows *everything*.

### 8.2 Everyone
The full per-person breakdown — one expandable card per Room member, each showing what they paid (with tags), their balances, and who they owe / are owed by, with debtor-only Paid buttons on the actionable edges. This is the main page's "See all" destination for Who Owes Whom, and fully specified in the separate debt management doc (section 6), including exactly why it replaces what would otherwise be two disconnected pages (a flat settlements list and a flat balances table).

### 8.3 Spending breakdown
Total spend grouped by category, with tag filtering:
```
₹18,420 total
Stay        ₹9,000
Food        ₹4,200
Transport   ₹2,220
Activities  ₹2,500
Other       ₹500
```

### 8.4 Tags
Every tag with its total spend; tapping a tag filters to its expenses:
```
#scuba   ₹3,800
#food    ₹4,200
#stay    ₹9,000
```

### 8.5 Receipts
Grid of every receipt image uploaded in the Room; tapping one opens its parent expense.

### 8.6 Trip budget (Owner only)
```
Trip Budget
How much do you expect the whole trip to cost?
₹ [ 25,000 ]
[ Save Budget ]
```
- Optional — the app works fully without one
- Never blocks adding an expense, even once exceeded
- Editable by the Owner at any time; **changing it never touches existing expenses**, only the displayed percentage

### 8.7 Personal budget
Reached from My Expenses or a `⋮` next to the Room budget summary on the main page. Separate from the Room budget — applies only to the individual, has zero effect on Room totals.

**Personal budget tracks money the user personally paid — `totalPaid` — not their calculated share.** These are different concepts and mixing them up would be confusing: if Daksh paid ₹6,000 for a hotel but his own share of it is only ₹3,500, his personal budget usage is ₹6,000 (that's the money that actually left his pocket, most of which he'll get back from others), not ₹3,500 (that's his responsibility toward the trip, a separate number already visible in My Expenses). Personal budget answers "how much of my own money have I put out," not "how much of the trip is mine to pay for."

```
My Budget
₹10,000
₹7,200 spent · 72% used
```
If exceeded, Roamie sends a **private** push notification to that user only:
```
Personal budget exceeded
You have spent ₹10,450.
Your budget was ₹10,000.
```
Never broadcast to the Room. The user can turn this off in Notification Settings → Personal Budget Alerts.

---

## 9. Settlements — see the debt management doc

The gross-vs-outstanding balance model, the pairwise-vs-simplified settlement views, the grouped "who owes whom" cards, the debt-clearance ("Paid" button) workflow, and the settlement-specific recalculation and data-model details are all covered in full in the separate **Roamie Debt Management** doc — that's the canonical source for all of it, kept in one place so it doesn't drift out of sync with itself across two files. The short version, for context on everything else in this doc: balances split into gross (from expense history) and outstanding (gross minus already-settled money); "who owes whom" is grouped per person with a debtor-only Paid button; and the Everyone page (section 8.2) is where the full detail lives.

## 10. Recalculation pipeline

Every create, edit, or delete of an Expense triggers the same sequence, synchronously, before the API responds:

1. Recompute affected members' gross balances (`calculateBalances`)
2. Net gross balances against every already-`settled` Settlement record to get outstanding balances (`getOutstandingBalances`) — this is what makes step 3 immune to resurrecting paid-off debt
3. Recompute the pairwise ledger (`calculatePairwiseDebts`) — always from raw expenses, this one never changes based on settlements
4. Recompute the simplified settlement list from **outstanding**, not gross, balances (`simplifyDebts(toBalanceMap(outstanding))`) — existing `settled` settlement records are left as-is; only `pending` ones are replaced
5. Recompute Room total spend and budget percentage
6. Recompute the current user's personal expense summary (their `totalPaid`, see section 8.7) and personal-budget percentage (and fire the private over-budget notification if the threshold is newly crossed)
7. Recompute category and tag totals for the Spending Breakdown / Tags pages
8. On create only: post the rich Chat message (section 7.1)

Deleting an expense removes its financial contribution completely — no stale balances, no orphaned settlement rows left pointing at numbers that no longer add up.

**Marking a settlement as Paid runs the same steps 1–4** (no expense changed, so steps 5–7 are skipped, and step 8 is replaced by the "✅ settled" Chat message instead of the expense one) — full detail in the debt management doc, section 8.

---

## 11. Data integrity and authorization

Enforced on the **backend**, never only in the UI:

- No negative expense amounts
- Custom split totals must equal the expense total exactly (to the paisa) before the record is accepted
- Every `userId` inside an expense split or a settlement must be a current member of that Room
- Settlements only ever exist between two members of the same Room
- Every expense/settlement request is authorized via: `JWT → Room membership → role → permission → action` — the same boundary as the rest of Roamie
- Editing/deleting another member's expense requires the `manageExpenses` permission (Owner always; Admin only if the Owner has granted it in Role Permissions)
- Tags and categories are validated as metadata-only — no code path may let them influence a balance or split calculation

---

## 12. Data model

```js
Expense {
  roomId,
  title,
  amount,
  category,
  paidBy,
  splits: [{ userId, amount }],
  tags: [],
  note,
  receiptUrl,
  createdBy,
  createdAt,
  updatedAt
}

Settlement {
  roomId,
  fromUser,
  toUser,
  amount,
  status: "pending" | "settled",
  createdAt,
  settledAt,
  settledBy       // debtor's own userId under normal use; an Owner/Admin
                   // userId only when they used the dispute-resolution override
}

Room.budget: {
  amount,
  currency: "INR"
}

PersonalBudget {
  roomId,
  userId,
  amount
}
```

`Settlement` documents are what the app persists for the *simplified* view (so `settled` ones survive a recompute and continue to net against gross balances via `getOutstandingBalances` — see the debt management doc, section 1); the pairwise ledger and per-user balances are cheap enough to compute on demand from the `Expense` collection rather than persisted separately.

---

## 13. Settlement engine (implementation)

Already built as `settlementEngine.js` (pure functions, no DB access — called by the recalculation pipeline above). Full detail and design rationale for the settlement-specific functions is in the debt management doc — brief reference here:

- `calculateBalances(expenses, memberIds)` → per-user `{ totalPaid, totalShare, grossBalance }` — expense history only, no knowledge of settlements
- `getOutstandingBalances(grossBalances, settlements)` → nets already-`settled` records out of gross, producing `outstandingBalance` — this is the number that actually drives new settlement generation
- `toBalanceMap(balances, field)` → small adapter from the balances object shape to the plain `{ userId: amount }` map `simplifyDebts` consumes
- `calculatePairwiseDebts(expenses)` → the traceable, always-exact ledger (always gross — pairwise doesn't need the settled-money adjustment the same way, since it's a historical record, not a to-do list)
- `simplifyDebts(balanceMap)` → the greedy min-transaction list for the main page — **always call with outstanding balances**, never gross, or settled debt reappears
- `groupSettlementsByDebtor(settlements)` / `groupSettlementsByCreditor(settlements)` → fold the flat simplified list into per-person owes/owed-by cards (main page and the Everyone page, section 8.2)
- `buildPersonSummary(userId, ...)` → assembles one person's full Everyone-page card (expenses paid, balances, owes/owed-by) in one call
- `getSettlementExplanation(fromUser, toUser, expenses, settlementAmount)` → the "Why?" data, including `isExact`

All internal math runs in paise via `toPaise` / `toRupees` to avoid floating-point rounding errors when summing many small shares — a real risk in a group-splitting app where amounts get divided by 4, 6, 7 people and rarely land on a clean rupee.

---

## 14. End-of-trip behavior

When a Room is marked Completed:
- All expenses, settlements, receipts, spending breakdown, and personal history remain fully viewable — nothing is deleted or archived out of reach
- New expenses are disabled by default (unless the product later allows explicitly reopening a completed trip), so the historical numbers stay trustworthy and can't drift after the fact
