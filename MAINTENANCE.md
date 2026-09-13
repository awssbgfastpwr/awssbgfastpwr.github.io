# Maintenance Notes

Operational details for maintainers that aren't obvious from reading the code.
This is not a contribution guide — see [CONTRIBUTING.md](CONTRIBUTING.md) for that.

## Meetup event sync can silently stop running

**Symptom:** the [Events page](https://awssbgfastpwr.github.io/events/) shows
stale dates even though Meetup has newer events.

**Cause:** `.github/workflows/deploy.yml` runs `npm run sync:events` on a
daily `schedule:` cron (`15 2 * * *`), which fetches the public Meetup group
page, regenerates `data/events.generated.json`, and rebuilds/deploys the
site. GitHub automatically disables a workflow's `schedule:` trigger after
**60 days with no push to the repo** — silently, with no email or banner in
the Actions tab. Since this repo doesn't get daily commits, the cron
eventually stops firing on its own and nobody notices until the events page
goes stale.

Check whether this has happened:

```sh
gh workflow list --repo awssbgfastpwr/awssbgfastpwr.github.io --all
```

If `Deploy GitHub Pages` shows `disabled_inactivity`, that's it.

**Immediate fix**, if you land here because the site is stale right now:

```sh
gh workflow enable "Deploy GitHub Pages" --repo awssbgfastpwr/awssbgfastpwr.github.io
gh workflow run "Deploy GitHub Pages" --repo awssbgfastpwr/awssbgfastpwr.github.io
```

**Permanent fix (already in place as of 2026-09):** a separate Cloudflare
Worker, `events-sync-trigger`, calls GitHub's `workflow_dispatch` REST API
once a day. GitHub's 60-day auto-disable only affects the `schedule:`
trigger — manual/API dispatches keep working on a disabled workflow, so this
sidesteps the problem entirely without needing regular pushes to this repo.

- Worker source: sibling project `events-sync-trigger/` (see its `README.md`)
- Deployed under the **"AWS Student Builder Group FAST Peshawar"** Cloudflare
  account (Account ID `ac02045514040243dd52c1b780575b2b`) at
  `https://events-sync-trigger.awscloudclub-nucespwr.workers.dev`. This is
  the same account that hosts the `certificate-platform` Pages project and
  its D1 databases — it's the club's one canonical Cloudflare account, so
  new infrastructure belongs here rather than in a separate account. The
  account is pinned via `account_id` in `wrangler.jsonc`; still always run
  `wrangler whoami` and confirm before redeploying or running
  `wrangler secret put` against this Worker, since a Cloudflare login can
  have access to more than one account
- Cron: daily at 02:15 UTC (same time as the original `schedule:` trigger,
  which is intentionally left in place too as a backup in case the Worker
  ever stops running)
- Requires a GitHub fine-grained PAT (Actions: Read and write, scoped to
  this repo only) stored as a Cloudflare Worker secret — not visible in any
  repo, not committed anywhere

If the Worker itself needs to be redeployed or its token rotated, see
`events-sync-trigger/README.md`.

> We deliberately did **not** use a "keepalive" GitHub Action that fakes repo
> activity with empty commits (e.g. the popular `keepalive-workflow` pattern).
> GitHub disabled that project's own repository for ToS violations related to
> "encouraging excessive usage and bypassing the 60-day inactivity policy."
> Triggering real, useful work via the API from outside GitHub avoids that
> gray area entirely.
