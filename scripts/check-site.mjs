import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const requiredFiles = [
  'data/site.json',
  'data/events.generated.json',
  'data/resources.json',
  'data/projects.json',
  'data/team.json',
  'data/partners.json',
  'data/posts.json',
  'public/styles/site.css',
  'public/scripts/site.js',
  'public/scripts/events.js',
  'public/scripts/verify.js',
  'public/brand/logo-horizontal-dark.svg',
  'public/brand/logo-horizontal-white.svg',
  'public/brand/icon-blue.svg',
  'public/brand/og-default.png',
  '.github/workflows/deploy.yml'
];

async function readJson(file) {
  return JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateUrl(value, label, allowLocal = false) {
  if (allowLocal && String(value).startsWith('/')) return;
  const parsed = new URL(value);
  assert(parsed.protocol === 'https:', `${label} must use https`);
}

async function validateTeamPhotoUrl(member) {
  if (!member.photoUrl) return;

  const label = `team ${member.id} photoUrl`;
  const photoUrl = String(member.photoUrl);
  const allowedImage = /\.(avif|jpe?g|png|webp)(?:[?#].*)?$/i;
  assert(allowedImage.test(photoUrl), `${label} must point to an image file`);

  if (photoUrl.startsWith('/')) {
    const target = path.join(root, 'public', photoUrl.replace(/^\//, ''));
    await fs.access(target);
    return;
  }

  const parsed = new URL(photoUrl);
  assert(parsed.protocol === 'https:', `${label} must use https`);
  assert(!/(^|\.)linkedin\.com$|(^|\.)licdn\.com$/i.test(parsed.hostname), `${label} must not hotlink LinkedIn images`);
}

async function validateImageUrl(value, label) {
  const imageUrl = String(value);
  const allowedImage = /\.(avif|jpe?g|png|webp)(?:[?#].*)?$/i;
  assert(allowedImage.test(imageUrl), `${label} must point to an image file`);

  if (imageUrl.startsWith('/')) {
    const target = path.join(root, 'public', imageUrl.replace(/^\//, ''));
    await fs.access(target);
    return;
  }

  validateUrl(imageUrl, label);
}

async function renderVerifyFixture(payload) {
  const script = await fs.readFile(path.join(root, 'public/scripts/verify.js'), 'utf8');
  const result = {
    className: '',
    dataset: { api: 'https://certificate-platform.pages.dev/api/verify' },
    innerHTML: '',
    setAttribute() {}
  };
  const context = vm.createContext({
    document: {
      querySelector(selector) {
        return selector === '[data-verify-result]' ? result : null;
      }
    },
    __payload: payload
  });

  vm.runInContext(script, context);
  vm.runInContext('renderApiData(__payload)', context);
  return result;
}

async function validateVerifyRenderer() {
  const valid = await renderVerifyFixture({
    status: 'valid',
    certificate: {
      certId: 'CERT-EXAMPLE-001',
      recipientName: 'Example Recipient',
      certificateType: 'participation',
      eventName: 'Example Event',
      issuedAt: '2026-01-02'
    },
    verifiedAt: '2026-01-01T00:00:00.000Z'
  });
  assert(valid.className === 'verify-result valid', 'Verify renderer must mark valid API responses as valid');
  assert(valid.innerHTML.includes('CERT-EXAMPLE-001'), 'Verify renderer must show nested certificate IDs');
  assert(valid.innerHTML.includes('Example Recipient'), 'Verify renderer must show nested recipient names');
  assert(valid.innerHTML.includes('Example Event'), 'Verify renderer must show nested event names');
  assert(valid.innerHTML.includes('Participation Certificate'), 'Verify renderer must show nested certificate types');
  assert(!valid.innerHTML.includes('Not available'), 'Verify renderer must not drop fields from nested API certificates');

  const notFound = await renderVerifyFixture({ status: 'not_found', verifiedAt: '2026-01-01T00:00:00.000Z' });
  assert(notFound.className === 'verify-result invalid', 'Verify renderer must treat not_found API responses as not found');
  assert(notFound.innerHTML.includes('Certificate not found'), 'Verify renderer must show not-found copy for not_found responses');
}

async function main() {
  for (const file of requiredFiles) {
    await fs.access(path.join(root, file));
  }

  const [site, events, resources, projects, team, partners, posts] = await Promise.all([
    readJson('data/site.json'),
    readJson('data/events.generated.json'),
    readJson('data/resources.json'),
    readJson('data/projects.json'),
    readJson('data/team.json'),
    readJson('data/partners.json'),
    readJson('data/posts.json')
  ]);

  validateUrl(site.siteUrl, 'siteUrl');
  validateUrl(site.meetupUrl, 'meetupUrl');
  validateUrl(site.linkedinUrl, 'linkedinUrl');
  validateUrl(site.githubUrl, 'githubUrl');
  validateUrl(site.certificateVerifyApi, 'certificateVerifyApi');
  validateUrl(site.formSubmitEndpoint, 'formSubmitEndpoint');
  validateUrl(site.contactSuccessUrl, 'contactSuccessUrl');

  assert(!site.formSubmitEndpoint.includes('FORMSUBMIT_ENDPOINT'), 'formSubmitEndpoint must be configured before launch');
  assert(new URL(site.contactSuccessUrl).origin === new URL(site.siteUrl).origin, 'contactSuccessUrl must stay on the production site origin');

  assert(Array.isArray(events.upcoming), 'events.upcoming must be an array');
  assert(Array.isArray(events.past), 'events.past must be an array');
  for (const event of [...events.upcoming, ...events.past]) {
    assert(event.id && event.title && event.url && event.startsAt, `Event ${event.id || '(missing id)'} is missing required fields`);
    validateUrl(event.url, `event ${event.id} url`);
    if (event.imageUrl) await validateImageUrl(event.imageUrl, `event ${event.id} imageUrl`);
  }

  for (const item of resources) validateUrl(item.url, `resource ${item.id}`);
  for (const project of projects) {
    if (project.repoUrl) validateUrl(project.repoUrl, `project ${project.id} repoUrl`);
    if (project.demoUrl) validateUrl(project.demoUrl, `project ${project.id} demoUrl`);
  }
  for (const member of team) {
    assert(member.name && member.role, `Team member ${member.id || '(missing id)'} needs name and role`);
    if (member.linkedinUrl) validateUrl(member.linkedinUrl, `team ${member.id} linkedinUrl`);
    if (member.githubUrl) validateUrl(member.githubUrl, `team ${member.id} githubUrl`);
    await validateTeamPhotoUrl(member);
  }
  for (const partner of partners) {
    assert(partner.name && partner.permissionStatus, `Partner ${partner.id || '(missing id)'} needs name and permissionStatus`);
    if (partner.websiteUrl) validateUrl(partner.websiteUrl, `partner ${partner.id} websiteUrl`);
  }
  for (const post of posts) {
    assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug), `Post slug ${post.slug} must be lowercase hyphenated`);
    assert(post.title && post.summary && post.date, `Post ${post.slug} is missing required metadata`);
  }

  const publicTextFiles = await fs.readdir(path.join(root, 'data'));
  const text = await Promise.all(publicTextFiles.map((file) => fs.readFile(path.join(root, 'data', file), 'utf8')));
  assert(!/BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/.test(text.join('\n')), 'Private key material detected in public data');

  await validateVerifyRenderer();

  console.log('Static site source checks passed.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
