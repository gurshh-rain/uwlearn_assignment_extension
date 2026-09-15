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
- Refreshes only when the panel first loads or when **Refresh** is selected.

If some courses cannot be read, the panel displays the number that failed while still showing assignments from the other courses. Assignments without due dates are not sent to calendars.

## Calendar options

Select **Add to calendar** in the assignment panel, then choose:

- **iCalendar download** to save every dated assignment in one `.ics` file.
- **Google Calendar** to create a new **Waterloo LEARN Assignments** calendar and add the assignments automatically on a configured Chromium browser.

On Safari or before Google OAuth is configured, the Google option downloads the `.ics` file and opens Google Calendar's new-calendar setup. Import the file from **Google Calendar → Settings → Import & export**. Importing the same file more than once may create duplicate events.

## Enable one-click Google Calendar on Chromium

Google requires the extension owner to provide an OAuth client ID. A client secret must not be added to the extension.

1. Load the unpacked extension and copy its ID from the browser's extensions page.
2. In Google Cloud, create a project and enable the **Google Calendar API**.
3. Configure the OAuth consent screen. While the app is in testing, add your Google account as a test user.
4. Create an OAuth client with application type **Chrome Extension**, using the extension ID as its item ID.
5. Add the resulting client ID and least-privilege scope to `manifest.json`:

```json
"oauth2": {
  "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "scopes": ["https://www.googleapis.com/auth/calendar.app.created"]
}
```

6. Reload the extension. The first **Google Calendar** selection asks for Google authorization; subsequent selections create and open a new assignment calendar directly.

The current package intentionally omits `oauth2` until a real client ID is available, so it remains in safe fallback mode. Safari continues to use the `.ics` fallback because Chrome's Google identity token flow is not portable to Safari.
# uwlearn_assignment_extension
