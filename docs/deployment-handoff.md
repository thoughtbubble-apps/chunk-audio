# Trusted existing Worker delivery candidate

This is an inactive source-only candidate stacked on migration PR7 (`dd07da1621266361852457e7640ad7f76c36784f`). No provider upload, runner/group/variable configuration, credential, Access, DNS, routing or production change is performed by preparing this candidate. Existing manual preview acceptance remains separate and its tested deployed source is unchanged.

## Separate source and delivery gates

`.github/workflows/cloudflare.yml` runs credential-free build, core/browser checks and complete release packaging. `ci-required` now means source validation only. Postcards also requires its existing three-run `lighthouse:recommended` assertions, including the unchanged canonical exception. Removing the former deliberately failing public deployment sentinel does not establish successful delivery.

`.github/workflows/workers-cd.yml` is a separate default-master `workflow_run` controller. Its `worker-delivery-required` check and exact-source `worker-preview` / `worker-production` statuses report delivery separately. Every job, including both always aggregates, rejects foreign/fork repository IDs before checkout. No `pull_request_target` or PR checkout occurs on the trusted route. Hosted acceptance installs and runs only the trusted default revision without a provider credential.

Source and hosted jobs retain group `approved-public-ci` and the exact `public-app-ci-prod` selector; there is no private-fleet fallback. Trusted upload and summary jobs use the literal unschedulable group AND label `trusted-worker-delivery-onboarding-required`. The controller is deliberately not activated. Future route approval/configuration is owned separately; changing a repository variable cannot select a trusted route.

## Artifact and credential boundary

A source run uploads only `release/manifest.json`, the sole `worker/index.mjs` module and the complete reviewed static asset inventory. The archive name binds full source SHA, source run ID and attempt. The controller checks fresh GitHub API repository/owner/visibility, workflow ID/path/name, current run attempt, current default revision, fresh PR head/base, workflow blob equality, artifact ID/name/digest and exact Worker Git blob. Default pushes require a unique exact merged-PR association to the already reviewed preview target. Stale, ambiguous or unrelated identities stop before provider access.

ZIP and expanded content are bounded, with exact inventory equality and per-file SHA256/size validation. Extra/missing/duplicate files, symlinks, executable archive modes, traversal, packages/hooks, uploaded Wrangler config and private/resource files fail closed. Trusted `_headers` metadata must match exactly. The module is passed as bytes: it is never imported, evaluated or run in the credentialed process. The only extra dependency is isolated frozen `scripts/cd/tooling/bun.lock` (`yauzl` 3.4.0); install uses `--frozen-lockfile --ignore-scripts` before any provider credential step. Application dependencies and root locks are unchanged.

Only the single upload step references future `CLOUDFLARE_WORKER_DELIVERY_TOKEN`. Missing explicit `CLOUDFLARE_API_TOKEN` fails immediately; no automatic local OAuth fallback exists. The intended future identity is selected-existing-Worker Editor for the exact target, not broad Worker creation/Admin. No token is created, entered, copied or scoped by this candidate. GitHub statuses/comment write permission exists only in the summary job. Signed artifact downloads never forward the GitHub credential to the signed host, and provider redirects are refused.

## Exact existing target only

Trusted `scripts/cd/target.json` allows only `chunk-audio-pr-7` for PR7, in account `39294887f3cbf359bcdce0d9326f9382`. There is no preview allocation branch. Other PRs stop until their already existing isolated target is independently mapped and explicitly reviewed into default policy. Fixed production target `chunk-audio` remains disabled and is absent in the current verified resource map. This controller cannot create it or declare production accepted.

Preflight requires existing settings, single active deployment/version at 100%, enabled stable URL, disabled version preview URLs, no schedules, exactly ASSETS plus public DEPLOYED_SHA/CANONICAL_HOST and reviewed compatibility/observability. Secrets, D1/R2/KV/DO/services/queues or any unrecognized capability stop before mutation. Snapshot identity is rechecked immediately before one module PUT. Metadata is constructed wholly by trusted code with explicit bindings, `keep_bindings:[]` and `keep_assets:false`; no keep-vars/resource inheritance or secret copying. Existing selected-target permissions provide a second update-only boundary because the HTTP PUT itself can create under broader authority.

The direct API asset session uses the documented hash protocol while full SHA256 remains the integrity boundary. Bucket hashes are bounded and restricted to the manifest. Asset-session JWTs remain in memory. Provider responses are bounded and errors sanitized. A module upload is attempted at most once; unknown outcome records a safe receipt and requires reconciliation. There is no automatic retry, rollback, creation, cleanup, route or URL-setting mutation. Prior deployment/version IDs are retained for a separately authorized rollback.

GET-only readiness is bounded to 60 seconds; exact SHA, all public asset bytes, source headers and applicable COOP/COEP/WASM behavior are checked independently from synthetic browser acceptance. Root index bytes are fetched through `/` to preserve canonical HTML handling. Chunk uses its existing generated WAV → nonempty MP3 ZIP fixture and SPA checks. Postcards retains real-map, explicit geolocation, edit/share/receive fixture checks and unchanged three-run Lighthouse assertions. No actual mail/post/private data or Lighthouse report upload occurs. A provider readback or acceptance failure is incomplete delivery, never a successful upload/CI claim.

## Installation and future activation

The inspected default source was `f61760373854d33d3d1fd1e6e034d414db729f57`. The trusted controller only executes after installation on master; source CI must be installed unchanged there before workflow blob admission can pass. This stacked candidate cannot bootstrap trusted PR execution. Installation requires source review and actual source checks, with existing manual preview evidence retained separately. No activation, merge or production success is implied by local offline tests.

After review/publication, hand the exact reviewed workflow commit SHAs to the sole infrastructure owner for workflow restrictions. A separately accepted isolated public trusted route and explicit selected-existing CI identity remain activation gates. No public source job may receive provider credentials or the trusted label. Production additionally requires a reconciled existing target and canonical route contract; this candidate keeps that path disabled.

Offline checks: `bun install --cwd scripts/cd/tooling --frozen-lockfile --ignore-scripts`; `node --test scripts/release/*.test.mjs scripts/cd/*.test.mjs`; `bun test tests/workflow-safety.test.mjs scripts/cd/workflow.test.ts`; existing `bun run test:worker`. Retained-build packaging smoke tests only the new inventory format; it is not a new source build, new hosted acceptance or deployment claim.

References: [Cloudflare direct asset uploads](https://developers.cloudflare.com/workers/static-assets/direct-upload/) and [multipart metadata](https://developers.cloudflare.com/workers/configuration/multipart-upload-metadata/). The pinned installed Wrangler implementation also constructs trusted asset config `_headers` as a string; no artifact-supplied config is interpreted here.
