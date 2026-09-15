# Privacy Policy

Effective date: September 14, 2026

Waterloo LEARN Assignment Dashboard is an independent browser extension that consolidates assignment information visible to a signed-in Waterloo LEARN user. It is not operated by or affiliated with the University of Waterloo, D2L, Google, or Cloudflare.

## Data handled locally

While the user is signed in to Waterloo LEARN, the extension reads course names, assignment names, due dates, and assignment submission status through Waterloo LEARN's Brightspace APIs. This information is used to display the assignment dashboard. The extension does not request, read, or store the user's Waterloo password.

Manual Done selections and assignment notes are stored in browser extension storage. A private calendar-feed identifier and update token are also stored there after the user enables Google Calendar integration.

## Hosted calendar data

The extension does not upload assignment data before the user explicitly enables the hosted Google Calendar feature. Before the first hosted calendar upload, it displays an in-product disclosure and asks for affirmative consent. After consent, opening Waterloo LEARN updates the user's existing private feed so subscribed calendar information stays current.

If the user consents and chooses Google Calendar, the extension sends these fields to the hosted calendar service over HTTPS:

- Assignment names
- Course names
- Due dates
- Links to assignment pages on Waterloo LEARN

The hosted service does not receive the user's name, email address, Waterloo password, grades, submitted files, assignment submission status, manual Done selections, or assignment notes.

## Purpose and sharing

Hosted data is used only to generate and update the private iCalendar feed requested by the user. It is not sold, used for advertising, or used for analytics or unrelated purposes.

The calendar service runs on Cloudflare Workers and Cloudflare D1. Cloudflare processes and stores the data as the service provider. When a user subscribes through Google Calendar, Google retrieves and processes the calendar feed under the user's relationship with Google.

## Feed access and security

Each feed receives a random 192-bit identifier. Its separate update token is stored only in browser extension storage, while the service stores a cryptographic hash of that update token. Assignment data is transmitted using HTTPS.

The feed URL functions as a read-access credential. Anyone who obtains that URL can view its calendar contents, so users must keep it private and avoid posting or sharing it.

## Retention

A hosted feed expires one year after its most recent update. Expired feeds are inaccessible and are removed by a scheduled daily cleanup process. Opening Waterloo LEARN after enabling the calendar feed refreshes its assignment data and renews this period.

Uninstalling the extension stops future updates but does not immediately remove an existing hosted feed because the service does not receive or retain a user identity with which to locate it. The feed expires under the retention policy above.

## Permissions

- Access to `learn.uwaterloo.ca` is used only to read assignment information available in the user's existing LEARN session and add the dashboard to that site.
- Access to the configured `workers.dev` calendar service is used only after calendar consent to create and update the private feed.
- Browser storage is used for manual Done selections, assignment notes, the selected dashboard view, the consent version, and private feed metadata.

## Changes

Material changes to data handling will require an updated disclosure and renewed consent in the extension. This policy may be updated to reflect feature, legal, or operational changes.

## Contact

Questions or privacy concerns can be submitted through the project's [GitHub Issues page](https://github.com/gurshh-rain/uwlearn_assignment_extension/issues). Do not include a private calendar-feed URL, Waterloo credentials, or other sensitive information in a public issue.
