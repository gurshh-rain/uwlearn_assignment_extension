# Chrome Web Store listing materials

## Name

Waterloo LEARN Assignment Dashboard

## Short description

View Waterloo LEARN assignments, due dates, submission status, and completion progress in one dashboard.

## Detailed description

Stay on top of Waterloo LEARN without opening every course separately.

Waterloo LEARN Assignment Dashboard adds a compact assignment panel directly to LEARN. It gathers visible assignments from active courses, sorts them by deadline, and highlights overdue and upcoming work.

Features:

- Consolidated assignments from active LEARN courses
- Due dates with overdue, today, tomorrow, and upcoming labels
- Automatic submitted-status detection
- Persistent Done checkboxes for manually crossing out work
- Private manual notes stored in the browser
- Switchable list and built-in month calendar views
- Direct links back to each LEARN assignment
- iCalendar file export
- Private Google Calendar subscription with one-hour deadline blocks

The extension uses the student's existing authenticated LEARN session and never asks for or stores a Waterloo password. Google Calendar publishing is optional and requires an explicit in-product data disclosure and consent.

This extension is independently developed and is not affiliated with or endorsed by the University of Waterloo, D2L, Google, or Cloudflare.

## Category

Productivity

## Single purpose

Consolidate assignment and deadline information from Waterloo LEARN and let students track or export that work.

## Permission justifications

### storage

Stores manual Done selections, assignment notes, the selected dashboard view, the calendar-data consent version, and the private calendar feed identifier/update token so preferences and calendar updates persist across sessions.

### learn.uwaterloo.ca

Reads courses, visible assignments, due dates, and current-user assignment submission status from Brightspace using the user's existing authenticated session, and renders the dashboard only on Waterloo LEARN.

### uwlearn-calendar-feed.gurshaan1124.workers.dev

After explicit user consent, sends assignment names, course names, due dates, and LEARN assignment links to the extension's hosted service to create and update the private subscribed calendar requested by the user.

## Data-use disclosure

The extension locally handles website content consisting of course and assignment information. Optional calendar publishing transmits assignment names, course names, due dates, and LEARN links to the hosted calendar service. Submission status, manual Done selections, and assignment notes are not uploaded. Data is not sold, used for advertising, or used for unrelated purposes.

Privacy policy URL:

https://github.com/gurshh-rain/uwlearn_assignment_extension/blob/main/PRIVACY.md

Support URL:

https://github.com/gurshh-rain/uwlearn_assignment_extension/issues

## Test instructions

1. Install the extension and grant access to `https://learn.uwaterloo.ca`.
2. Sign in with a valid Waterloo LEARN student account.
3. Open the LEARN homepage and confirm the Assignments panel appears in the top-right corner.
4. Add an assignment note and confirm it persists after refresh.
5. Switch between List and Calendar, navigate months, and confirm dated assignments appear on the correct days.
6. Confirm submission badges appear where applicable and Done selections persist after refresh.
7. Select the header Export menu, then Google Calendar. Review and accept the in-product disclosure.
8. Confirm Google Calendar opens with the private calendar subscription ready to add.

No Waterloo test credentials can be provided because credentials are personal institutional accounts. A reviewer should not request or use another person's Waterloo credentials.

## Graphics

- Extension icons: `assets/icon-16.png`, `icon-32.png`, `icon-48.png`, and `icon-128.png`
- Small promotional tile: `store-assets/small-promo-440x280.png`
- Marquee graphic: `store-assets/marquee-1400x560.png`
- Anonymized product screenshot: `store-assets/screenshot-1280x800.png`

The included screenshot uses clearly fictional sample data. If you capture additional screenshots while the extension is running on LEARN, hide the student's name, username, course identifiers, grades, assignment names, and any other personal or educational information before uploading them.
