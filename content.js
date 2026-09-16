(() => {
  "use strict";

  const ROOT_ID = "uw-learn-assignment-dashboard";
  const CROSSED_STORAGE_KEY = "crossedAssignments";
  const NOTES_STORAGE_KEY = "assignmentNotes";
  const VIEW_STORAGE_KEY = "dashboardView";
  const COLLAPSED_STORAGE_KEY = "dashboardCollapsed";
  const CALENDAR_CONSENT_KEY = "calendarDataConsentVersion";
  const CALENDAR_CONSENT_VERSION = 1;
  const PRIVACY_POLICY_URL = "https://github.com/gurshh-rain/uwlearn_assignment_extension/blob/main/PRIVACY.md";
  const FALLBACK_VERSIONS = { lp: "1.44", le: "1.67" };
  const state = {
    collapsed: false,
    loading: false,
    assignments: [],
    crossed: new Set(),
    notes: {},
    editingNoteKey: null,
    view: "list",
    calendarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  };

  if (document.getElementById(ROOT_ID)) return;

  const root = document.createElement("section");
  root.id = ROOT_ID;
  root.className = "uw-learn-initializing";
  root.setAttribute("aria-label", "LEARN assignments");

  const header = document.createElement("header");
  const headingWrap = document.createElement("div");
  headingWrap.className = "uw-learn-heading";
  const eyebrow = document.createElement("span");
  const heading = document.createElement("h2");
  eyebrow.className = "uw-learn-eyebrow";
  eyebrow.textContent = "WATERLOO LEARN";
  heading.textContent = "Assignments";
  headingWrap.append(eyebrow, heading);

  const controls = document.createElement("div");
  controls.className = "uw-learn-controls";
  const refreshButton = makeButton("Refresh", "Refresh assignments");
  const calendarWrap = document.createElement("div");
  calendarWrap.className = "uw-learn-calendar-wrap";
  const exportButton = makeButton("Export", "Choose a calendar export option");
  exportButton.disabled = true;
  exportButton.setAttribute("aria-expanded", "false");
  const calendarMenu = document.createElement("div");
  calendarMenu.className = "uw-learn-calendar-menu";
  calendarMenu.hidden = true;
  const icalButton = makeButton("iCalendar download", "Download assignments as an iCalendar file");
  const googleButton = makeButton("Google Calendar", "Create a Google Calendar for these assignments");
  calendarMenu.append(icalButton, googleButton);
  calendarWrap.append(exportButton, calendarMenu);
  const collapseButton = makeButton("−", "Collapse assignment dashboard");
  collapseButton.className = "uw-learn-icon-button";
  controls.append(refreshButton, calendarWrap, collapseButton);
  header.append(headingWrap, controls);

  const body = document.createElement("div");
  body.className = "uw-learn-body";
  const summary = document.createElement("div");
  summary.className = "uw-learn-summary";
  const viewSwitcher = document.createElement("div");
  viewSwitcher.className = "uw-learn-view-switcher";
  viewSwitcher.setAttribute("role", "tablist");
  viewSwitcher.setAttribute("aria-label", "Assignment view");
  const listViewButton = makeButton("List", "Show assignments as a list");
  const calendarViewButton = makeButton("Calendar", "Show assignments in a month calendar");
  listViewButton.setAttribute("role", "tab");
  calendarViewButton.setAttribute("role", "tab");
  viewSwitcher.append(listViewButton, calendarViewButton);
  const message = document.createElement("p");
  message.className = "uw-learn-message";
  message.setAttribute("role", "status");
  const list = document.createElement("ol");
  list.className = "uw-learn-list";
  const calendarView = document.createElement("div");
  calendarView.className = "uw-learn-month-view";
  calendarView.hidden = true;
  const footer = document.createElement("p");
  footer.className = "uw-learn-footer";
  body.append(summary, viewSwitcher, message, list, calendarView, footer);
  root.append(header, body);
  document.body.append(root);

  refreshButton.addEventListener("click", loadAssignments);
  exportButton.addEventListener("click", () => setCalendarMenu(calendarMenu.hidden));
  icalButton.addEventListener("click", () => {
    setCalendarMenu(false);
    downloadCalendar();
  });
  googleButton.addEventListener("click", createGoogleCalendar);
  listViewButton.addEventListener("click", () => setDashboardView("list"));
  calendarViewButton.addEventListener("click", () => setDashboardView("calendar"));
  document.addEventListener("click", (event) => {
    if (!calendarWrap.contains(event.target)) setCalendarMenu(false);
  });
  collapseButton.addEventListener("click", () => {
    setCollapsedState(!state.collapsed);
  });

  initializeDashboard();

  function makeButton(text, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.setAttribute("aria-label", label);
    return button;
  }

  async function initializeDashboard() {
    setCollapsedState(await getStoredCollapsedState(), false);
    root.classList.remove("uw-learn-initializing");
    loadAssignments();
  }

  function setCollapsedState(collapsed, persist = true) {
    state.collapsed = collapsed;
    root.classList.toggle("uw-learn-collapsed", collapsed);
    collapseButton.textContent = collapsed ? "+" : "−";
    collapseButton.setAttribute(
      "aria-label",
      collapsed ? "Expand assignment dashboard" : "Collapse assignment dashboard"
    );
    if (persist) chrome.storage.local.set({ [COLLAPSED_STORAGE_KEY]: collapsed });
  }

  function setCalendarMenu(open) {
    calendarMenu.hidden = !open;
    exportButton.setAttribute("aria-expanded", String(open));
  }

  function setDashboardView(view, persist = true) {
    state.view = view === "calendar" ? "calendar" : "list";
    const showingCalendar = state.view === "calendar";
    list.hidden = showingCalendar;
    calendarView.hidden = !showingCalendar;
    root.classList.toggle("uw-learn-calendar-mode", showingCalendar);
    listViewButton.classList.toggle("uw-learn-active-view", !showingCalendar);
    calendarViewButton.classList.toggle("uw-learn-active-view", showingCalendar);
    listViewButton.setAttribute("aria-selected", String(!showingCalendar));
    calendarViewButton.setAttribute("aria-selected", String(showingCalendar));
    listViewButton.tabIndex = showingCalendar ? -1 : 0;
    calendarViewButton.tabIndex = showingCalendar ? 0 : -1;
    if (showingCalendar) renderMonthCalendar();
    if (persist) saveView();
  }

  async function loadAssignments() {
    if (state.loading) return;
    state.loading = true;
    refreshButton.disabled = true;
    exportButton.disabled = true;
    setCalendarMenu(false);
    refreshButton.textContent = "Loading…";
    summary.replaceChildren();
    list.replaceChildren();
    calendarView.replaceChildren();
    footer.textContent = "";
    message.className = "uw-learn-message";
    message.textContent = "Collecting assignments from your active courses…";

    try {
      const [versions, crossedAssignments, notes, savedView] = await Promise.all([
        getApiVersions(),
        getStoredCrossedAssignments(),
        getStoredNotes(),
        getStoredView()
      ]);
      state.crossed = new Set(crossedAssignments);
      state.notes = notes;
      state.view = savedView;
      setDashboardView(savedView, false);
      const courses = await getCourses(versions.lp);
      if (!courses.length) {
        state.assignments = [];
        renderAssignments();
        message.textContent = "No active courses were found.";
        return;
      }

      const results = await mapWithConcurrency(courses, 5, async (course) => {
        try {
          return { assignments: await getCourseAssignments(course, versions.le), failed: false };
        } catch {
          return { assignments: [], failed: true };
        }
      });
      const failedCourses = results.filter((result) => result.failed).length;
      if (failedCourses === courses.length) {
        throw new Error("LEARN did not allow assignment data to be read.");
      }

      const assignments = results.flatMap((result) => result.assignments);
      await mapWithConcurrency(assignments, 6, async (assignment) => {
        assignment.submitted = await getAssignmentSubmitted(assignment, versions.le);
      });
      state.assignments = assignments.sort(compareAssignments);
      renderAssignments();
      syncCalendarFeed();
      message.textContent = failedCourses
        ? `${failedCourses} ${pluralize(failedCourses, "course", "courses")} could not be loaded.`
        : "";
      footer.textContent = `Updated ${new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit"
      }).format(new Date())}`;
    } catch (error) {
      summary.replaceChildren();
      list.replaceChildren();
      message.className = "uw-learn-message uw-learn-error";
      message.textContent = `${error.message} Try refreshing LEARN, then refresh this list.`;
    } finally {
      state.loading = false;
      refreshButton.disabled = false;
      refreshButton.textContent = "Refresh";
    }
  }

  async function getApiVersions() {
    try {
      const response = await apiFetch("/d2l/api/versions/");
      const entries = Array.isArray(response) ? response : response.Versions || [];
      return Object.fromEntries(
        Object.entries(FALLBACK_VERSIONS).map(([product, fallback]) => {
          const entry = entries.find(
            (version) => String(version.ProductCode || "").toLowerCase() === product
          );
          return [product, entry?.LatestVersion || fallback];
        })
      );
    } catch {
      return { ...FALLBACK_VERSIONS };
    }
  }

  async function getCourses(version) {
    const path = `/d2l/api/lp/${version}/enrollments/myenrollments/?orgUnitTypeId=3&isActive=true`;
    const enrollments = await getPagedItems(path);
    return enrollments
      .filter((enrollment) => enrollment.IsActive !== false && enrollment.OrgUnit?.Id)
      .map((enrollment) => ({
        id: enrollment.OrgUnit.Id,
        name: enrollment.OrgUnit.Name || enrollment.OrgUnit.Code || "Course"
      }));
  }

  async function getCourseAssignments(course, version) {
    const folders = await getPagedItems(`/d2l/api/le/${version}/${course.id}/dropbox/folders/`);
    return folders
      .filter((folder) => folder && folder.IsHidden !== true)
      .map((folder) => ({
        id: folder.Id,
        name: folder.Name || "Untitled assignment",
        courseId: course.id,
        courseName: course.name,
        dueDate: parseDate(folder.DueDate),
        submitted: null
      }));
  }

  async function getAssignmentSubmitted(assignment, version) {
    try {
      const data = await apiFetch(
        `/d2l/api/le/${version}/${assignment.courseId}/dropbox/folders/${assignment.id}/submissions/mysubmissions/`
      );
      const entities = Array.isArray(data) ? data : data.Items || [];
      return entities.some((entity) => {
        const status = Number(entity.Status);
        return status === 1 || status === 3 || entity.Submissions?.some((submission) => submission.SubmissionDate);
      });
    } catch {
      return null;
    }
  }

  async function getPagedItems(initialPath) {
    const items = [];
    let path = initialPath;
    for (let page = 0; path && page < 50; page += 1) {
      const data = await apiFetch(path);
      if (Array.isArray(data)) return items.concat(data);
      items.push(...(data.Items || []));
      const paging = data.PagingInfo;
      path = paging?.HasMoreItems && paging.Bookmark
        ? withQuery(initialPath, "bookmark", paging.Bookmark)
        : null;
    }
    return items;
  }

  async function apiFetch(path) {
    const response = await fetch(path, {
      credentials: "include",
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`LEARN request failed (${response.status}).`);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("json")) throw new Error("Your LEARN session may have expired.");
    return response.json();
  }

  function getStoredCrossedAssignments() {
    return new Promise((resolve) => {
      chrome.storage.local.get(CROSSED_STORAGE_KEY, (result) => {
        if (chrome.runtime.lastError || !result) {
          resolve([]);
          return;
        }
        const stored = result[CROSSED_STORAGE_KEY];
        resolve(Array.isArray(stored) ? stored.filter((key) => typeof key === "string") : []);
      });
    });
  }

  function saveCrossedAssignments() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [CROSSED_STORAGE_KEY]: [...state.crossed] }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  }

  function getStoredNotes() {
    return new Promise((resolve) => {
      chrome.storage.local.get(NOTES_STORAGE_KEY, (result) => {
        if (chrome.runtime.lastError || !result || typeof result[NOTES_STORAGE_KEY] !== "object") {
          resolve({});
          return;
        }
        resolve(Object.fromEntries(
          Object.entries(result[NOTES_STORAGE_KEY])
            .filter(([key, value]) => typeof key === "string" && typeof value === "string")
            .map(([key, value]) => [key, value.slice(0, 2000)])
        ));
      });
    });
  }

  function saveNotes() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [NOTES_STORAGE_KEY]: state.notes }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  }

  function getStoredView() {
    return new Promise((resolve) => {
      chrome.storage.local.get(VIEW_STORAGE_KEY, (result) => {
        resolve(result?.[VIEW_STORAGE_KEY] === "calendar" ? "calendar" : "list");
      });
    });
  }

  function getStoredCollapsedState() {
    return new Promise((resolve) => {
      chrome.storage.local.get(COLLAPSED_STORAGE_KEY, (result) => {
        resolve(!chrome.runtime.lastError && result?.[COLLAPSED_STORAGE_KEY] === true);
      });
    });
  }

  function saveView() {
    chrome.storage.local.set({ [VIEW_STORAGE_KEY]: state.view });
  }

  function renderAssignments() {
    list.replaceChildren();
    renderSummary();
    renderMonthCalendar();

    if (!state.assignments.length) {
      message.textContent = "No visible assignments were found in your active courses.";
      return;
    }

    for (const assignment of state.assignments) {
      const key = assignmentKey(assignment);
      const crossed = state.crossed.has(key);
      const item = document.createElement("li");
      item.classList.toggle("uw-learn-crossed", crossed);
      item.classList.toggle("uw-learn-submitted-item", assignment.submitted === true);

      const crossControl = document.createElement("label");
      crossControl.className = "uw-learn-cross-control";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = crossed;
      checkbox.setAttribute("aria-label", `${crossed ? "Restore" : "Cross out"} ${assignment.name}`);
      checkbox.addEventListener("change", async () => {
        if (checkbox.checked) state.crossed.add(key);
        else state.crossed.delete(key);
        state.assignments.sort(compareAssignments);
        renderAssignments();
        try {
          await saveCrossedAssignments();
        } catch {
          message.className = "uw-learn-message uw-learn-error";
          message.textContent = "The crossed-out state could not be saved.";
        }
      });
      const crossText = document.createElement("span");
      crossText.textContent = "Done";
      crossControl.append(checkbox, crossText);

      const link = document.createElement("a");
      link.href = assignmentUrl(assignment);
      const topLine = document.createElement("div");
      topLine.className = "uw-learn-assignment-top";
      const name = document.createElement("strong");
      name.textContent = assignment.name;
      const badge = document.createElement("span");
      const status = assignmentStatus(assignment, crossed);
      badge.className = `uw-learn-badge ${status.className}`;
      badge.textContent = status.label;
      topLine.append(name, badge);

      const course = document.createElement("span");
      course.className = "uw-learn-course";
      course.textContent = assignment.courseName;
      const date = document.createElement("span");
      date.className = "uw-learn-date";
      date.textContent = assignment.dueDate ? formatDueDate(assignment.dueDate) : "No due date";
      link.append(topLine, course, date);

      const assignmentContent = document.createElement("div");
      assignmentContent.className = "uw-learn-assignment-content";
      assignmentContent.append(link);
      const noteArea = document.createElement("div");
      noteArea.className = "uw-learn-note-area";
      const note = state.notes[key] || "";
      if (state.editingNoteKey === key) {
        const textarea = document.createElement("textarea");
        textarea.maxLength = 2000;
        textarea.rows = 3;
        textarea.value = note;
        textarea.placeholder = "Add a reminder, plan, or other note…";
        textarea.setAttribute("aria-label", `Note for ${assignment.name}`);
        const noteActions = document.createElement("div");
        noteActions.className = "uw-learn-note-actions";
        const cancelNote = makeButton("Cancel", `Cancel note for ${assignment.name}`);
        const saveNote = makeButton("Save note", `Save note for ${assignment.name}`);
        saveNote.className = "uw-learn-save-note";
        cancelNote.addEventListener("click", () => {
          state.editingNoteKey = null;
          renderAssignments();
        });
        saveNote.addEventListener("click", async () => {
          const value = textarea.value.trim();
          if (value) state.notes[key] = value;
          else delete state.notes[key];
          state.editingNoteKey = null;
          renderAssignments();
          try {
            await saveNotes();
          } catch {
            message.className = "uw-learn-message uw-learn-error";
            message.textContent = "The assignment note could not be saved.";
          }
        });
        noteActions.append(cancelNote, saveNote);
        noteArea.append(textarea, noteActions);
        setTimeout(() => textarea.focus(), 0);
      } else {
        if (note) {
          const noteText = document.createElement("p");
          noteText.className = "uw-learn-note-text";
          noteText.textContent = note;
          noteArea.append(noteText);
        }
        const editNote = makeButton(note ? "Edit note" : "Add note", `${note ? "Edit" : "Add"} note for ${assignment.name}`);
        editNote.className = "uw-learn-note-button";
        editNote.addEventListener("click", () => {
          state.editingNoteKey = key;
          renderAssignments();
        });
        noteArea.append(editNote);
      }
      assignmentContent.append(noteArea);
      item.append(crossControl, assignmentContent);
      list.append(item);
    }
  }

  function renderSummary() {
    summary.replaceChildren();
    const dated = state.assignments.filter((assignment) => assignment.dueDate);
    const remaining = dated.filter((assignment) => !isCompleted(assignment));
    const upcoming = remaining.filter((assignment) => assignment.dueDate >= new Date());
    const overdue = remaining.length - upcoming.length;
    const completed = state.assignments.filter(isCompleted).length;
    exportButton.disabled = !dated.length;
    exportButton.textContent = dated.length ? `Export (${dated.length})` : "Export";
    summary.append(
      makeStat(upcoming.length, "upcoming"),
      makeStat(overdue, "overdue"),
      makeStat(completed, "completed")
    );
  }

  function renderMonthCalendar() {
    calendarView.replaceChildren();
    const monthHeader = document.createElement("div");
    monthHeader.className = "uw-learn-month-header";
    const previousMonth = makeButton("Previous", "Show previous month");
    const monthTitle = document.createElement("h3");
    monthTitle.textContent = new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric"
    }).format(state.calendarMonth);
    const monthActions = document.createElement("div");
    monthActions.className = "uw-learn-month-actions";
    const today = makeButton("Today", "Show current month");
    const nextMonth = makeButton("Next", "Show next month");
    previousMonth.addEventListener("click", () => {
      state.calendarMonth = new Date(
        state.calendarMonth.getFullYear(),
        state.calendarMonth.getMonth() - 1,
        1
      );
      renderMonthCalendar();
    });
    today.addEventListener("click", () => {
      const now = new Date();
      state.calendarMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      renderMonthCalendar();
    });
    nextMonth.addEventListener("click", () => {
      state.calendarMonth = new Date(
        state.calendarMonth.getFullYear(),
        state.calendarMonth.getMonth() + 1,
        1
      );
      renderMonthCalendar();
    });
    monthActions.append(today, nextMonth);
    monthHeader.append(previousMonth, monthTitle, monthActions);

    const weekdays = document.createElement("div");
    weekdays.className = "uw-learn-weekdays";
    for (const weekday of ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]) {
      const label = document.createElement("span");
      label.textContent = weekday;
      weekdays.append(label);
    }

    const grid = document.createElement("div");
    grid.className = "uw-learn-month-grid";
    grid.setAttribute("role", "grid");
    const firstDay = new Date(
      state.calendarMonth.getFullYear(),
      state.calendarMonth.getMonth(),
      1
    );
    const daysInMonth = new Date(
      firstDay.getFullYear(),
      firstDay.getMonth() + 1,
      0
    ).getDate();
    const cellCount = Math.ceil((firstDay.getDay() + daysInMonth) / 7) * 7;
    const gridStart = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1 - firstDay.getDay());
    const assignmentsByDay = new Map();
    for (const assignment of state.assignments) {
      if (!assignment.dueDate) continue;
      const key = localDateKey(assignment.dueDate);
      if (!assignmentsByDay.has(key)) assignmentsByDay.set(key, []);
      assignmentsByDay.get(key).push(assignment);
    }

    for (let index = 0; index < cellCount; index += 1) {
      const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
      const key = localDateKey(date);
      const cell = document.createElement("div");
      cell.className = "uw-learn-month-day";
      cell.setAttribute("role", "gridcell");
      cell.classList.toggle("uw-learn-other-month", date.getMonth() !== firstDay.getMonth());
      cell.classList.toggle("uw-learn-today-cell", localDateKey(new Date()) === key);
      const dayNumber = document.createElement("time");
      dayNumber.dateTime = key;
      dayNumber.textContent = String(date.getDate());
      cell.append(dayNumber);

      for (const assignment of assignmentsByDay.get(key) || []) {
        const event = document.createElement("a");
        event.className = "uw-learn-month-event";
        event.href = assignmentUrl(assignment);
        event.textContent = assignment.name;
        const assignmentKeyValue = assignmentKey(assignment);
        const crossed = state.crossed.has(assignmentKeyValue);
        event.classList.toggle("uw-learn-month-completed", assignment.submitted === true || crossed);
        event.classList.toggle(
          "uw-learn-month-overdue",
          !assignment.submitted && !crossed && assignment.dueDate < new Date()
        );
        const note = state.notes[assignmentKeyValue];
        event.classList.toggle("uw-learn-month-has-note", Boolean(note));
        event.title = [assignment.courseName, assignment.name, formatDueDate(assignment.dueDate), note ? `Note: ${note}` : ""]
          .filter(Boolean)
          .join(" — ");
        cell.append(event);
      }
      grid.append(cell);
    }
    calendarView.append(monthHeader, weekdays, grid);
  }

  function localDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function makeStat(value, label) {
    const stat = document.createElement("div");
    const number = document.createElement("strong");
    const text = document.createElement("span");
    number.textContent = String(value);
    text.textContent = label;
    stat.append(number, text);
    return stat;
  }

  function assignmentStatus(assignment, crossed = state.crossed.has(assignmentKey(assignment))) {
    if (assignment.submitted === true) {
      return { label: "Submitted", className: "uw-learn-submitted" };
    }
    if (crossed) return { label: "Crossed out", className: "uw-learn-crossed-badge" };
    return dueDetails(assignment.dueDate);
  }

  function isCompleted(assignment) {
    return assignment.submitted === true || state.crossed.has(assignmentKey(assignment));
  }

  function assignmentKey(assignment) {
    return `${assignment.courseId}:${assignment.id}`;
  }

  function dueDetails(date) {
    if (!date) return { label: "No date", className: "uw-learn-neutral" };
    const now = new Date();
    const dayDifference = calendarDayDifference(now, date);
    if (date < now) return { label: "Overdue", className: "uw-learn-overdue" };
    if (dayDifference === 0) return { label: "Today", className: "uw-learn-today" };
    if (dayDifference === 1) return { label: "Tomorrow", className: "uw-learn-soon" };
    if (dayDifference <= 7) return { label: `In ${dayDifference} days`, className: "uw-learn-soon" };
    return { label: "Upcoming", className: "uw-learn-upcoming" };
  }

  function calendarDayDifference(from, to) {
    const fromDay = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
    const toDay = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
    return (toDay - fromDay) / 86400000;
  }

  function formatDueDate(date) {
    return `Due ${new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(date)}`;
  }

  function compareAssignments(a, b) {
    const completionDifference = Number(isCompleted(a)) - Number(isCompleted(b));
    if (completionDifference) return completionDifference;
    if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.courseName.localeCompare(b.courseName) || a.name.localeCompare(b.name);
  }

  function assignmentUrl(assignment) {
    const params = new URLSearchParams({
      db: assignment.id,
      grpid: "0",
      isprv: "0",
      bp: "0",
      ou: assignment.courseId
    });
    return `/d2l/lms/dropbox/user/folder_submit_files.d2l?${params}`;
  }

  function hasCalendarConsent() {
    return new Promise((resolve) => {
      chrome.storage.local.get(CALENDAR_CONSENT_KEY, (result) => {
        resolve(
          !chrome.runtime.lastError &&
          result?.[CALENDAR_CONSENT_KEY] === CALENDAR_CONSENT_VERSION
        );
      });
    });
  }

  function saveCalendarConsent() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [CALENDAR_CONSENT_KEY]: CALENDAR_CONSENT_VERSION }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  }

  async function ensureCalendarConsent() {
    if (await hasCalendarConsent()) return true;
    if (!(await requestCalendarConsent())) return false;
    try {
      await saveCalendarConsent();
      return true;
    } catch {
      message.className = "uw-learn-message uw-learn-error";
      message.textContent = "Calendar consent could not be saved.";
      return false;
    }
  }

  function requestCalendarConsent() {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.id = "uw-learn-calendar-consent";
      const dialog = document.createElement("div");
      dialog.className = "uw-learn-consent-dialog";
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.setAttribute("aria-labelledby", "uw-learn-consent-title");

      const title = document.createElement("h3");
      title.id = "uw-learn-consent-title";
      title.textContent = "Share assignment data with the calendar service?";
      const explanation = document.createElement("p");
      explanation.textContent = "To create and update your private subscribed calendar, the extension sends the following data to its Cloudflare-hosted service:";
      const fields = document.createElement("ul");
      for (const field of ["Assignment names", "Course names", "Due dates", "Links back to assignments in LEARN"]) {
        const item = document.createElement("li");
        item.textContent = field;
        fields.append(item);
      }
      const retention = document.createElement("p");
      retention.textContent = "The service stores this data for up to one year after the last update. Anyone who obtains the random private feed URL can view its calendar contents. Google Calendar receives the same contents when you subscribe.";
      const excluded = document.createElement("p");
      excluded.textContent = "Your Waterloo password, identity, grades, submitted files, submission status, manual Done selections, and notes are not sent.";
      const privacy = document.createElement("a");
      privacy.href = PRIVACY_POLICY_URL;
      privacy.target = "_blank";
      privacy.rel = "noopener noreferrer";
      privacy.textContent = "Read the full privacy policy";

      const actions = document.createElement("div");
      actions.className = "uw-learn-consent-actions";
      const cancel = makeButton("Cancel", "Cancel calendar data sharing");
      const accept = makeButton("Continue to Google Calendar", "Consent and continue to Google Calendar");
      accept.className = "uw-learn-consent-accept";
      actions.append(cancel, accept);
      dialog.append(title, explanation, fields, retention, excluded, privacy, actions);
      overlay.append(dialog);
      document.body.append(overlay);

      const previousFocus = document.activeElement;
      const finish = (accepted) => {
        document.removeEventListener("keydown", onKeyDown);
        overlay.remove();
        previousFocus?.focus();
        resolve(accepted);
      };
      const onKeyDown = (event) => {
        if (event.key === "Escape") finish(false);
      };
      cancel.addEventListener("click", () => finish(false));
      accept.addEventListener("click", () => finish(true));
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) finish(false);
      });
      document.addEventListener("keydown", onKeyDown);
      accept.focus();
    });
  }

  async function createGoogleCalendar() {
    const assignments = calendarAssignments();
    if (!assignments.length) return;

    setCalendarMenu(false);
    if (!(await ensureCalendarConsent())) return;
    googleButton.disabled = true;
    message.className = "uw-learn-message";
    message.textContent = "Preparing your private Google Calendar feed…";
    try {
      const response = await sendRuntimeMessage({
        type: "PUBLISH_CALENDAR_FEED",
        assignments
      });
      if (response?.ok) {
        message.textContent = `Google Calendar opened with ${response.count} ${pluralize(response.count, "assignment", "assignments")} ready to add.`;
      } else {
        message.className = "uw-learn-message uw-learn-error";
        message.textContent = response?.message || "The hosted calendar feed is unavailable.";
      }
    } catch {
      message.className = "uw-learn-message uw-learn-error";
      message.textContent = "The hosted calendar feed is unavailable.";
    } finally {
      googleButton.disabled = false;
    }
  }

  async function syncCalendarFeed() {
    if (!(await hasCalendarConsent())) return;
    const assignments = calendarAssignments();
    if (!assignments.length) return;
    try {
      await sendRuntimeMessage({ type: "SYNC_CALENDAR_FEED", assignments });
    } catch {
      return;
    }
  }

  function calendarAssignments() {
    return state.assignments
      .filter((assignment) => assignment.dueDate)
      .map((assignment) => ({
        id: assignment.id,
        name: assignment.name,
        courseId: assignment.courseId,
        courseName: assignment.courseName,
        dueDate: assignment.dueDate.toISOString(),
        url: new URL(assignmentUrl(assignment), window.location.origin).href
      }));
  }

  function sendRuntimeMessage(payload) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(payload, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    });
  }

  function downloadCalendar() {
    const dated = state.assignments.filter((assignment) => assignment.dueDate);
    if (!dated.length) return;

    const generatedAt = formatIcsDate(new Date());
    const events = dated.flatMap((assignment) => {
      const url = new URL(assignmentUrl(assignment), window.location.origin).href;
      const startDate = new Date(assignment.dueDate.getTime() - 60 * 60 * 1000);
      return [
        "BEGIN:VEVENT",
        `UID:${assignment.courseId}-${assignment.id}@learn.uwaterloo.ca`,
        `DTSTAMP:${generatedAt}`,
        `DTSTART:${formatIcsDate(startDate)}`,
        `DTEND:${formatIcsDate(assignment.dueDate)}`,
        `SUMMARY:${escapeIcs(`Due: ${assignment.name}`)}`,
        `DESCRIPTION:${escapeIcs(`Course: ${assignment.courseName}\nOpen in LEARN: ${url}`)}`,
        `URL:${url}`,
        "END:VEVENT"
      ];
    });
    const calendar = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Waterloo LEARN Assignment Dashboard//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      ...events,
      "END:VCALENDAR",
      ""
    ].join("\r\n");
    const downloadUrl = URL.createObjectURL(new Blob([calendar], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `waterloo-learn-assignments-${new Date().toISOString().slice(0, 10)}.ics`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }

  function formatIcsDate(date) {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  }

  function escapeIcs(value) {
    return value
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");
  }

  function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function withQuery(path, key, value) {
    const url = new URL(path, window.location.origin);
    url.searchParams.set(key, value);
    return `${url.pathname}${url.search}`;
  }

  function pluralize(count, singular, plural) {
    return count === 1 ? singular : plural;
  }

  async function mapWithConcurrency(items, concurrency, mapper) {
    const results = new Array(items.length);
    let index = 0;
    async function worker() {
      while (index < items.length) {
        const current = index;
        index += 1;
        results[current] = await mapper(items[current], current);
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
    return results;
  }
})();
