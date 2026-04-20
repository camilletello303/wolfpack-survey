# 🎾 Wolfpack NJTC — Availability Survey

A mobile-friendly availability survey system for USTA team captains. Players receive a personalized email link, tap their availability for each match date, and responses automatically sync back to the captain dashboard.

---

## How It Works

```
Captain adds dates to Schedule → clicks "Send Availability Survey"
→ Each player gets a personalized email with their unique link
→ Player taps ✓/✗ on their phone → submits
→ Response writes silently to Google Sheet
→ Captain clicks "Sync Responses" → Availability tab updates
```

---

## Setup (one-time, ~10 minutes)

### Step 1 — Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** → folder: **/ (root)**
4. Click **Save**
5. Wait ~2 minutes → your survey URL will be:
   `https://camilletello303.github.io/wolfpack-survey/`

---

### Step 2 — Set up the Google Sheet + Apps Script

1. Go to [sheets.new](https://sheets.new) → name it **"Wolfpack Availability Responses"**
2. Click **Extensions** → **Apps Script**
3. Delete all default code in the editor
4. Open `Code.gs` from this repo → copy the entire contents → paste into the Apps Script editor
5. Click **Save** (floppy disk icon)
6. Click **Deploy** → **New Deployment**
7. Click the gear icon next to "Type" → select **Web App**
8. Fill in:
   - Description: `Wolfpack Survey Handler`
   - Execute as: **Me**
   - Who has access: **Anyone**
9. Click **Deploy**
10. Click **Authorize access** → sign in with your Google account → Allow
11. Copy the **Web App URL** (looks like `https://script.google.com/macros/s/ABC.../exec`)

---

### Step 3 — Paste the URL into your Captain Dashboard

1. Open your captain dashboard (`usta_captain_dashboard_v6.html`)
2. Go to **Calendar Sync** tab
3. Paste the Web App URL into the **"Apps Script URL"** field
4. Click Save — you're done!

---

## Sending Surveys

1. Add match dates to the **Schedule** tab (opponent/location not required yet)
2. Go to **Availability** tab → click **"Send Availability Survey"**
3. Select the league (18 & Over / 40 & Over)
4. Review the pre-written emails → click **Send All**
5. Post in your group chat: *"Check your email — availability survey is out!"*

---

## Syncing Responses

1. Go to **Availability** tab
2. Click **"Sync Responses"**
3. The app reads the Google Sheet and updates all player availability automatically
4. A summary shows: `"11 of 14 players responded · 3 pending"`

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | The player-facing survey page (hosted on GitHub Pages) |
| `Code.gs` | Google Apps Script — paste into your Google Sheet |
| `README.md` | This file |

---

## Player Experience

Players receive an email like:

> **Subject:** 🎾 Wolfpack — 18&Over Availability Survey
>
> Hi Justine! Tap the link to mark your availability for the 2026 season (takes ~30 seconds):
>
> **[Open Your Survey →]**
>
> — Your captain

They tap, see their name and all dates pre-loaded, tap ✓/✗ for each, hit Submit. Done.

---

## Troubleshooting

**"Survey not found" error** — The link is missing required parameters. Re-send from the captain dashboard.

**Responses not syncing** — Make sure your Apps Script is deployed as a Web App with "Anyone" access. Try re-deploying with a new version.

**GitHub Pages not showing** — It can take up to 10 minutes after the first deployment. Check Settings → Pages for the live URL.
