# Hosted calendar feed

This Cloudflare Worker publishes private, subscribable `.ics` feeds for the extension. It uses Cloudflare D1 and is designed to fit within the Cloudflare free tier for a small extension.

## Deploy

1. Create a Cloudflare account if needed.
2. Authenticate Wrangler:

   ```sh
   npx --yes wrangler@4.129.0 login
   ```

3. Create the D1 database:

   ```sh
   npx --yes wrangler@4.129.0 d1 create uwlearn-calendar-feed
   ```

4. Copy the returned database ID into the `database_id` field in `wrangler.jsonc`.
5. Apply the database migration remotely:

   ```sh
   npx --yes wrangler@4.129.0 d1 migrations apply uwlearn-calendar-feed --remote
   ```

6. Deploy the Worker:

   ```sh
   npx --yes wrangler@4.129.0 deploy
   ```

7. Copy the resulting URL, which resembles `https://uwlearn-calendar-feed.<account-subdomain>.workers.dev`.
8. Set that URL in the extension's `calendar-service-config.js`:

   ```js
   globalThis.CALENDAR_SERVICE_URL = "https://uwlearn-calendar-feed.<account-subdomain>.workers.dev";
   ```

9. Reload the browser extension and refresh Waterloo LEARN.

The health endpoint at `<worker-url>/health` should return `{"ok":true}`.

## How it works

- `POST /v1/calendars` creates a feed and returns a random feed URL plus a separate update token.
- `PUT /v1/calendars/<feed-id>.ics` updates that feed when given its update token.
- `GET /v1/calendars/<feed-id>.ics` returns the calendar to Google Calendar or another calendar client.
- `DELETE /v1/calendars/<feed-id>.ics` deletes a feed when given its update token.
- A daily scheduled job deletes feeds more than one year after their last update.

The extension stores the feed ID and update token in extension-local storage. The service stores assignment and quiz names, course names, due dates, and LEARN links. Feed URLs are unguessable but function as read-access credentials and must remain private.

## Verify locally

The test suite has no third-party dependencies:

```sh
npm test
```
