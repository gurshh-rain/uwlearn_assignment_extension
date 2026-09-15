"use strict";

importScripts("calendar-service-config.js");

const GOOGLE_CALENDAR_HOME = "https://calendar.google.com/calendar/u/0/r";
const GOOGLE_CALENDAR_URL = "https://calendar.google.com/calendar/r?cid=";
const FEED_STORAGE_KEY = "calendarFeed";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "PUBLISH_CALENDAR_FEED") {
    publishCalendar(message.assignments, true)
      .then(sendResponse)
      .catch(async (error) => {
        await openTab(GOOGLE_CALENDAR_HOME).catch(() => null);
        sendResponse({ ok: false, message: error.message });
      });
    return true;
  }
  if (message?.type === "SYNC_CALENDAR_FEED") {
    publishCalendar(message.assignments, false)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, message: error.message }));
    return true;
  }
  return false;
});

async function publishCalendar(assignments, openGoogle) {
  const serviceUrl = normalizedServiceUrl();
  if (!serviceUrl) {
    if (openGoogle) await openTab(GOOGLE_CALENDAR_HOME);
    return { ok: false, message: "The hosted calendar service has not been configured." };
  }
  if (!Array.isArray(assignments) || !assignments.length) {
    return { ok: false, message: "No dated assignments were available." };
  }

  const existingFeed = await getStoredFeed();
  if (!openGoogle && !existingFeed) return { ok: true, skipped: true };

  let feed;
  if (existingFeed && existingFeed.feedUrl.startsWith(`${serviceUrl}/`)) {
    feed = await updateFeed(serviceUrl, existingFeed, assignments).catch((error) => {
      if (error.status === 401 || error.status === 404 || error.status === 410) return null;
      throw error;
    });
  }
  if (!feed) {
    if (!openGoogle) return { ok: true, skipped: true };
    feed = await createFeed(serviceUrl, assignments);
  }

  const storedFeed = {
    feedId: feed.feedId,
    feedUrl: feed.feedUrl,
    updateToken: feed.updateToken || existingFeed?.updateToken,
    expiresAt: feed.expiresAt
  };
  await setStoredFeed(storedFeed);

  if (openGoogle) {
    const webcalUrl = storedFeed.feedUrl.replace(/^https:/, "webcal:");
    await openTab(`${GOOGLE_CALENDAR_URL}${encodeURIComponent(`${webcalUrl}?v=${Date.now()}`)}`);
  }
  return { ok: true, count: assignments.length, expiresAt: storedFeed.expiresAt };
}

async function createFeed(serviceUrl, assignments) {
  return serviceFetch(`${serviceUrl}/v1/calendars`, {
    method: "POST",
    body: JSON.stringify({ assignments })
  });
}

async function updateFeed(serviceUrl, feed, assignments) {
  return serviceFetch(`${serviceUrl}/v1/calendars/${encodeURIComponent(feed.feedId)}.ics`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${feed.updateToken}` },
    body: JSON.stringify({ assignments })
  });
}

async function serviceFetch(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error = new Error(payload?.error || `Calendar service request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function normalizedServiceUrl() {
  const value = String(globalThis.CALENDAR_SERVICE_URL || "").trim().replace(/\/$/, "");
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

function getStoredFeed() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(FEED_STORAGE_KEY, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(result[FEED_STORAGE_KEY] || null);
    });
  });
}

function setStoredFeed(feed) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [FEED_STORAGE_KEY]: feed }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

function openTab(url) {
  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url }, (tab) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(tab);
    });
  });
}
