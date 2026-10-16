import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const repositoryId = "669344920";
const workflow = Bun.YAML.parse(readFileSync(new URL("../.github/workflows/cloudflare.yml", import.meta.url), "utf8"));

// Evaluate only the bounded expression grammar used by these admission gates.
function admits(expression, event, repository, head = repositoryId, base = repositoryId) {
  const code = expression.replace(/^\$\{\{\s*|\s*\}\}$/g, "")
    .replaceAll("github.event.pull_request.head.repo.id", "head")
    .replaceAll("github.event.pull_request.base.repo.id", "base")
    .replaceAll("github.repository_id", "repository")
    .replaceAll("github.event_name", "event")
    .replaceAll(/needs\.[a-z]+\.result/g, "'success'")
    .replaceAll("always()", "true").replaceAll("cancelled()", "false");
  if (!/^[a-zA-Z0-9_' .()&|!=]+$/.test(code)) throw new Error("Unexpected admission expression");
  return Function("event", "repository", "head", "base", `return Boolean(${code})`)(event, repository, head, base);
}

function validate(candidate) {
  expect(candidate.permissions).toEqual({});
  expect(candidate.on).toEqual({pull_request: {branches: ["master"]}, push: {branches: ["master"]}});
  expect(Object.keys(candidate.jobs).sort()).toEqual(["checks", "deploy", "required"]);
  for (const [id, job] of Object.entries(candidate.jobs)) {
    expect(typeof job.if).toBe("string");
    expect(admits(job.if, "push", repositoryId)).toBe(true);
    expect(admits(job.if, "pull_request", repositoryId)).toBe(true);
    // A fork claiming the same display name still has another immutable ID.
    expect(admits(job.if, "pull_request", repositoryId, "900000001")).toBe(false);
    expect(admits(job.if, "pull_request", "900000002")).toBe(false);
    expect(admits(job.if, "push", "900000002")).toBe(false);
    expect(admits(job.if, "pull_request", repositoryId, repositoryId, "900000003")).toBe(false);
    expect(admits(job.if, "pull_request_target", repositoryId)).toBe(false);
    expect(job["runs-on"].group).toBe("approved-public-ci");
    expect(job["runs-on"].labels).toBe("${{ vars.PUBLIC_CI_RUNNER_LABEL == 'public-app-ci-prod' && 'public-app-ci-prod' || 'public-ci-onboarding-required' }}");
    expect(job.environment).toBeUndefined();
    for (const step of job.steps) {
      const serialized = JSON.stringify(step);
      expect(serialized).not.toMatch(/secrets\.|CLOUDFLARE_API_TOKEN/);
      if (step.uses?.startsWith("actions/checkout@")) expect(step.with["persist-credentials"]).toBe(false);
    }
    expect(job.name).toBe({"checks": "chunk-audio / build and core flow", "deploy": "chunk-audio / deploy exact tested SHA", "required": "ci-required"}[id]);
  }
  const deployment = candidate.jobs.deploy;
  expect(deployment.permissions).toEqual({});
  expect(deployment.steps).toHaveLength(1);
  expect(deployment.steps[0].run).toContain("Trusted deployment route required");
  expect(deployment.steps[0].run.trim().endsWith("exit 1")).toBe(true);
}

test("every public self-hosted job rejects fork, wrong repository and privileged event", () => validate(workflow));
test("regression guard catches aggregate fork admission and name-based trust", () => {
  for (const condition of ["always()", "github.event_name != 'pull_request' || true"]) {
    const candidate = structuredClone(workflow);
    candidate.jobs.required.if = condition;
    expect(() => validate(candidate)).toThrow();
  }
});
test("regression guard catches credential exposure and live deployment on public profile", () => {
  const candidate = structuredClone(workflow);
  candidate.jobs.deploy.steps[0].env = { CLOUDFLARE_API_TOKEN: "${{ secrets.CLOUDFLARE_API_TOKEN }}" };
  expect(() => validate(candidate)).toThrow();
  candidate.jobs.deploy.steps[0] = {run: "wrangler deploy"};
  expect(() => validate(candidate)).toThrow();
});
test("deployment handoff fails closed locally without checking out or invoking app code", () => {
  const result = spawnSync("bash", ["-eu", "-c", workflow.jobs.deploy.steps[0].run], {env: {PATH: process.env.PATH, GITHUB_STEP_SUMMARY: "/dev/null"}, encoding: "utf8"});
  expect(result.status).toBe(1);
  expect(result.stdout).toContain("Trusted deployment route required");
});
