# Cloudflare delivery

This candidate prepares the public app for Workers with static assets. Current provider inventory does not contain its production target. No storage, authentication, credentials or paid services are created. Original source history is retained.

PRs from this repository run **Build and runtime tests**, then **Deploy and verify exact SHA** at an isolated `chunk-audio-pr-N.bsunter.workers.dev` target. Fork code is skipped before checkout; **ci-required** fails unless both jobs succeed. Pushes to master repeat the stages and deploy the production Worker. Jobs target the organization `thoughtbubble-ci-prod` runner pool and an existing repository/environment `CLOUDFLARE_API_TOKEN`, exposed only during deployment. Production executions serialize without mid-deploy cancellation. The validated build is transferred as a SHA-bound integrity manifest and artifact rather than rebuilt by the deploy job. Neither is presently available to this repository: onboarding is a delivery blocker. No new token or runner is provisioned here.

`/__version` and `x-deployed-sha` identify deployed source. Worker observability is enabled. Deployment summaries expose the preview link. `scripts/verify-deployment.mjs` checks deployed SHA and the public shell. Browser core flow acceptance and canonical-domain cutover must be recorded separately; shell health does not establish feature acceptance.

For a direct preview with existing local Wrangler OAuth: prepare the numeric PR target with `node scripts/prepare-delivery.mjs preview N`, build, then `bunx wrangler deploy`. Run `DEPLOY_URL=https://chunk-audio-pr-N.bsunter.workers.dev node scripts/verify-deployment.mjs`. Restore the committed config afterwards.

Local acceptance uses generated audio only: cross-origin isolation, same-origin ffmpeg core, actual chunk conversion, a nonempty MP3 inside the downloaded ZIP, and SPA navigation. The initial untouched default Manual mode with no cuts produced an empty ZIP during investigation; that existing editor edge is not fixed or counted as passing manual-editor acceptance. Generated ffmpeg assets are copied into `public/ffmpeg` before both development and production builds.

Version readiness tolerates propagation with bounded GET-only retries and accepts only the expected source SHA. It fails closed at timeout; it never retries uploads or deployments. Regression tests cover transient 404/stale-source responses and permanent source mismatch using a local HTTP fixture.
