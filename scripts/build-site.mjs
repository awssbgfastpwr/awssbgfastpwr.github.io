import fs from 'node:fs/promises';
import path from 'node:path';
import {
  cleanDisplayText,
  escapeHtml,
  eventCard,
  externalAttrs,
  formatDate,
  formatDateTime,
  linkButton,
  postCard,
  projectCard,
  renderPage,
  resourceCard,
  sectionIntro,
  tagList,
  toAbsoluteUrl
} from '../src/render.mjs';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const publicDir = path.join(root, 'public');
const pages = [];
const routes = [];

async function readJson(file) {
  return JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
}

async function pathExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(source, target) {
  if (!(await pathExists(source))) return;
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      await copyDir(sourcePath, targetPath);
    } else {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

async function writeRoute(routePath, html, { includeInSitemap = true } = {}) {
  const normalized = routePath === '/' ? '/' : `/${routePath.replace(/^\//, '').replace(/\/$/, '')}/`;
  const target = normalized === '/'
    ? path.join(distDir, 'index.html')
    : path.join(distDir, normalized, 'index.html');
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, html);
  routes.push(normalized);
  if (includeInSitemap) pages.push(normalized);
}

function renderStatStrip(site) {
  return `<section class="band proof-band" aria-label="Community snapshot">
    <div class="container proof-layout">
      <p class="proof-title">Community snapshot</p>
      <div class="stats-grid">
        ${site.publicStats.map((stat) => `<div class="stat-item">
          <strong>${escapeHtml(stat.value)}</strong>
          <span>${escapeHtml(stat.label)}</span>
        </div>`).join('')}
      </div>
    </div>
  </section>`;
}


function renderEventList(events, mode) {
  if (!events.length) {
    const copy = mode === 'upcoming'
      ? 'No upcoming events are scheduled right now. View Meetup for the latest updates.'
      : 'Past events appear here after Meetup publishes them.';
    return `<div class="empty-state"><p>${copy}</p><a class="text-link" href="https://www.meetup.com/aws-sbg-at-nuces/" target="_blank" rel="noopener noreferrer">Open Meetup</a></div>`;
  }
  return `<div class="event-grid">${events.map((event) => eventCard(event, mode)).join('')}</div>`;
}

function renderTrackCards(resources) {
  const tracks = [
    {
      title: 'Cloud foundations',
      level: 'Beginner',
      outcome: 'Understand accounts, regions, compute, storage, networking, databases, IAM basics, and cleanup habits.',
      resources: resources.filter((item) => item.track === 'Cloud foundations')
    },
    {
      title: 'AI and machine learning',
      level: 'Beginner to intermediate',
      outcome: 'Use AI concepts in demo plans, prompts, and project scopes.',
      resources: resources.filter((item) => item.track === 'Builder community')
    },
    {
      title: 'DevOps and cloud native',
      level: 'Intermediate',
      outcome: 'Practice GitHub workflows, deployments, containers, logging, and workshop material.',
      resources: resources.filter((item) => item.track === 'Technical unblockers')
    },
    {
      title: 'Security foundations',
      level: 'Beginner to intermediate',
      outcome: 'Use IAM, least privilege, secrets, logs, and Well-Architected security terms.',
      resources: resources.filter((item) => item.track === 'Architecture and security')
    },
    {
      title: 'Data and analytics',
      level: 'Beginner',
      outcome: 'Build a base for databases, storage patterns, dashboards, and event data workflows.',
      resources: resources.filter((item) => item.track === 'Cloud foundations')
    },
    {
      title: 'Certification prep',
      level: 'Beginner',
      outcome: 'Use free AWS learning paths to plan certification study.',
      resources: resources.filter((item) => item.track === 'Certification prep')
    }
  ];

  return `<div class="track-grid">
    ${tracks.map((track) => `<article class="track-card">
      <div class="card-topline"><span>${escapeHtml(track.level)}</span></div>
      <h3>${escapeHtml(track.title)}</h3>
      <p>${escapeHtml(track.outcome)}</p>
      ${track.resources.length ? `<div class="card-links">${track.resources.map((resource) => `<a href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(resource.title)}</a>`).join('')}</div>` : ''}
    </article>`).join('')}
  </div>`;
}

function renderTeamMember(member, memberIndex = 0) {
  const links = [
    member.linkedinUrl ? `<a href="${escapeHtml(member.linkedinUrl)}" target="_blank" rel="noopener noreferrer">LinkedIn</a>` : '',
    member.githubUrl ? `<a href="${escapeHtml(member.githubUrl)}" target="_blank" rel="noopener noreferrer">GitHub</a>` : ''
  ].filter(Boolean).join('');
  const number = String(memberIndex + 1).padStart(2, '0');
  const photo = member.photoUrl
    ? `<span class="team-member-photo"><img src="${escapeHtml(member.photoUrl)}" alt="Portrait of ${escapeHtml(member.name)}" loading="lazy" width="320" height="320"></span>`
    : '<span class="team-member-photo team-member-photo-placeholder" aria-hidden="true"><img src="/team/person-placeholder.svg" alt="" loading="lazy" width="320" height="320"></span>';

  return `<article class="team-member-card" style="--member-index: ${memberIndex};">
    <div class="team-member-card-media">
      ${photo}
      <span class="team-member-number" aria-hidden="true">${number}</span>
    </div>
    <div class="team-member-card-body">
      <div class="team-member-meta">${escapeHtml(member.department || 'Team')}</div>
      <h3>${escapeHtml(member.name)}</h3>
      <p>${escapeHtml(member.role)}</p>
    </div>
    ${links ? `<div class="team-member-links">${links}</div>` : ''}
  </article>`;
}

function renderHome({ site, events, resources, projects, posts, team, partners }) {
  const nextEvent = events.upcoming[0];
  const nextVenue = nextEvent
    ? nextEvent.isOnline
      ? 'Online'
      : nextEvent.venueName?.includes('FAST Peshawar')
        ? 'FAST Peshawar Campus'
        : nextEvent.venueCity || nextEvent.venueName || 'Location to be announced'
    : '';
  const nextEventTitle = nextEvent ? cleanDisplayText(nextEvent.title) : '';
  const recentEvents = [...events.upcoming.slice(0, 1), ...events.past.slice(0, 1)];
  const featuredProject = projects[0];
  const primaryResource = resources[0];
  const boardProjectCopy = featuredProject.nextContribution || 'Pick one small project task and publish the next useful update.';

  const heroEvent = nextEvent
    ? `<aside class="next-event-panel event-ticket" aria-label="Next event">
        <p class="panel-kicker">Next session</p>
        <h2>${escapeHtml(nextEventTitle)}</h2>
        <dl class="compact-event-meta">
          <div><dt>When</dt><dd>${escapeHtml(formatDateTime(nextEvent.startsAt))}</dd></div>
          <div><dt>Where</dt><dd>${escapeHtml(nextVenue)}</dd></div>
        </dl>
        <a class="text-link" href="${escapeHtml(nextEvent.url)}" target="_blank" rel="noopener noreferrer">Register on Meetup</a>
      </aside>`
    : `<aside class="next-event-panel event-ticket" aria-label="Next event"><p class="panel-kicker">Next session</p><h2>No scheduled event yet</h2><p>Meetup has the latest registration updates.</p><a class="text-link" href="${escapeHtml(site.meetupUrl)}" target="_blank" rel="noopener noreferrer">Open Meetup</a></aside>`;

  const paths = [
    ['Attend', 'Find the next workshop, talk, or study session.', '/events/', 'View events'],
    ['Learn', 'Start with beginner tracks and free AWS links.', '/learning/', 'Open learning'],
    ['Build', 'Pick a repo, lab, or campus tool to improve.', '/projects/', 'See projects']
  ];

  return `<section class="hero-band simplified-hero">
    <div class="hero-brand-overlay" aria-hidden="true">
      <img src="/brand/logo-horizontal-white.svg" alt="" width="300" height="80">
    </div>
    <div class="container hero-grid">
      <div class="hero-copy">
        <h1>${escapeHtml(site.siteName)}</h1>
        <p class="lede">Student-led AWS and AI at FAST NUCES Peshawar. Attend workshops, study with peers, and ship projects you can show.</p>
        <div class="hero-actions">
          ${linkButton('Join on Meetup', site.meetupUrl, 'primary')}
          <a class="text-link hero-tertiary" href="/learning/">Start learning</a>
        </div>
      </div>
      <div class="hero-stack">
        ${heroEvent}
      </div>
    </div>
  </section>
  ${renderStatStrip(site)}
  <section class="band path-band">
    <div class="container path-layout">
      <div class="path-copy">
        <h2>Choose the next useful step</h2>
        <p>Pick what you can do this week.</p>
      </div>
      <div class="path-list" aria-label="Primary community paths">
        ${paths.map(([title, copy, href, label], index) => `<article class="path-item">
          <span class="path-number">0${index + 1}</span>
          <div>
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(copy)}</p>
          </div>
          <a class="text-link" href="${escapeHtml(href)}">${escapeHtml(label)}</a>
        </article>`).join('')}
      </div>
    </div>
  </section>
  <section class="band handoff-band" aria-labelledby="handoff-title">
    <div class="container handoff-layout">
      <div class="handoff-copy">
        <p class="panel-kicker">Builder relay</p>
        <h2 id="handoff-title">Ship one proof of work this week</h2>
        <p>Use one meetup, one learning starter, and one small project task to leave a visible trace this week.</p>
        <div class="handoff-actions" aria-label="Builder relay actions">
          <a class="text-link" href="/projects/">Open project board</a>
          <a class="text-link" href="/learning/">Pick a starter</a>
        </div>
      </div>
      <div class="handoff-panel" aria-label="Suggested builder relay">
        <article class="handoff-feature">
          <span>Project focus</span>
          <h3>${escapeHtml(featuredProject.name)}</h3>
          <p>${escapeHtml(featuredProject.nextContribution || 'Choose a small project task and publish the next useful update.')}</p>
        </article>
        <div class="handoff-rail">
          <article>
            <span class="handoff-step">01</span>
            <div>
              <h3>RSVP</h3>
              <p>${escapeHtml(nextEventTitle || 'Watch Meetup for the next session.')}</p>
            </div>
            <a class="text-link" href="${escapeHtml(nextEvent?.url || site.meetupUrl)}" target="_blank" rel="noopener noreferrer">Meetup</a>
          </article>
          <article>
            <span class="handoff-step">02</span>
            <div>
              <h3>Warm up</h3>
              <p>${escapeHtml(primaryResource?.title || 'Start with an AWS learning resource.')}</p>
            </div>
            <a class="text-link" href="${escapeHtml(primaryResource?.url || '/learning/')}"${primaryResource?.url ? ' target="_blank" rel="noopener noreferrer"' : ''}>Resource</a>
          </article>
          <article>
            <span class="handoff-step">03</span>
            <div>
              <h3>Publish</h3>
              <p>Send a recap, screenshot, or pull request the team can point to.</p>
            </div>
            <a class="text-link" href="/contact/">Share</a>
          </article>
        </div>
      </div>
    </div>
  </section>
  <section class="band alt-band home-activity">
    <div class="container activity-grid">
      <section class="activity-primary" aria-labelledby="activity-title">
        <div class="section-intro compact-intro">
          <h2 id="activity-title">Current activity</h2>
          <p>Next session and one recent recap.</p>
        </div>
        <div class="activity-list">
          ${recentEvents.map((event, index) => `<article class="activity-row">
            <time datetime="${escapeHtml(event.startsAt)}">${escapeHtml(formatDate(event.startsAt))}</time>
            <div>
              <h3>${escapeHtml(cleanDisplayText(event.title))}</h3>
              <p>${escapeHtml(event.isOnline ? 'Online session' : event.venueCity || 'FAST Peshawar')}</p>
            </div>
            <a href="${escapeHtml(event.url)}" target="_blank" rel="noopener noreferrer">${index === 0 && events.upcoming.includes(event) ? 'Register' : 'View'}</a>
          </article>`).join('')}
        </div>
      </section>
      <aside class="builder-board builder-board-compact" aria-label="Builder board">
        <p class="panel-kicker">Builder board</p>
        <h2>One useful next step</h2>
        <p class="builder-board-project"><strong>${escapeHtml(featuredProject.name)}</strong>${escapeHtml(boardProjectCopy)}</p>
        <div class="builder-board-actions">
          <a class="text-link" href="/projects/">Open project</a>
          <a class="text-link" href="/events/">All events</a>
        </div>
      </aside>
    </div>
  </section>
  <section class="band final-cta slim-cta">
    <div class="container cta-row">
      <div>
        <h2>Join the next session</h2>
        <p>Register for an event, follow announcements, or send the team a note.</p>
      </div>
      <div class="hero-actions">
        ${linkButton('Join on Meetup', site.meetupUrl, 'primary')}
        ${linkButton('Contact the team', '/contact/', 'secondary')}
      </div>
    </div>
  </section>`;
}



function eventDateParts(iso) {
  if (!iso) return { month: 'TBA', day: '--', weekday: '' };
  const date = new Date(iso);
  return {
    month: new Intl.DateTimeFormat('en-PK', { timeZone: 'Asia/Karachi', month: 'short' }).format(date).toUpperCase(),
    day: new Intl.DateTimeFormat('en-PK', { timeZone: 'Asia/Karachi', day: '2-digit' }).format(date),
    weekday: new Intl.DateTimeFormat('en-PK', { timeZone: 'Asia/Karachi', weekday: 'short' }).format(date).toUpperCase()
  };
}

function formatEventTimeRange(event) {
  if (!event?.startsAt) return 'Time to be announced';
  const formatter = new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: 'numeric',
    minute: '2-digit'
  });
  const start = formatter.format(new Date(event.startsAt));
  const end = event.endsAt ? formatter.format(new Date(event.endsAt)) : '';
  return `${start}${end ? ` - ${end}` : ''} PKT`;
}

function shortVenue(event) {
  if (!event) return 'Location to be announced';
  if (event.isOnline) return 'Online';
  if (event.venueName?.includes('FAST Peshawar')) return 'FAST Peshawar';
  return event.venueCity || event.venueName || 'Location to be announced';
}

function renderEventsShowcase(site, events) {
  const nextEvent = events.upcoming[0];
  const date = eventDateParts(nextEvent?.startsAt);
  const title = nextEvent ? cleanDisplayText(nextEvent.title) : 'Next session coming soon';
  const venue = shortVenue(nextEvent);
  const href = nextEvent?.url || site.meetupUrl;
  const label = nextEvent ? 'Register on Meetup' : 'Open Meetup';

  return `<section class="events-showcase-band" aria-labelledby="events-showcase-title">
    <div class="container events-showcase">
      <div class="events-showcase-copy">
        <h1 id="events-showcase-title">Next session</h1>
        <p>Join upcoming sessions to learn, build, and connect with the cloud community.</p>
        <article class="events-ticket" aria-label="Featured event">
          <div class="events-date-tile" aria-hidden="true">
            <span>${escapeHtml(date.month)}</span>
            <strong>${escapeHtml(date.day)}</strong>
            <span>${escapeHtml(date.weekday)}</span>
          </div>
          <div class="events-ticket-body">
            <p class="panel-kicker">Upcoming</p>
            <h2>${escapeHtml(title)}</h2>
            <dl>
              <div><dt>Time</dt><dd>${escapeHtml(nextEvent ? formatEventTimeRange(nextEvent) : 'Time to be announced')}</dd></div>
              <div><dt>Venue</dt><dd>${escapeHtml(venue)}</dd></div>
            </dl>
            <a class="button primary" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(label)}</span><span class="button-mark" aria-hidden="true"><svg viewBox="0 0 16 16" focusable="false"><path d="M5 3.5h7.5V11"/><path d="M12.2 3.8 3.5 12.5"/></svg></span></a>
          </div>
        </article>
      </div>
      <figure class="events-showcase-image">
        <img src="/media/events-audience-showcase.jpg" alt="Students attending a cloud community session" width="757" height="815" loading="eager">
      </figure>
    </div>
  </section>`;
}


function renderAbout(site) {
  const values = ['Build in public', 'Learn by doing', 'Share knowledge', 'Keep beginner access open', 'Respect community safety', 'Build projects over passive content'];
  const timeline = [
    ['2025-07', 'The public Meetup history lists Introduction to AWS and AWS Cloud Clubs.'],
    ['2025-10', 'FAST Peshawar hosted orientation activity.'],
    ['2025-11', 'The group hosted a Kubernetes session with Andy Suderman.'],
    ['2025-12', 'Student Community Day planning moved to LinkedIn and partner channels.'],
    ['2026', 'The group starts using AWS Student Builder Group FAST Peshawar.']
  ];

  return `<section class="page-heading image-heading about-heading"><div class="container"><h1>About</h1><p>${escapeHtml(site.mission)}</p></div></section>
  <section class="band"><div class="container two-column">
    <article class="content-block"><h2>Current identity</h2><p>Students now publish under AWS Student Builder Group FAST Peshawar. The group began as ${escapeHtml(site.formerName)} and keeps the same campus focus.</p><p>Join a beginner session with curiosity and a laptop when the event asks for one.</p></article>
    <article class="content-block"><h2>Who it serves</h2><ul class="plain-list"><li>FAST Peshawar students starting cloud or AI.</li><li>Students from other universities when an event welcomes guests.</li><li>Alumni and engineers who can mentor, speak, or review projects.</li><li>Campus groups and companies with a talk, workshop, or support request.</li></ul></article>
  </div></section>
  <section class="band alt-band"><div class="container">
    ${sectionIntro('Values', 'Students learn by building and sharing the work.')}
    <div class="value-grid">${values.map((value) => `<div class="value-item">${escapeHtml(value)}</div>`).join('')}</div>
  </div></section>
  <section class="band"><div class="container two-column">
    <div>${sectionIntro('History', '')}<div class="timeline">${timeline.map(([date, copy]) => `<div><time>${escapeHtml(date)}</time><p>${escapeHtml(copy)}</p></div>`).join('')}</div></div>
    <div>${sectionIntro('Governance', '')}<div class="content-block"><p>The Executive Body leads club planning, approvals, and coordination.</p><p>Core teams handle technical work, events, outreach, media, research, and content.</p><p>The finalized 2025 structure is listed on the Team page.</p></div></div>
  </div></section>`;
}

function renderEventsPage(site, events) {
  const eventCount = events.upcoming.length + events.past.length;
  return `${renderEventsShowcase(site, events)}
  <section class="band"><div class="container">
    <div class="toolbar" aria-label="Event filters">
      <button type="button" class="filter-button active" data-event-filter="all">All</button>
      <button type="button" class="filter-button" data-event-filter="beginner all-levels">Beginner friendly</button>
      <button type="button" class="filter-button" data-event-filter="physical">In person</button>
      <button type="button" class="filter-button" data-event-filter="online">Online</button>
      <span>${eventCount} event${eventCount === 1 ? '' : 's'}</span>
    </div>
    ${sectionIntro('Upcoming', 'Times use Pakistan time when an event provides one.')}
    ${renderEventList(events.upcoming, 'upcoming')}
  </div></section>
  <section class="band alt-band"><div class="container">
    ${sectionIntro('Past', 'Recent group sessions.')}
    ${renderEventList(events.past, 'past')}
    <p class="terms-note">Register on Meetup. Check the event page for venue details.</p>
  </div></section>`;
}

function renderLearningPage(resources) {
  return `<section class="page-heading image-heading learning-heading"><div class="container"><h1>Learning Tracks</h1><p>Start with fundamentals, use free AWS links, then turn one topic into a workshop build or small project.</p></div></section>
  <section class="band"><div class="container">${renderTrackCards(resources)}</div></section>
  <section class="band alt-band"><div class="container">
    ${sectionIntro('Free resources', 'Start with these links before paying for courses.')}
    <div class="resource-grid">${resources.map(resourceCard).join('')}</div>
  </div></section>`;
}

function renderProjectsPage(projects) {
  return `<section class="page-heading image-heading projects-heading"><div class="container"><h1>Student Projects</h1><p>Browse active builds and project ideas. Each listing names the problem, status, and next contribution.</p></div></section>
  <section class="band"><div class="container"><div class="project-grid">${projects.map(projectCard).join('')}</div></div></section>`;
}

function renderTeamPage(team) {
  const groupOrder = [
    'Executive Body',
    'Technical Team',
    'Events Team',
    'Outreach and Social Media Team',
    'Media and Visual Production Team',
    'Research and Content Team'
  ];
  const departmentNotes = {
    'Executive Body': 'Direction, approvals, continuity, and cross-team coordination.',
    'Technical Team': 'Workshops, infrastructure, cloud labs, and project execution.',
    'Events Team': 'Room planning, registration flow, logistics, and session operations.',
    'Outreach and Social Media Team': 'Announcements, community engagement, campaigns, and digital presence.',
    'Media and Visual Production Team': 'Photography, reels, editing, and visual records for every program.',
    'Research and Content Team': 'Technical writing, graphics support, learning references, and knowledge capture.'
  };
  const sortedTeam = [...team].sort((a, b) => a.order - b.order);
  const groupedTeam = groupOrder
    .map((department) => [department, sortedTeam.filter((member) => member.department === department)])
    .filter(([, members]) => members.length);
  const totalMembers = sortedTeam.length;
  const totalDepartments = groupedTeam.length;
  const captain = sortedTeam[0];
  const executiveMembers = sortedTeam.filter((member) => member.department === 'Executive Body').slice(0, 5);
  const memberLabel = (count) => String(count) + ' ' + (count === 1 ? 'member' : 'members');
  const departmentSlug = (department) => department.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const heroPortraits = executiveMembers
    .map((member, index) => `<span class="team-hero-avatar" style="--avatar-index: ${index};"><img src="${escapeHtml(member.photoUrl || '/team/person-placeholder.svg')}" alt="" loading="lazy" width="96" height="96"></span>`)
    .join('');

  return `<section class="team-hero" aria-labelledby="team-page-title">
    <div class="container team-hero-grid">
      <div class="team-hero-copy">
        <span class="team-page-mark">2025 operating roster</span>
        <h1 id="team-page-title">Team</h1>
        <p>The 2025 AWS Student Builder Group FAST Peshawar roster, organized by the groups that run sessions, technical work, media, outreach, and student support.</p>
        <div class="team-hero-actions">
          <a class="team-hero-link" href="#team-roster"><span>Browse roster</span><span class="team-hero-link-mark" aria-hidden="true"><svg viewBox="0 0 16 16" focusable="false"><path d="M8 3v10"></path><path d="m4 9 4 4 4-4"></path></svg></span></a>
        </div>
      </div>
      <aside class="team-command-panel" aria-label="Team roster summary">
        <div class="team-command-topline"><span>Captain</span><span>2025 roster</span></div>
        <div class="team-command-layout">
          <div class="team-command-portrait"><img src="${escapeHtml(captain?.photoUrl || '/team/person-placeholder.svg')}" alt="Portrait of ${escapeHtml(captain?.name || 'Team captain')}" loading="eager" width="640" height="640"></div>
          <div class="team-command-copy">
            <h2>${escapeHtml(captain?.name || 'Team captain')}</h2>
            <p>${escapeHtml(captain?.role || 'Captain')}</p>
          </div>
        </div>
        <div class="team-command-metrics">
          <div><strong>${escapeHtml(String(totalMembers))}</strong><span>members</span></div>
          <div><strong>${escapeHtml(String(totalDepartments))}</strong><span>groups</span></div>
          <div><strong>2025</strong><span>structure</span></div>
        </div>
        <div class="team-avatar-ribbon" aria-hidden="true">${heroPortraits}</div>
      </aside>
    </div>
  </section>
  <section class="team-directory-band" aria-label="Department shortcuts">
    <div class="container team-directory-layout">
      <div class="team-directory-intro">
        <span class="team-section-kicker">Directory</span>
        <h2>Find the right group.</h2>
        <p>Leadership, technical delivery, events, outreach, media, and research stay visible in one place.</p>
      </div>
      <nav class="team-department-strip">
        ${groupedTeam.map(([department, members], index) => `<a class="team-department-chip" href="#team-${departmentSlug(department)}" style="--team-index: ${index};"><span>${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(department)}</strong><em>${escapeHtml(memberLabel(members.length))}</em></a>`).join('')}
      </nav>
    </div>
  </section>
  <section class="team-roster-band" id="team-roster"><div class="container team-structure">
    ${groupedTeam.map(([department, members], sectionIndex) => `<section class="team-section" aria-labelledby="team-${departmentSlug(department)}" style="--section-index: ${sectionIndex};">
      <div class="team-section-rail">
        <span class="team-section-kicker">Unit ${String(sectionIndex + 1).padStart(2, '0')}</span>
        <h2 id="team-${departmentSlug(department)}">${escapeHtml(department)}</h2>
        <p>${escapeHtml(departmentNotes[department] || 'Team responsibilities and active roles.')}</p>
        <div class="team-section-proof"><strong>${escapeHtml(String(members.length))}</strong><span>active roles</span></div>
      </div>
      <div class="team-roster-list">
        ${members.map((member, memberIndex) => renderTeamMember(member, memberIndex)).join('')}
      </div>
    </section>`).join('')}
  </div></section>`;
}

function renderCommunityPage() {
  const faqs = [
    ['Do I need AWS experience?', 'No. Beginner sessions start with fundamentals.'],
    ['Are events free?', 'Most student community events are free unless the event page says otherwise.'],
    ['Where do I register?', 'Events use Meetup unless the event page says otherwise.'],
    ['Can non-FAST students attend?', 'Some events welcome students from other campuses. Check the event page.'],
    ['Can I speak at an event?', 'Yes. Use the contact page to propose a talk or workshop.'],
    ['Do events include certificates?', 'Some events include certificates. Check the event page.']
  ];

  return `<section class="page-heading image-heading community-heading"><div class="container"><h1>Community</h1><p>Rules, contribution paths, and common questions for students and collaborators.</p></div></section>
  <section class="band"><div class="container two-column">
    <article class="content-block"><h2>Membership</h2><ul class="plain-list"><li>Join Meetup to register for events.</li><li>Follow LinkedIn for announcements and recaps.</li><li>Contribute to projects, recap material, or learning links.</li><li>Bring a laptop when the event page asks for one.</li></ul></article>
    <article class="content-block"><h2>Code of conduct</h2><p>Respect other students. Do not harass, attack, spam, or misuse channels.</p><p>Send conduct concerns through the contact page. The team reviews them.</p></article>
  </div></section>
  <section class="band alt-band"><div class="container">
    ${sectionIntro('FAQ', '')}
    <div class="faq-list">${faqs.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join('')}</div>
  </div></section>`;
}

function renderBlogPage(posts) {
  return `<section class="page-heading"><div class="container"><h1>Blog</h1><p>Announcements, recaps, tutorials, and project notes.</p></div></section>
  <section class="band"><div class="container"><div class="post-list">${posts.map(postCard).join('')}</div></div></section>`;
}

function renderPostPage(post) {
  return `<article class="article-page">
    <div class="container narrow">
      <a class="text-link" href="/blog/">Back to blog</a>
      <h1>${escapeHtml(post.title)}</h1>
      <p class="article-meta">${escapeHtml(formatDate(post.date))} · ${escapeHtml(post.author)} · ${escapeHtml(post.category)}</p>
      <p class="lede">${escapeHtml(post.summary)}</p>
      ${post.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
      ${tagList(post.tags || [])}
    </div>
  </article>`;
}

function renderPartnersPage(partners) {
  return `<section class="page-heading image-heading partners-heading"><div class="container"><h1>Partners</h1><p>Campus groups, communities, and companies can propose talks, workshops, mentoring, or project support.</p></div></section>
  <section class="band"><div class="container partner-grid">
    ${partners.map((partner) => `<article class="partner-card">
      <div class="card-topline"><span>${escapeHtml(partner.category)}</span></div>
      <h2>${escapeHtml(partner.name)}</h2>
      <p>${escapeHtml(partner.description)}</p>
      ${partner.websiteUrl ? `<a class="text-link" href="${escapeHtml(partner.websiteUrl)}"${externalAttrs(partner.websiteUrl)}>Visit website</a>` : ''}
    </article>`).join('')}
  </div></section>
  <section class="band alt-band"><div class="container cta-row"><div><h2>Speak, sponsor, or co-host</h2><p>Send a proposal. The team replies with next steps.</p></div>${linkButton('Contact the team', '/contact/', 'primary')}</div></section>`;
}

function renderContactPage(site) {
  const options = [
    ['membership', 'Membership'],
    ['speaker-proposal', 'Speaker proposal'],
    ['partnership', 'Partnership'],
    ['sponsorship', 'Sponsorship'],
    ['media', 'Media'],
    ['volunteer', 'Volunteer'],
    ['certificate-help', 'Certificate help'],
    ['code-of-conduct', 'Code of conduct']
  ];

  return `<section class="page-heading image-heading contact-heading"><div class="container"><h1>Contact</h1><p>Use this form for membership, talks, partnerships, sponsorships, media, volunteering, certificate help, or conduct concerns.</p></div></section>
  <section class="band"><div class="container form-layout">
    <form class="contact-form" action="${escapeHtml(site.formSubmitEndpoint)}" method="POST" accept-charset="UTF-8">
      <input type="hidden" name="_subject" value="AWS SBG FAST Peshawar website inquiry">
      <input type="hidden" name="_template" value="table">
      <input type="hidden" name="_next" value="${escapeHtml(site.contactSuccessUrl)}">
      <input type="text" name="_honey" tabindex="-1" autocomplete="off" class="sr-only" aria-hidden="true">
      <div class="field-grid">
        <label class="field-block" for="contact-name">Name<span class="field-help" id="contact-name-help">Use your full name.</span><input id="contact-name" name="name" autocomplete="name" maxlength="120" aria-describedby="contact-name-help contact-name-error" required><span class="field-error" id="contact-name-error" hidden>Enter your name.</span></label>
        <label class="field-block" for="contact-email">Email<span class="field-help" id="contact-email-help">Use an address where the team can reply.</span><input id="contact-email" name="email" type="email" autocomplete="email" maxlength="254" aria-describedby="contact-email-help contact-email-error" required><span class="field-error" id="contact-email-error" hidden>Enter a valid email address.</span></label>
      </div>
      <div class="field-grid">
        <label class="field-block" for="contact-affiliation">Affiliation<span class="field-help" id="contact-affiliation-help">Campus, alumni, community, or company.</span><input id="contact-affiliation" name="affiliation" autocomplete="organization" maxlength="120" placeholder="FAST Peshawar" aria-describedby="contact-affiliation-help"></label>
        <label class="field-block" for="contact-inquiry-type">Inquiry type<span class="field-help" id="contact-inquiry-type-help">Choose the closest match.</span><select id="contact-inquiry-type" name="inquiryType" aria-describedby="contact-inquiry-type-help contact-inquiry-type-error" required>${options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select><span class="field-error" id="contact-inquiry-type-error" hidden>Choose an inquiry type.</span></label>
      </div>
      <div class="field-grid">
        <label class="field-block" for="contact-profile">LinkedIn or profile URL<span class="field-help" id="contact-profile-help">Optional.</span><input id="contact-profile" name="linkedinUrl" type="url" maxlength="2000" placeholder="https://" aria-describedby="contact-profile-help contact-profile-error"><span class="field-error" id="contact-profile-error" hidden>Enter a valid URL.</span></label>
        <label class="field-block" for="contact-event">Event or certificate ID<span class="field-help" id="contact-event-help">Optional.</span><input id="contact-event" name="eventName" maxlength="120" placeholder="Optional" aria-describedby="contact-event-help"></label>
      </div>
      <label class="field-block" for="contact-message">Message<span class="field-help" id="contact-message-help">Tell us what you need and include helpful links.</span><textarea id="contact-message" name="message" rows="7" maxlength="2000" aria-describedby="contact-message-help contact-message-error" required></textarea><span class="field-error" id="contact-message-error" hidden>Enter a short message.</span></label>
      <label class="consent-row" for="contact-consent"><input id="contact-consent" name="consent" type="checkbox" value="yes" aria-describedby="contact-consent-error" required><span>I agree that the team can use this message to respond to my inquiry.</span><span class="field-error" id="contact-consent-error" hidden>Consent is required before sending.</span></label>
      <button class="button primary" type="submit">Send inquiry</button>
    </form>
    <aside class="content-block">
      <h2>Before sending</h2>
      <p>Share only details the team needs.</p>
      <p>Register on Meetup. Use Verify for certificate checks.</p>
      <div class="card-links"><a href="${escapeHtml(site.meetupUrl)}" target="_blank" rel="noopener noreferrer">Meetup</a><a href="/verify/">Verify certificate</a></div>
    </aside>
  </div></section>`;
}

function renderThanksPage(site) {
  return `<section class="page-heading"><div class="container"><h1>Inquiry sent</h1><p>The team received your inquiry.</p></div></section>
  <section class="band"><div class="container cta-row"><div><h2>Next steps</h2><p>Register on Meetup. Follow LinkedIn for announcements and recaps.</p></div><div class="hero-actions">${linkButton('Back home', '/', 'secondary')}${linkButton('Open Meetup', site.meetupUrl, 'primary')}</div></div></section>`;
}

function renderVerifyPage(site) {
  return `<section class="page-heading"><div class="container"><h1>Verify a certificate</h1><p>Enter the code from a certificate QR link.</p></div></section>
  <section class="band"><div class="container verify-layout">
    <form class="verify-form" data-verify-form>
      <label class="field-block" for="certificate-code">Certificate code<span class="field-help" id="certificate-code-help">Use the short code from the certificate link.</span><input id="certificate-code" name="code" inputmode="text" autocomplete="off" placeholder="Example: ABC123" aria-describedby="certificate-code-help certificate-code-error" data-code-input required><span class="field-error" id="certificate-code-error" hidden>Enter a certificate code.</span></label>
      <button class="button primary" type="submit">Check status</button>
    </form>
    <section class="verify-result" data-verify-result data-api="${escapeHtml(site.certificateVerifyApi)}" aria-live="polite">
      <h2>Waiting for a code</h2>
      <p>Scan a certificate QR code or enter the short code manually.</p>
    </section>
    <aside class="content-block"><h2>Need help?</h2><p>If a certificate does not verify, choose certificate help on the contact form.</p><a class="text-link" href="/contact/">Contact support</a></aside>
  </div></section>`;
}

function renderNotFound(site) {
  return `<section class="page-heading"><div class="container"><h1>Page not found</h1><p>Check the link or start from a main page.</p></div></section>
  <section class="band"><div class="container cta-row"><div><h2>Useful links</h2><p>Try the homepage, events page, or contact page.</p></div><div class="hero-actions">${linkButton('Home', '/', 'primary')}${linkButton('Events', '/events/', 'secondary')}${linkButton('Contact', '/contact/', 'secondary')}</div></div></section>`;
}

function jsonLd(site) {
  return `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.siteName,
    alternateName: site.formerName,
    url: site.siteUrl,
    sameAs: [site.meetupUrl, site.linkedinUrl, site.githubUrl]
  })}</script>`;
}

function eventSchema(site, event) {
  const imageUrl = event.imageUrl
    ? event.imageUrl.startsWith('http')
      ? event.imageUrl
      : toAbsoluteUrl(site, event.imageUrl)
    : undefined;

  return `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: cleanDisplayText(event.title),
    startDate: event.startsAt,
    endDate: event.endsAt || undefined,
    eventAttendanceMode: event.isOnline ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: event.isOnline ? { '@type': 'VirtualLocation', url: event.url } : { '@type': 'Place', name: event.venueName, address: event.venueCity },
    organizer: { '@type': 'Organization', name: site.siteName, url: site.siteUrl },
    url: event.url,
    image: imageUrl ? [imageUrl] : undefined,
    description: cleanDisplayText(event.description || site.description)
  })}</script>`;
}

async function main() {
  const [site, events, resources, projects, team, partners, posts] = await Promise.all([
    readJson('data/site.json'),
    readJson('data/events.generated.json'),
    readJson('data/resources.json'),
    readJson('data/projects.json'),
    readJson('data/team.json'),
    readJson('data/partners.json'),
    readJson('data/posts.json')
  ]);

  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });
  await copyDir(publicDir, distDir);

  const eventHead = events.upcoming[0] ? eventSchema(site, events.upcoming[0]) : '';

  await writeRoute('/', renderPage({
    site,
    title: site.siteName,
    description: 'Students at FAST Peshawar study AWS, AI, DevOps, security, and cloud engineering together.',
    path: '/',
    head: `${jsonLd(site)}${eventHead}`,
    body: renderHome({ site, events, resources, projects, posts, team, partners })
  }));

  await writeRoute('/about/', renderPage({ site, title: 'About', description: 'Mission, history, rebrand context, audience, values, and governance for AWS Student Builder Group FAST Peshawar.', path: '/about/', body: renderAbout(site) }));
  await writeRoute('/events/', renderPage({ site, title: 'Events', description: 'Upcoming and past Meetup events for AWS Student Builder Group FAST Peshawar.', path: '/events/', body: renderEventsPage(site, events), scripts: ['/scripts/events.js'] }));
  await writeRoute('/learning/', renderPage({ site, title: 'Learning Tracks', description: 'Free learning tracks for cloud foundations, AI, DevOps, security, data, and AWS certification prep.', path: '/learning/', body: renderLearningPage(resources) }));
  await writeRoute('/projects/', renderPage({ site, title: 'Student Projects', description: 'Student projects and contribution paths for AWS Student Builder Group FAST Peshawar.', path: '/projects/', body: renderProjectsPage(projects) }));
  await writeRoute('/team/', renderPage({ site, title: 'Team', description: 'Finalized 2025 team structure for AWS Student Builder Group FAST Peshawar.', path: '/team/', body: renderTeamPage(team) }));
  await writeRoute('/community/', renderPage({ site, title: 'Community', description: 'Rules, code of conduct, FAQs, and contribution paths for FAST Peshawar student builders.', path: '/community/', body: renderCommunityPage() }));
  await writeRoute('/blog/', renderPage({ site, title: 'Blog', description: 'Announcements, learning notes, project updates, and recaps from AWS Student Builder Group FAST Peshawar.', path: '/blog/', body: renderBlogPage(posts) }));
  await writeRoute('/partners/', renderPage({ site, title: 'Partners', description: 'Talk, workshop, mentorship, and project support routes for AWS Student Builder Group FAST Peshawar.', path: '/partners/', body: renderPartnersPage(partners) }));
  await writeRoute('/contact/', renderPage({ site, title: 'Contact', description: 'Contact AWS Student Builder Group FAST Peshawar for membership, speakers, partners, sponsors, media, volunteering, certificate help, or conduct concerns.', path: '/contact/', body: renderContactPage(site) }));
  await writeRoute('/contact/thanks/', renderPage({ site, title: 'Inquiry Sent', description: 'Confirmation page for AWS Student Builder Group FAST Peshawar contact form submissions.', path: '/contact/thanks/', body: renderThanksPage(site), robots: 'noindex,follow' }), { includeInSitemap: false });
  await writeRoute('/verify/', renderPage({ site, title: 'Verify a Certificate', description: 'Verify an AWS Student Builder Group FAST Peshawar certificate code from a QR link or short code.', path: '/verify/', body: renderVerifyPage(site), scripts: ['/scripts/verify.js'] }));

  for (const post of posts) {
    await writeRoute(`/blog/${post.slug}/`, renderPage({
      site,
      title: post.title,
      description: post.summary,
      path: `/blog/${post.slug}/`,
      body: renderPostPage(post),
      head: `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: post.title, datePublished: post.date, author: { '@type': 'Organization', name: post.author }, description: post.summary, url: toAbsoluteUrl(site, `/blog/${post.slug}/`) })}</script>`
    }));
  }

  const notFound = renderPage({ site, title: 'Page Not Found', description: 'The page could not be found on AWS Student Builder Group FAST Peshawar.', path: '/404/', body: renderNotFound(site), robots: 'noindex,follow' });
  await writeRoute('/404/', notFound, { includeInSitemap: false });
  await fs.writeFile(path.join(distDir, '404.html'), notFound);

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((pagePath) => `  <url><loc>${toAbsoluteUrl(site, pagePath)}</loc></url>`).join('\n')}\n</urlset>\n`;
  await fs.writeFile(path.join(distDir, 'sitemap.xml'), sitemap);
  await fs.writeFile(path.join(distDir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${toAbsoluteUrl(site, '/sitemap.xml')}\n`);

  console.log(`Built ${routes.length} routes into ${path.relative(root, distDir)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
