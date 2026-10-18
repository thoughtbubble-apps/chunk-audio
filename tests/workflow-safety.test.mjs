import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const stackedSource=JSON.parse(readFileSync(new URL('../scripts/cd/target.json', import.meta.url),'utf8')).stackedSource;
const repositoryId = "669344920";
const workflow = Bun.YAML.parse(readFileSync(new URL("../.github/workflows/cloudflare.yml", import.meta.url), "utf8"));

// Evaluate only the bounded expression grammar used by these admission gates.
function admits(expression, event, repository, head = repositoryId, base = repositoryId) {
  const code = expression.replace(/^\$\{\{\s*|\s*\}\}$/g, "")
    .replaceAll("github.event.pull_request.head.repo.id", "head")
    .replaceAll("github.event.pull_request.base.repo.id", "base")
    .replaceAll("github.event.pull_request.head.ref", "headRef")
    .replaceAll("github.event.pull_request.base.ref", "baseRef")
    .replaceAll("github.event.pull_request.number", "prNumber")
    .replaceAll("github.ref", "ref")
    .replaceAll("github.repository_id", "repository")
    .replaceAll("github.event_name", "event")
    .replaceAll(/needs\.[a-z]+\.result/g, "'success'")
    .replaceAll("always()", "true").replaceAll("cancelled()", "false");
  if (!/^[a-zA-Z0-9_' .()/&|!=-]+$/.test(code)) throw new Error("Unexpected admission expression");
  return Function("event", "repository", "head", "base", "headRef", "baseRef", "prNumber", "ref", `return Boolean(${code})`)(event, repository, head, base, stackedSource.headRef, "master", stackedSource.prNumber, "refs/heads/master");
}

function validate(candidate) {
  expect(candidate.permissions).toEqual({});
  expect(candidate.on).toEqual({pull_request: {branches: ["master", "codex/cloudflare-delivery"]}, push: {branches: ["master"]}});
  expect(Object.keys(candidate.jobs).sort()).toEqual(["checks", "required"]);
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
  expect(candidate.jobs.required.needs).toEqual(["checks"]);
  expect(JSON.stringify(candidate.jobs)).not.toMatch(/secrets\.|wrangler deploy/);

}

test("every public self-hosted job rejects fork, wrong repository and privileged event", () => validate(workflow));
test("regression guard catches aggregate fork admission and name-based trust", () => {
  for (const condition of ["always()", "github.event_name != 'pull_request' || true"]) {
    const candidate = structuredClone(workflow);
    candidate.jobs.required.if = condition;
    expect(() => validate(candidate)).toThrow();
  }
});
test("regression guard catches credentials or deployment on public checks", () => {
  const candidate = structuredClone(workflow);
  candidate.jobs.checks.steps.push({env: {CLOUDFLARE_API_TOKEN: "forbidden"}});
  expect(() => validate(candidate)).toThrow();
});
test("source aggregate fails closed without executing app code", () => {
  const command = workflow.jobs.required.steps[0].run;
  for (const [CHECKS,status] of [["success",0],["failure",1],["cancelled",1],["skipped",1]]) {
    const result = spawnSync("bash", ["-eu","-c",command], {env:{PATH:process.env.PATH,CHECKS},encoding:"utf8"});
    expect(result.status).toBe(status);
  }
});
