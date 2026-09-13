# Changelog

All notable public-facing changes should be recorded here.

This project uses a simple changelog format:

- `Added` for new pages, content, data, or workflows
- `Changed` for updates to existing behavior or content
- `Fixed` for bug fixes
- `Removed` for removed content or behavior

## Unreleased

### Added

- Public contributor documentation and GitHub issue and pull request templates.
- `MAINTENANCE.md` documenting the Meetup event sync's dependency on GitHub Actions scheduled workflows, and the external Cloudflare Worker trigger that keeps it running after GitHub's 60-day inactivity auto-disable.

### Fixed

- Events page showing stale Meetup dates because GitHub had auto-disabled the `deploy.yml` scheduled workflow trigger (`schedule:` triggers are disabled after 60 days without a repo push). Re-enabled the workflow and added a Cloudflare Worker (`events-sync-trigger`) that triggers the sync daily via the GitHub API independent of repo push activity.

## 2026-05-31

### Added

- Initial public changelog.
