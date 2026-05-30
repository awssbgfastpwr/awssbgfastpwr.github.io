export const navItems = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about/' },
  { label: 'Events', href: '/events/' },
  { label: 'Learning', href: '/learning/' },
  { label: 'Projects', href: '/projects/' },
  { label: 'Team', href: '/team/' },
  { label: 'Contact', href: '/contact/' }
];

export const secondaryItems = [
  { label: 'Community', href: '/community/' },
  { label: 'Blog', href: '/blog/' },
  { label: 'Partners', href: '/partners/' },
  { label: 'Verify', href: '/verify/' }
];

export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function cleanDisplayText(value = '') {
  return String(value)
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
    .replace(/[\u2014]/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

export function externalAttrs(url) {
  return url?.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : '';
}

export function toAbsoluteUrl(site, path = '/') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(cleanPath, site.siteUrl).toString();
}

export function formatDateTime(iso) {
  if (!iso) return 'Date to be announced';
  const formatter = new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });
  return formatter.format(new Date(iso));
}

export function formatDate(iso) {
  if (!iso) return 'Date to be announced';
  const formatter = new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  return formatter.format(new Date(iso));
}

export function pageTitle(title, site) {
  return title === site.siteName ? title : `${title} | ${site.siteName}`;
}

export function icon(name, alt = '') {
  return `<img class="icon" src="/brand/icons/${name}.svg" alt="${escapeHtml(alt)}" loading="lazy">`;
}

export function chip(value) {
  return `<span class="chip">${escapeHtml(value)}</span>`;
}

export function tagList(values = []) {
  return values.length ? `<div class="chip-row">${values.map(chip).join('')}</div>` : '';
}

export function textSummary(value = '', maxLength = 260) {
  const text = cleanDisplayText(value)
    .replace(/\*\*/g, '')
    .replace(/[#*_`]/g, '')
    .replace(/\\\|/g, '|')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

export function attendeeCount(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value.totalCount ?? value.count ?? value.value ?? null;
  }
  return null;
}

export function linkButton(label, href, variant = 'primary') {
  return `<a class="button ${variant}" href="${escapeHtml(href)}"${externalAttrs(href)}><span>${escapeHtml(label)}</span><span class="button-mark" aria-hidden="true"><svg viewBox="0 0 16 16" focusable="false"><path d="M5 3.5h7.5V11"/><path d="M12.2 3.8 3.5 12.5"/></svg></span></a>`;
}

export function renderHeader(site, activePath = '/') {
  const nav = navItems
    .map((item) => {
      const active = item.href === activePath || (item.href !== '/' && activePath.startsWith(item.href));
      return `<a href="${item.href}"${active ? ' aria-current="page"' : ''}>${escapeHtml(item.label)}</a>`;
    })
    .join('');

  return `<header class="site-header">
    <a class="brand brand-lockup" href="/" aria-label="${escapeHtml(site.siteName)} home">
      <span class="brand-icon" aria-hidden="true"><img src="/brand/icon-white.svg" alt="" width="56" height="56"></span>
      <span class="brand-text">
        <span class="brand-name">AWS Student Builder Group</span>
        <span class="brand-location">FAST Peshawar</span>
      </span>
    </a>
    <nav id="primary-nav" class="primary-nav" aria-label="Primary navigation">
      ${nav}
      <a class="nav-join" href="${escapeHtml(site.meetupUrl)}" target="_blank" rel="noopener noreferrer">Join</a>
    </nav>
    <div class="header-actions">
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav">
        <span></span><span></span><span></span>
        <span class="sr-only">Menu</span>
      </button>
    </div>
  </header>`;
}

export function renderFooter(site) {
  const quickLinks = [...navItems.slice(1), ...secondaryItems]
    .map((item) => `<a href="${item.href}">${escapeHtml(item.label)}</a>`)
    .join('');

  return `<footer class="site-footer">
    <div class="footer-main">
      <div>
        <img src="/brand/logo-horizontal-white.svg" alt="${escapeHtml(site.siteName)}" width="270" height="72">
        <p>${escapeHtml(site.description)} Attend sessions, build projects, and study with FAST Peshawar students.</p>
      </div>
      <div>
        <h2>Site</h2>
        <div class="footer-links">${quickLinks}</div>
      </div>
      <div>
        <h2>Channels</h2>
        <div class="footer-links">
          <a href="${escapeHtml(site.meetupUrl)}" target="_blank" rel="noopener noreferrer">Meetup</a>
          <a href="${escapeHtml(site.linkedinUrl)}" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a href="${escapeHtml(site.githubUrl)}" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
      </div>
    </div>
    <div class="footer-note">
      <p>Student-led at FAST NUCES Peshawar. Formerly ${escapeHtml(site.formerName)}.</p>
      <p>Study. Build. Share.</p>
    </div>
  </footer>`;
}

function urlOrigin(value = '') {
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
}

function contentSecurityPolicy(site) {
  const formOrigin = urlOrigin(site.formSubmitEndpoint) || "'self'";
  const verifyOrigin = urlOrigin(site.certificateVerifyApi);
  const connectSrc = ["'self'", verifyOrigin].filter(Boolean).join(' ');

  return [
    "default-src 'self'",
    "base-uri 'self'",
    `connect-src ${connectSrc}`,
    "font-src 'self' data:",
    `form-action ${formOrigin}`,
    "img-src 'self' data: https:",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "upgrade-insecure-requests"
  ].join('; ');
}

export function renderPage({ site, title, description, path, body, scripts = [], head = '', robots = 'index,follow' }) {
  const fullTitle = pageTitle(title, site);
  const canonical = toAbsoluteUrl(site, path);
  const scriptTags = scripts.map((src) => `<script src="${src}" defer></script>`).join('\n');
  const csp = contentSecurityPolicy(site);

  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="${escapeHtml(robots)}">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="en_PK">
  <meta property="og:site_name" content="${escapeHtml(site.siteName)}">
  <meta property="og:title" content="${escapeHtml(fullTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${toAbsoluteUrl(site, '/brand/og-default.png')}">
  <meta property="og:image:alt" content="${escapeHtml(site.siteName)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(fullTitle)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${toAbsoluteUrl(site, '/brand/og-default.png')}">
  <meta name="theme-color" content="#101214">
  <script>
    (() => {
      const root = document.documentElement;
      root.dataset.theme = 'dark';
      root.style.colorScheme = 'dark';
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) root.classList.add('motion-ok');
    })();
  </script>
  <link rel="icon" href="/brand/icon-blue.svg" type="image/svg+xml">
  <link rel="preload" href="/styles/site.css" as="style">
  <link rel="stylesheet" href="/styles/site.css">
  ${head}
</head>
<body>
  <div class="scroll-sentinel" aria-hidden="true"></div>
  ${renderHeader(site, path)}
  <main id="main">
    ${body}
  </main>
  ${renderFooter(site)}
  <script src="/scripts/site.js" defer></script>
  ${scriptTags}
</body>
</html>`;
}

export function eventCard(event, mode = 'upcoming') {
  const cta = mode === 'upcoming' ? 'Register on Meetup' : 'View on Meetup';
  const format = event.isOnline ? 'Online' : event.eventType === 'HYBRID' ? 'Hybrid' : 'In person';
  const location = event.isOnline ? 'Online' : [event.venueName, event.venueCity].filter(Boolean).join(', ');
  const dataTags = [event.level, event.eventType, ...(event.tags || [])].filter(Boolean).join(' ').toLowerCase();
  const rsvps = attendeeCount(event.attendeeCount);
  const title = cleanDisplayText(event.title);
  const summary = event.description ? textSummary(event.description) : '';

  return `<article class="event-card${event.imageUrl ? ' has-image' : ''}" data-filter="${escapeHtml(dataTags)}">
    ${event.imageUrl ? `<img class="event-card-image" src="${escapeHtml(event.imageUrl)}" alt="${escapeHtml(title)}" loading="lazy">` : ''}
    <div class="event-card-body">
      <div class="card-topline">
        <span>${escapeHtml(format)}</span>
        <span>${escapeHtml(event.level || 'all-levels')}</span>
      </div>
      <h3>${escapeHtml(title)}</h3>
      <dl class="event-meta">
        <div><dt>Date</dt><dd>${escapeHtml(formatDateTime(event.startsAt))}</dd></div>
        <div><dt>Location</dt><dd>${escapeHtml(location || 'Location to be announced')}</dd></div>
        ${rsvps ? `<div><dt>RSVPs</dt><dd>${escapeHtml(rsvps)}</dd></div>` : ''}
      </dl>
      ${summary ? `<p>${escapeHtml(summary)}</p>` : ''}
      ${tagList(event.tags || [])}
      <a class="text-link" href="${escapeHtml(event.url)}" target="_blank" rel="noopener noreferrer">${cta}</a>
    </div>
  </article>`;
}

export function projectCard(project) {
  const links = [
    project.repoUrl ? `<a href="${escapeHtml(project.repoUrl)}" target="_blank" rel="noopener noreferrer">Repository</a>` : '',
    project.demoUrl ? `<a href="${escapeHtml(project.demoUrl)}" target="_blank" rel="noopener noreferrer">Demo</a>` : ''
  ].filter(Boolean).join('');

  return `<article class="project-card">
    <div class="card-topline"><span>${escapeHtml(project.status)}</span><span>${escapeHtml(project.difficulty)}</span></div>
    <h3>${escapeHtml(project.name)}</h3>
    <p><strong>Problem:</strong> ${escapeHtml(project.problem)}</p>
    <p>${escapeHtml(project.summary)}</p>
    ${tagList(project.techStack)}
    <p class="next-step">${escapeHtml(project.nextContribution || 'Contribution details coming soon.')}</p>
    ${links ? `<div class="card-links">${links}</div>` : ''}
  </article>`;
}

export function resourceCard(resource) {
  return `<article class="resource-card">
    <div class="card-topline"><span>${escapeHtml(resource.provider)}</span><span>${escapeHtml(resource.level)}</span></div>
    <h3>${escapeHtml(resource.title)}</h3>
    <p>${escapeHtml(resource.notes || '')}</p>
    <p class="track-name">${escapeHtml(resource.track)}</p>
    <a class="text-link" href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer">Open resource</a>
  </article>`;
}

export function postCard(post) {
  return `<article class="post-card">
    <time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date))}</time>
    <h3><a href="/blog/${escapeHtml(post.slug)}/">${escapeHtml(post.title)}</a></h3>
    <p>${escapeHtml(post.summary)}</p>
    ${tagList(post.tags || [])}
  </article>`;
}

export function sectionIntro(title, body) {
  return `<div class="section-intro">
    <h2>${escapeHtml(title)}</h2>
    ${body ? `<p>${escapeHtml(body)}</p>` : ''}
  </div>`;
}
