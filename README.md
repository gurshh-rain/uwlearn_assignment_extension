# Waterloo LEARN Assignment Dashboard

A small browser extension that adds a consolidated assignment and due-date panel to `learn.uwaterloo.ca`.

The extension uses the authenticated Brightspace API available within your existing LEARN session. It does not ask for, read, or store your Waterloo password.

## Install in Chrome, Edge, Brave, or another Chromium browser

1. Open the browser's extensions page (for example, `chrome://extensions`).
2. Turn on **Developer mode**.
3. Select **Load unpacked**.
4. Choose this project folder.
5. Open or refresh Waterloo LEARN.

## Install temporarily in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on**.
3. Choose `manifest.json` from this folder.
4. Open or refresh Waterloo LEARN.

Firefox removes temporary add-ons when the browser closes. Permanent installation requires packaging and signing through Mozilla Add-ons.

## Behavior

- Loads visible assignments from active course offerings.
- Sorts assignments by due date and keeps assignments without dates at the bottom.
- Labels overdue, due-today, due-tomorrow, and upcoming work.
- Links each item to its assignment page in LEARN.
- Offers separate **iCalendar download** and **Google Calendar** options.
- Adds each dated assignment as a one-hour block ending at its deadline.
- Refreshes only when the panel first loads or when **Refresh** is selected.

If some courses cannot be read, the panel displays the number that failed while still showing assignments from the other courses. Assignments without due dates are not sent to calendars.

## Calendar options

Select **Add to calendar** in the assignment panel, then choose:

- **iCalendar download** to save every dated assignment in one `.ics` file.
- **Google Calendar** to publish a private calendar feed and open Google Calendar with the subscription ready to add.

The Google option works like UW Flow and does not require Google OAuth. On first use, confirm the prepared calendar inside Google Calendar. The extension updates the same private feed whenever LEARN opens; Google controls how quickly subscribed calendars refresh.

The Google option never downloads a file. If the hosted service is unavailable, it opens Google Calendar without a feed and displays an error in LEARN. The separate **iCalendar download** option is the only action that downloads an `.ics` file.

## Enable the hosted calendar feed

The `calendar-service` directory contains a Cloudflare Worker and D1 service designed for Cloudflare's free tier. This package is configured to use the deployed service at `https://uwlearn-calendar-feed.gurshaan1124.workers.dev`. Follow the [deployment guide](calendar-service/README.md) only when deploying a replacement service.

## Calendar-feed privacy

The service stores assignment names, course names, due dates, and LEARN assignment links. Each feed has a random 192-bit public identifier, and its separate update token remains in browser extension storage. Anyone who obtains the feed URL can read that calendar, so users should treat it as private. Feeds expire one year after their last update and are removed by a daily cleanup job.
