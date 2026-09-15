import test from "node:test";
import assert from "node:assert/strict";
import { buildCalendar, validateAssignments } from "../src/worker.js";

const assignment = {
  id: "42",
  courseId: "1001",
  name: "Final report",
  courseName: "TEST 101",
  dueDate: "2026-09-14T20:00:00.000Z",
  url: "https://learn.uwaterloo.ca/d2l/example"
};

test("validates and normalizes assignment data", () => {
  const result = validateAssignments([assignment]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.assignments, [assignment]);
});

test("rejects assignment links outside Waterloo LEARN", () => {
  const result = validateAssignments([{ ...assignment, url: "https://example.com/assignment" }]);
  assert.equal(result.ok, false);
});

test("creates a one-hour event ending at the due time", () => {
  const calendar = buildCalendar([assignment], new Date("2026-09-01T12:00:00Z"));
  assert.match(calendar, /DTSTART:20260914T190000Z/);
  assert.match(calendar, /DTEND:20260914T200000Z/);
  assert.match(calendar, /X-WR-CALNAME:Waterloo LEARN Assignments/);
});

test("escapes calendar text", () => {
  const calendar = buildCalendar([{ ...assignment, name: "Essay, part 1; draft" }]);
  assert.match(calendar, /SUMMARY:Due: Essay\\, part 1\\; draft/);
});
