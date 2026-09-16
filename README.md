# Waterloo LEARN Assignment Dashboard

A small browser extension that adds a consolidated assignment and due-date panel to `learn.uwaterloo.ca`.

The extension uses the authenticated Brightspace API available within your existing LEARN session. It does not ask for, read, or store your Waterloo password.

## Download

1. Open the [GitHub Releases page](https://github.com/gurshh-rain/uwlearn_assignment_extension/releases).
2. Open the newest release.
3. Under **Assets**, download `waterloo-learn-assignment-dashboard.zip`.
4. Extract the downloaded ZIP. Do not try to load the compressed ZIP directly into the browser.

The extracted extension folder should contain `manifest.json`, `content.js`, `background.js`, `calendar-service-config.js`, and `styles.css` at its top level.

## Install in Chrome, Edge, Brave, or another Chromium browser

1. Open the browser's extension management page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the extracted extension folder containing `manifest.json`.
5. Open or refresh [Waterloo LEARN](https://learn.uwaterloo.ca/).
6. The **Assignments** panel should appear in the top-right corner.

Keep the extracted folder on your computer after installation. If you move or delete it, the browser may no longer be able to load the extension.

## Install temporarily in Firefox

1. Extract the release ZIP.
2. Open `about:debugging#/runtime/this-firefox`.
3. Select **Load Temporary Add-on**.
4. Choose `manifest.json` from the extracted folder.
5. Open or refresh [Waterloo LEARN](https://learn.uwaterloo.ca/).

Firefox removes temporary add-ons when the browser closes. Repeat these steps after restarting Firefox. Permanent installation requires publishing and signing through Mozilla Add-ons.

## Install temporarily in Safari 26

1. Extract the release ZIP.
2. Open **Safari → Settings → Advanced** and enable **Show features for web developers**.
3. Open the **Developer** settings tab.
4. Select **Add Temporary Extension** and choose the extracted extension folder.
5. Allow the extension to access `learn.uwaterloo.ca` when Safari asks.
6. Open or refresh [Waterloo LEARN](https://learn.uwaterloo.ca/).

Temporary Safari extensions may need to be added again after Safari restarts. Older Safari versions require packaging the project as a Safari Web Extension with Xcode.

## Updating

1. Download and extract the newest release ZIP.
2. Replace the old extracted extension files with the new files.
3. Return to the browser's extension page and select **Reload** for the extension.
4. Refresh Waterloo LEARN.

## Behavior

- Loads visible assignments from active course offerings.
- Sorts assignments by due date and keeps assignments without dates at the bottom.
- Labels overdue, due-today, due-tomorrow, upcoming, and submitted work.
- Detects submissions from the signed-in student's Brightspace assignment history.
- Provides a **Done** checkbox that crosses out assignments and persists across browser sessions.
- Saves private manual notes beneath individual assignments in browser storage.
- Switches between the assignment list and a navigable built-in month calendar.
- Keeps the panel collapsed while navigating between pages inside LEARN.
- Calculates Today, Tomorrow, and day-count tags without daylight-saving off-by-one errors.
- Moves submitted and manually crossed-out assignments below remaining work.
- Excludes completed work from upcoming and overdue counts.
- Links each item to its assignment page in LEARN.
- Offers separate **iCalendar download** and **Google Calendar** options.
- Adds each dated assignment as a one-hour block ending at its deadline.
- Refreshes only when the panel first loads or when **Refresh** is selected.

If some courses cannot be read, the panel displays the number that failed while still showing assignments from the other courses. Assignments without due dates are not sent to calendars.

## Dashboard views and notes

- Select **List** to use the assignment checklist, add or edit private notes, and open assignment links.
- Select **Calendar** to see dated assignments in a month grid. Use **Previous**, **Today**, and **Next** to navigate.
- Notes are stored only in browser extension storage. A gold edge on a calendar event indicates that the assignment has a note; hover over the event to read it.
- The selected List or Calendar view is restored the next time LEARN opens.

## Calendar options

Select **Export** in the assignment panel, then choose:

- **iCalendar download** to save every dated assignment in one `.ics` file.
- **Google Calendar** to publish a private calendar feed and open Google Calendar with the subscription ready to add.

The Google option works like UW Flow and does not require Google OAuth. On first use, confirm the prepared calendar inside Google Calendar. The extension updates the same private feed whenever LEARN opens; Google controls how quickly subscribed calendars refresh.

The Google option never downloads a file. If the hosted service is unavailable, it opens Google Calendar without a feed and displays an error in LEARN. The separate **iCalendar download** option is the only action that downloads an `.ics` file.

## Enable the hosted calendar feed

The `calendar-service` directory contains a Cloudflare Worker and D1 service designed for Cloudflare's free tier. This package is configured to use the deployed service at `https://uwlearn-calendar-feed.gurshaan1124.workers.dev`. Follow the [deployment guide](calendar-service/README.md) only when deploying a replacement service.

## Calendar-feed privacy

Before the first hosted calendar upload, the extension displays the data it will send and requires affirmative consent. The service stores assignment names, course names, due dates, and LEARN assignment links. Each feed has a random 192-bit public identifier, and its separate update token remains in browser extension storage. Anyone who obtains the feed URL can read that calendar, so users should treat it as private. Feeds expire one year after their last update and are removed by a daily cleanup job.

See the full [Privacy Policy](PRIVACY.md).
