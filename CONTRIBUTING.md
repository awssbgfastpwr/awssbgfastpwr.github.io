# Contributing

Thanks for helping improve the AWS Student Builder Group FAST Peshawar website. This repo is public, so contributions should be easy to review, safe to publish, and useful for students.

## Ways To Help

- Report a broken link, typo, layout problem, or outdated event.
- Improve public content in `data/*.json`.
- Add or update permitted images in `public/media/` or `public/team/`.
- Improve accessibility, responsiveness, performance, or validation.
- Suggest learning resources, project ideas, or partner updates.

## Before You Start

1. Check existing issues and pull requests to avoid duplicate work.
2. For larger changes, open an issue first and describe the proposed change.
3. Keep pull requests focused. One fix or feature per PR is easiest to review.

## Branch Rules

The `main` branch is protected. Do not push directly to `main`, including maintainers and admins. Create a branch, open a pull request, wait for checks, and merge through GitHub.

## Local Setup

Use Node.js 20 or newer.

```sh
npm run dev
```

The site will be served from `dist/` at `http://localhost:4173`.

Before opening a PR, run:

```sh
npm run lint
npm run typecheck
npm run build
```

`npm test` currently runs the same validation as `npm run lint`.

## Content Guidelines

Most public content lives in JSON files:

- `data/site.json` for community metadata and public stats
- `data/events.generated.json` for Meetup-synced events
- `data/resources.json` for learning resources
- `data/projects.json` for project cards
- `data/team.json` for public team profiles
- `data/partners.json` for partner information
- `data/posts.json` for blog-style updates

When editing content:

- Keep JSON valid and formatted with two spaces.
- Use HTTPS URLs for external links.
- Prefer concise, factual copy.
- Do not add unverified stats or claims.
- Do not publish private student data.
- Only add images that the community owns, created, or has permission to use.
- Use local image paths like `/media/example.jpg` or `/team/name.webp` when files live under `public/`.

Event data is generated from Meetup. Run this only when you need to refresh events:

```sh
npm run sync:events
```

## Code Guidelines

- Keep the site static and dependency-light.
- Prefer existing rendering helpers in `src/render.mjs`.
- Keep JavaScript readable and framework-free unless maintainers agree to a larger change.
- Preserve accessibility attributes, semantic headings, alt text, and keyboard behavior.
- Do not commit generated `dist/` output unless maintainers explicitly ask for it.

## Pull Request Checklist

- The PR has a clear title and short description.
- The change is focused and reviewable.
- Public content has been checked for privacy and permission issues.
- `npm run lint`, `npm run typecheck`, and `npm run build` pass locally.
- Screenshots are included for visible UI changes.
- Related issues are linked.

## Community Standards

All contributors are expected to follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
