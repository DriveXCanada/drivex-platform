# App Briefing — Source Material for a Training Manual

## Instructions for Claude (read this first)

You are being given a complete description of a web application. Your job is to
**write a clear, friendly training manual** that a food bank can hand to its
volunteers and managers so they can learn to use the app with no technical
background.

Please produce a manual that:

- Is written in **plain, warm, non-technical language** (many users are
  volunteers, some older, not tech-savvy).
- Is organized into **short sections with headings**, and uses **numbered
  step-by-step instructions** for every common task.
- Has a **"Quick Start for New Volunteers"** section near the front covering the
  3–4 things they'll do most (log in, help a client shop, log a donation, do a
  stock count).
- Has a separate **"For Managers"** section covering the admin-only tasks.
- Includes a **glossary** of the key terms (credits, points, stock count,
  write-off, delivery order, etc.).
- Includes a **troubleshooting / FAQ** section.
- Uses callout tips like **"Tip:"** and **"Important:"** where helpful.
- Avoids inventing features that aren't described below. If something isn't
  covered here, don't make it up — either leave it out or add a note like
  "check with your manager."

Output the manual in clean Markdown so it can be printed or pasted into a
document. Aim for something a real person could follow at the counter on their
first shift. You can reformat, reorder, and expand the material below into
proper training language — it does not need to mirror this document's structure.

---

## About the App

**Name:** VETS Canada — Dartmouth Food Bank management app
**Tagline shown in the app:** "Proudly Supported by DriveX"
**Purpose:** Runs the day-to-day operations of a veterans' food bank — client
records, inventory, client "shopping" visits, donations, reporting, and a
home-delivery ordering system for approved clients.
**Charity registration number** (appears on tax receipts and reports):
828604041RR0001

The app runs in a web browser (works on computers, tablets, and phones). Staff
sign in to a dashboard; approved clients can sign in to a separate, simpler
"delivery portal" to place orders.

---

## Key Concepts (explain these in the glossary)

- **Credits (also called points):** A budget system. Each client family gets a
  monthly **credit budget**. Items in the catalog "cost" a number of credits.
  When a client shops, the items they take subtract from their budget. This
  keeps distribution fair.
- **Credit budget formula:** A family's budget is **60 credits, plus 5 for each
  additional household member** (so a single person = 60, a family of 3 = 70).
  The app calculates this automatically but a manager can override it.
- **One visit per month:** Families are expected to shop once per calendar
  month; credits don't roll over. The app shows a warning if a client has
  already shopped this month.
- **Item points:** Every item costs a certain number of credits. By default the
  cost comes from the item's **category** (e.g. everything in "Canned Meat"
  might be 1 credit), but a manager can set a **custom point value on an
  individual item** to override the category default.
- **Shop limit:** A manager can cap how many of a single item one client may
  take per visit (e.g. limit "Peanut Butter" to 2), so nobody uses their whole
  budget on one product.
- **Stock count (audit):** A physical count of what's actually on the shelves.
  Submitting a count **sets** the inventory to the counted number (the physical
  count is treated as the truth) and records any discrepancy vs. the system.
- **Write-off:** Recording items removed from stock because they're spoiled,
  expired, or otherwise unusable.
- **Delivery order:** An order placed by a delivery-approved client through the
  client portal, which staff then "fulfill" (shop and deliver).

---

## Who Uses It (Roles)

1. **Managers** — full access to everything, including settings, reports,
   volunteer accounts, and money/donation records.
2. **Volunteers** — day-to-day helpers. A manager grants each volunteer specific
   permissions (see below), so different volunteers can have different access.
3. **Delivery clients** — approved clients who log into a separate simple portal
   to place their own delivery orders. They never see staff screens.

### Volunteer permissions a manager can grant (each is on/off per volunteer)
- **Clients** — view/manage client records
- **Inventory** — edit stock levels
- **Items** — manage the catalog (items, categories, prices, points)
- **Reports** — view the reporting suite
- **Expenses** — record spending
- **Entries** — fix/correct past entries
- **Donors** — manage donors and money donations
- **Orders** — handle delivery orders
- **Export** — download data and backups

Everyone who is signed in (any volunteer or manager) can do the everyday
counter tasks: client visits, logging donations, stock counts, write-offs, and
the schedule. The permissions above only gate the **admin** areas.

---

## Signing In

- Staff sign in with their **name/account and a PIN**.
- The default manager account starts with **PIN 0000** and is required to change
  it on first login.
- New volunteers are created by a manager and may be required to set a new PIN
  the first time they log in (a "change PIN" screen appears).
- Sessions stay signed in on that device until logout.

**Tip for the manual:** Tell users to always **log out on shared computers**.

---

## The Main Menu (Navigation)

Across the top, staff see links (some only appear if the user has permission):

- **Home** — dashboard / at-a-glance stats
- **Client Visit** — help a client shop
- **Log Donation** — record incoming stock
- **Stock Count** — count the shelves
- **Write-Off** — record spoiled/removed items
- **Schedule** — appointments, shifts, availability
- **My Availability** — mark when you can work
- **Admin** (managers/permitted volunteers): Clients, Baskets, Inventory, Items,
  Volunteers, Orders, Donors, Expenses, Corrections, Export, Reports

---

## Everyday Tasks (used by all staff)

### Helping a Client Shop (Client Visit)
1. Open **Client Visit**.
2. Search for the client by name or Client ID and select them. (You can also
   start a visit directly from their appointment on the Schedule.)
3. The app shows their **credit budget**. If they've already shopped this month,
   a warning appears — only continue if a manager approves.
4. Browse the catalog. **Categories are collapsible** — tap a category to open
   it (or use the search box to find an item; searching auto-opens categories).
   There are **Expand all / Collapse all** buttons.
5. Use the **+ / –** buttons to add items to the cart. Each item shows its
   **point cost** and how many are in stock. If an item has a **shop limit**,
   the + button stops at that limit.
6. A running bar at the bottom shows **Used / Budget / Remaining** credits.
7. If a **gift card** was given to the client, add it in the "Gift Cards Given"
   section (store + amount; you can add several).
8. Add notes if needed, then **Confirm Visit**. This records the visit and
   subtracts the items from inventory.

**Important:** Confirming a visit permanently records it and reduces stock.

### Logging a Donation (incoming stock)
1. Open **Log Donation**.
2. Optionally choose the **donor** it came from (for donor reports).
3. Enter quantities for the items donated; you can set an **expiry date**.
4. Submit — this **adds** the items to inventory.

### Doing a Stock Count
1. Open **Stock Count**.
2. Optionally filter to one category.
3. Enter the **actual counted quantity** for each item you're counting. You can
   also **type in a brand-new item** to add it on the spot.
4. Submit. The counted number **becomes** the new inventory level, and any
   difference from the system is recorded as a discrepancy.

**Tip:** You only need to enter numbers for the items you actually counted.

### Recording a Write-Off (waste)
1. Open **Write-Off**.
2. Enter the quantity being removed and a reason (e.g. expired, damaged).
3. Submit — this reduces inventory and keeps a record for reporting.

### Schedule & Availability
- **Schedule** shows a weekly calendar with **client appointments**, **staff
  shifts**, and **team availability**.
- Client appointments show a **⚠ Allergy** flag if that client has one on file.
- Each appointment has a **🛒 Start Visit** button (jumps straight into shopping
  for that client) and the client's **name is a link to open their file**.
- **My Availability** lets each volunteer/manager mark the days and times they
  are **available** or **not free**; those show up on the shared Schedule so
  managers can plan shifts.

---

## Admin Tasks (managers, or volunteers with the matching permission)

### Clients
Manage everyone the food bank serves.
- Add a client with **first and last name**, and head-of-household details:
  **date of birth, gender, member status (Serving / Retired / not specified),
  contact number, email, service number, address**, an **allergy flag** (tick
  the box and type what it is — this warns staff on the schedule), and
  compliance checkboxes for **Code of Conduct** and **Terms of Service**.
- **Credits auto-calculate** from household size (editable).
- **Delivery approved** + a **portal PIN** lets the client log into the delivery
  portal.
- **Family members:** add each household member with **name, relation to the
  client, date of birth, and gender**.
- **Authorized pickups:** list people allowed to collect on the client's behalf
  (name, relationship, contact, notes).
- **Holiday baskets:** log baskets given to a client (e.g. Christmas, Easter,
  Back to School) by occasion and year.
- **History:** see the client's past visits.
- Clients can be **archived** (with a reason) or permanently **deleted**.
- The next **Client ID** is auto-suggested.

### Holiday Baskets (standalone page)
Log and track holiday baskets across all clients, and filter by holiday, year,
or client.

### Inventory
- Items are **grouped by category** (collapsible) and listed **alphabetically**.
- Edit each item's **quantity**, **expiry date**, and **shop limit**.
- Shows **total value** and **total weight** of current stock (useful for
  insurance and government reporting).
- Colored flags for **low stock** and **expiring soon**; extra sorts for
  soonest-expiry and lowest-stock.

### Items & Categories (the catalog)
- Create/edit/reorder **categories** (name + default point value).
- Create/edit/reorder **items** (name, average price, weight, and an optional
  **per-item point value** that overrides the category default).
- Add **store prices** per item; the app **averages** them to set the item's
  price.
- **Disable** an item (hides it from shopping but keeps history) or **delete**
  items/categories outright. Deletion is blocked if the item appears in past
  records (to protect reports) — disable it instead.
- "Reset to Default List" reloads the standard catalog (clears current items and
  stock history — managers only, used rarely).

### Volunteers (managers only)
- Create volunteer/manager accounts and set/reset PINs.
- Grant each volunteer their **permissions**.
- Record volunteer **profile** info (emergency contact, availability, strengths)
  and **log hours**; print a volunteer report.

### Delivery Orders
- Shows orders submitted by delivery-approved clients through the portal.
- **Fulfilling** an order records it as a client visit and **deducts
  inventory** so a volunteer can shop and deliver it.
- If a client **requested a gift card**, it's flagged on the order (with a note
  that gift cards are not guaranteed).

### Donors & Money Donations
- **Donor registry** (like clients): add donors and see totals donated.
- Printable **donor reports**.
- Log **cash, e-transfer, and gift card** donations, with a **tax-receipt**
  option that captures the donor's contact/mailing details and produces a
  printable official receipt showing the **charity number 828604041RR0001**.

### Expenses
Record money spent (date, category, description, vendor, amount) for budgeting
and reporting.

### Entries & Corrections
Fix or remove entries made in error (whole entries or individual lines).

### Data Export & Backups
- Download **any table as a CSV** (clients, family members, authorized pickups,
  inventory, transactions, donors, donations, gift cards, holiday baskets,
  expenses, appointments, shifts, availability, volunteer hours).
- **Full Master Backup:** downloads **every table at once as a single ZIP**.
- **Automatic hourly backup:** a small **💾 Backup** button (bottom-right) can be
  switched on to auto-save a full backup to that computer's Downloads folder
  every hour while the app is open — meant to run on one "master" computer.

### Reports (a large suite of tabs)
Most reports have a date range (Today / This Week / This Month / Custom):
- **Client Visits**, **Value by Client**
- **Top Items**, **Most Needed**
- **Shopping List by Store** — low/out-of-stock items matched to the **cheapest
  store** from recorded prices, grouped by store (printable).
- **Inventory Levels**, **Expiry**
- **Donations**, **Donations by Donor**
- **Gift Cards Given**, **Write-Offs**
- **Audit / Discrepancy**, **Points Usage**, **Volunteer Activity**
- **Client Activity** — visit frequency and who hasn't been in for a while.
- **Expenses**
- **Family Demographics** — active families **with vs. without children**
  (under 18), a **people-by-age-group** breakdown, and member-status and
  family-size distributions.
- **Custom Filter** — build your own client report by combining filters (client
  status, member status serving/retired, children in home, allergy flag,
  delivery approved, Code of Conduct / Terms completed, min/max family size),
  with live counts of families, people, and how many have children.

---

## The Client Delivery Portal (for approved clients)

Approved clients open a separate, simple portal and:
1. Sign in with their **Client ID and portal PIN**.
2. Shop from the catalog (collapsible categories, item points, stock limits),
   staying within their **credit budget**.
3. Optionally tick **"Request a gift card"** and type what they're looking for
   (with a clear note that **gift cards are not guaranteed**).
4. **Submit the order**, which appears on the staff **Delivery Orders** screen.
5. See the status of their **recent orders**.

---

## The Dashboard (Home) — what managers see

- **Lifetime impact:** veterans served (all-time), total people served
  (including family members), total dollar value distributed, total weight of
  food distributed.
- **Monthly credits:** credits expected to be used this month vs. credits worth
  of food currently on hand, and a coverage percentage.
- **Membership:** how many active clients are **Serving**, **Retired**, or not
  specified.
- **This week:** clients served, items distributed, low-stock count, expiring-
  soon count.
- **Expiring soon** list and a **Check-In Needed** list (active families who
  haven't visited in a while).

---

## Notes & Good Practices (weave into the manual)

- Physical **stock counts overwrite** the system quantity — count carefully.
- **Confirming a visit / donation / write-off is permanent** and changes stock;
  corrections are done through **Entries & Corrections**.
- Keep client **birthdates and family details** up to date — several reports
  (demographics, age groups, children) depend on them.
- Turn on the **hourly backup** on one trusted computer and leave the app open
  there.
- Money/donation and tax-receipt features are typically **manager** territory.

---

## Suggested Manual Structure (you may adapt)

1. Welcome & what this app is for
2. Glossary of key terms
3. Signing in and out
4. Quick Start for New Volunteers (the everyday tasks)
5. Helping a client shop (detailed)
6. Logging donations
7. Stock counts and write-offs
8. Using the schedule and marking your availability
9. For Managers: clients, inventory, catalog, volunteers, orders, donors,
   expenses, reports, backups
10. The client delivery portal (and how to approve a client for it)
11. Troubleshooting / FAQ
12. Quick reference card (one page of the most common steps)
