import fs from 'node:fs/promises';
import path from 'node:path';

const sourceUrl = process.env.MEETUP_GROUP_URL || 'https://www.meetup.com/aws-sbg-at-nuces/';
const outputFile = path.join(process.cwd(), 'data/events.generated.json');
const now = new Date();

function decodeEntities(value = '') {
  return String(value)
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&#x27;', "'")
    .replaceAll('&#39;', "'");
}

function stripEmoji(value = '') {
  return String(value)
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
    .replace(/[\u2014]/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtml(value = '') {
  return stripEmoji(decodeEntities(String(value))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '));
}

function tryParseJson(value) {
  try {
    return JSON.parse(decodeEntities(value).trim());
  } catch {
    return null;
  }
}

function getBalancedJsonObject(text, startIndex) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') inString = true;
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(startIndex, index + 1);
    }
  }
  return null;
}

function extractJsonCandidates(html) {
  const candidates = [];
  const scriptRegex = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html))) {
    const attrs = match[1] || '';
    const content = match[2] || '';
    if (/application\/ld\+json/i.test(attrs)) {
      const parsed = tryParseJson(content);
      if (parsed) candidates.push(parsed);
      continue;
    }
    if (/id=["']__NEXT_DATA__["']/i.test(attrs)) {
      const parsed = tryParseJson(content);
      if (parsed) candidates.push(parsed);
      continue;
    }
    if (!content.includes('Event') && !content.includes('events')) continue;

    const objectStart = content.indexOf('{');
    if (objectStart >= 0) {
      const json = getBalancedJsonObject(content, objectStart);
      const parsed = json ? tryParseJson(json) : null;
      if (parsed) candidates.push(parsed);
    }
  }
  return candidates;
}

function visit(value, callback, seen = new WeakSet()) {
  if (!value || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);
  callback(value);
  if (Array.isArray(value)) {
    value.forEach((item) => visit(item, callback, seen));
    return;
  }
  Object.values(value).forEach((item) => visit(item, callback, seen));
}

function refId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value.__ref || value.id || null;
  return null;
}

function makeEntityMap(root) {
  const map = new Map();
  visit(root, (node) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    for (const [key, value] of Object.entries(node)) {
      if (key.includes(':') && value && typeof value === 'object') map.set(key, value);
    }
  });
  return map;
}

function dereference(value, map) {
  const id = refId(value);
  if (id && map.has(id)) return map.get(id);
  return value && typeof value === 'object' ? value : null;
}

function first(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function normalizeDate(value) {
  if (!value) return null;
  if (typeof value === 'number') return new Date(value > 100000000000 ? value : value * 1000).toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : value;
}

function countFrom(value, map) {
  const count = dereference(value, map) || value;
  if (count === undefined || count === null || count === '') return null;
  if (typeof count === 'number') return count;
  if (typeof count === 'string') {
    const parsed = Number(count.replace(/[^0-9]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof count === 'object') {
    return first(count.totalCount, count.count, count.value, count.rsvpCount, count.yesRsvpCount) || null;
  }
  return null;
}

function imageFrom(value, map) {
  const image = dereference(value, map) || value;
  if (!image) return null;
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) return imageFrom(image[0], map);
  return first(image.url, image.source, image.highResUrl, image.baseUrl, image.preview, image.photoUrl, image.src) || null;
}

function urlFromEvent(node) {
  const raw = first(node.url, node.eventUrl, node.link, node.event_link, node.meetupUrl, node.shareUrl);
  if (!raw) return null;
  if (typeof raw === 'string' && raw.startsWith('/')) return new URL(raw, sourceUrl).toString();
  return String(raw);
}

function idFromEvent(node, url) {
  const raw = first(node.id, node.eventId, node.event_id, node.legacyId, node.numericId);
  if (raw) return String(raw).replace(/^Event:/, '');
  const match = String(url || '').match(/\/events\/(\d+)/);
  return match?.[1] || null;
}

function looksLikeEvent(node) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return false;
  const type = first(node.__typename, node['@type'], node.type);
  const title = first(node.title, node.name);
  const url = urlFromEvent(node);
  const date = first(node.startsAt, node.startDate, node.dateTime, node.date, node.startTime, node.time);
  return Boolean(title && (url?.includes('/events/') || String(type).toLowerCase().includes('event') || date));
}

function normalizeEvent(node, map) {
  const url = urlFromEvent(node);
  const id = idFromEvent(node, url);
  const title = first(node.title, node.name);
  const startsAt = normalizeDate(first(node.startsAt, node.startDate, node.dateTime, node.date, node.startTime, node.time));
  if (!id || !title || !url || !startsAt) return null;

  const venue = dereference(first(node.venue, node.location, node.place), map) || {};
  const address = venue.address && typeof venue.address === 'object' ? venue.address : {};
  const imageUrl = imageFrom(first(node.image, node.photo, node.featuredPhoto, node.eventPhoto), map);
  const description = stripHtml(first(node.description, node.shortDescription, node.summary, node.plainTextDescription) || '');
  const eventTypeRaw = String(first(node.eventType, node.eventAttendanceMode, node.format, node.venueType) || '').toUpperCase();
  const isOnline = /ONLINE|VIRTUAL/.test(eventTypeRaw) || Boolean(first(node.isOnline, node.onlineEventUrl));
  const statusRaw = String(first(node.status, node.eventStatus) || '').toUpperCase();
  const status = statusRaw.includes('CANCEL') ? 'CANCELLED' : new Date(startsAt) < now ? 'PAST' : 'ACTIVE';

  return {
    id,
    source: 'meetup',
    title: stripEmoji(title),
    url,
    startsAt,
    endsAt: normalizeDate(first(node.endsAt, node.endDate, node.endTime)) || null,
    timezone: first(node.timezone, node.timeZone, 'Asia/Karachi'),
    status,
    eventType: isOnline ? 'ONLINE' : 'PHYSICAL',
    isOnline,
    venueName: first(venue.name, venue.title) || null,
    venueCity: first(venue.city, address.addressLocality, address.city) || null,
    imageUrl,
    attendeeCount: countFrom(first(node.attendeeCount, node.rsvpCount, node.rsvp_count, node.yesRsvpCount, node.going), map),
    lastSyncedAt: now.toISOString(),
    description: description || null,
    tags: [],
    level: 'all-levels'
  };
}

function collectEvents(candidates) {
  const byId = new Map();
  for (const candidate of candidates) {
    const map = makeEntityMap(candidate);
    visit(candidate, (node) => {
      if (!looksLikeEvent(node)) return;
      const event = normalizeEvent(node, map);
      if (event) byId.set(event.id, event);
    });
  }
  return [...byId.values()].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
}

function splitEvents(events) {
  const upcoming = [];
  const past = [];
  for (const event of events) {
    if (event.status === 'ACTIVE' && new Date(event.startsAt) >= now) upcoming.push(event);
    else past.push({ ...event, status: event.status === 'CANCELLED' ? 'CANCELLED' : 'PAST' });
  }
  past.sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt));
  return { upcoming, past };
}

function summarizeChanges(previous, next) {
  if (!previous) return ['Initial generated event file written.'];
  const oldEvents = new Map([...(previous.upcoming || []), ...(previous.past || [])].map((event) => [event.id, event]));
  const nextEvents = new Map([...(next.upcoming || []), ...(next.past || [])].map((event) => [event.id, event]));
  const changes = [];

  for (const [id, event] of nextEvents) {
    if (!oldEvents.has(id)) {
      changes.push(`Added event ${id}: ${event.title}`);
      continue;
    }
    const previousEvent = oldEvents.get(id);
    const changedFields = ['title', 'startsAt', 'endsAt', 'venueName', 'venueCity', 'status', 'eventType', 'imageUrl', 'attendeeCount', 'description']
      .filter((field) => JSON.stringify(previousEvent[field] ?? null) !== JSON.stringify(event[field] ?? null));
    if (changedFields.length) changes.push(`Updated event ${id}: ${changedFields.join(', ')}`);
  }

  for (const id of oldEvents.keys()) {
    if (!nextEvents.has(id)) changes.push(`Removed event ${id}`);
  }

  return changes.length ? changes : ['No event changes detected.'];
}

async function main() {
  const response = await fetch(sourceUrl, { headers: { accept: 'text/html,application/xhtml+xml' } });
  if (!response.ok) throw new Error(`Failed to fetch Meetup page: HTTP ${response.status}`);
  const html = await response.text();
  const candidates = extractJsonCandidates(html);
  const allEvents = collectEvents(candidates);
  if (!allEvents.length) throw new Error('No Meetup event records were found in the public page HTML.');

  const { upcoming, past } = splitEvents(allEvents);
  const next = {
    sourceUrl,
    generatedAt: now.toISOString(),
    group: {
      name: 'AWS SBG at NUCES - FAST Peshawar',
      url: sourceUrl
    },
    upcoming,
    past
  };

  let previous = null;
  try {
    previous = JSON.parse(await fs.readFile(outputFile, 'utf8'));
  } catch {
    previous = null;
  }

  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, `${JSON.stringify(next, null, 2)}\n`);
  for (const line of summarizeChanges(previous, next)) console.log(line);
  console.log(`Wrote ${upcoming.length} upcoming and ${past.length} past events to ${path.relative(process.cwd(), outputFile)}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
