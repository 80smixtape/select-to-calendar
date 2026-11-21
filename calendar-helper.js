// Turns a chunk of selected text into a Google Calendar "prefilled event" URL.
// Runs entirely locally via the bundled chrono-node parser - nothing leaves
// the browser.

function pad(n) {
  return String(n).padStart(2, "0");
}

// Format a JS Date as YYYYMMDDTHHMMSSZ (UTC) for Google Calendar's `dates` param.
function toGCalUTC(date) {
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

// Very small heuristic: after chrono claims the date/time phrase, look at
// what's left for an "at <Place>" or "in <Place>" tail naming a location.
// Deliberately conservative - false negatives (missing a location) are far
// better than false positives (mangling the title).
function extractLocation(remainingText) {
  const match = remainingText.match(
    /\b(?:at|in)\s+([A-Z][A-Za-z0-9&'.\- ]{2,40}?)(?:[.,!?]|\s*$)/
  );
  return match ? match[1].trim() : "";
}

function buildTitleAndLocation(originalText, dateMatch) {
  let remaining = originalText;
  if (dateMatch) {
    remaining = (
      originalText.slice(0, dateMatch.index) +
      " " +
      originalText.slice(dateMatch.index + dateMatch.text.length)
    );
  }
  remaining = remaining.replace(/\s+/g, " ").trim();

  const location = extractLocation(remaining);
  let title = location
    ? remaining.replace(new RegExp("\\b(?:at|in)\\s+" + escapeRegex(location) + "\\b.*"), "").trim()
    : remaining;

  // Clean up leftover punctuation/connectors from stripping the date phrase,
  // e.g. "Dentist appointment on" -> "Dentist appointment".
  title = title.replace(/^[-,;:\s]+|[-,;:\s]+$/g, "").trim();
  title = title.replace(/\s+(?:on|at|in|for|this|next)\s*$/i, "").trim();
  if (!title) title = originalText.trim();

  return { title, location };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Main entry point. `text` is the user's selection. `now` is injectable for
// testing; defaults to the real current time.
function buildCalendarUrl(text, now = new Date()) {
  const results = chrono.parse(text, now, { forwardDate: true });
  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");

  let title = text.trim();
  let location = "";

  if (results.length > 0) {
    const r = results[0];
    const start = r.start.date();
    const end = r.end ? r.end.date() : new Date(start.getTime() + 60 * 60 * 1000);

    params.set("dates", `${toGCalUTC(start)}/${toGCalUTC(end)}`);

    const built = buildTitleAndLocation(text, r);
    title = built.title;
    location = built.location;
  }
  // else: no date/time found in the selection - still open a blank-ish
  // event prefilled with the selection as the title, so the user can set
  // the time by hand rather than getting nothing at all.

  params.set("text", title.slice(0, 200));
  if (location) params.set("location", location);
  params.set("details", `Created from selected text:\n\n${text}`);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Expose for background.js (classic service worker script, no ES modules).
if (typeof module !== "undefined") {
  module.exports = { buildCalendarUrl, toGCalUTC, extractLocation };
}
