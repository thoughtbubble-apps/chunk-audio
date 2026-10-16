import assert from 'node:assert/strict';
import {hash} from '../release/artifact.mjs';
import {selectTarget} from './policy.mjs';

// Read-only prerequisite, never an environment declaration or settings writer.
export const environmentName = 'worker-preview-delivery';
function keys(value, allowed) {
  assert(value && typeof value === 'object' && !Array.isArray(value), 'Environment metadata object required');
  assert(Object.keys(value).every(key => allowed.includes(key)), 'Unknown environment policy field');
}
function id(value) { assert(Number.isSafeInteger(value) && value > 0, 'Exact environment policy identity required'); }
function optionalText(value) { if (value !== undefined) assert(typeof value === 'string' && value.length > 0 && value.length < 512); }
function environmentPolicy(t, value) {
  keys(value, ['id', 'node_id', 'name', 'url', 'html_url', 'created_at', 'updated_at', 'can_admins_bypass', 'protection_rules', 'deployment_branch_policy']);
  id(value.id);
  assert.equal(value.name, environmentName);
  assert.equal(value.url, `https://api.github.com/repos/${t.repository}/environments/${environmentName}`);
  if (value.html_url !== undefined) assert.equal(value.html_url, `https://github.com/${t.repository}/deployments/activity_log?environments_filter=${environmentName}`);
  for (const key of ['node_id', 'created_at', 'updated_at']) optionalText(value[key]);
  assert.equal(value.can_admins_bypass, false, 'Admin bypass must be explicitly disabled; absent metadata is not evidence');
  keys(value.deployment_branch_policy, ['protected_branches', 'custom_branch_policies']);
  assert.deepEqual(value.deployment_branch_policy, {protected_branches: false, custom_branch_policies: true});
  assert(Array.isArray(value.protection_rules) && value.protection_rules.length === 1, 'Exactly the reviewed branch protection rule required');
  const rule = value.protection_rules[0];
  keys(rule, ['id', 'node_id', 'type']); id(rule.id); optionalText(rule.node_id);
  assert.equal(rule.type, 'branch_policy', 'Unexpected environment protection rule');
  return {environmentId: value.id, environmentName, url: value.url, canAdminsBypass: false,
    protectionRuleId: rule.id, deploymentBranchPolicy: value.deployment_branch_policy,
    updatedAt: value.updated_at ?? null};
}
function branchPage(value, empty = false) {
  keys(value, ['total_count', 'branch_policies']);
  assert.equal(value.total_count, 1, 'Only one complete reviewed deployment branch policy allowed');
  assert(Array.isArray(value.branch_policies));
  assert.equal(value.branch_policies.length, empty ? 0 : 1, 'Incomplete or extra paginated environment policy');
  if (empty) return;
  const rule = value.branch_policies[0];
  keys(rule, ['id', 'node_id', 'name', 'type']); id(rule.id); optionalText(rule.node_id);
  assert.equal(rule.name, 'master');
  // Older examples omit type. Ambiguous branch/tag metadata never defaults safe.
  assert.equal(rule.type, 'branch', 'Explicit master branch policy required; tags/PR refs are denied');
  return {id: rule.id, name: 'master', type: 'branch'};
}
export async function readEnvironment(t, c, api) {
  selectTarget(t, c);
  assert.equal(t.branch, 'master');
  assert(/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(t.repository));
  assert(/^[a-f0-9]{40}$/.test(c.controllerSha));
  assert.equal(c.baseSha, c.controllerSha, 'Preflight requires admitted current default context');
  const prefix = `/repos/${t.repository}`, path = `${prefix}/environments/${environmentName}`;
  const get = path => api(path, {method: 'GET'});
  const repository = await get(prefix);
  assert.equal(repository.id, t.repositoryId); assert.equal(repository.owner?.id, t.ownerId);
  assert.equal(repository.full_name, t.repository); assert.equal(repository.private, false);
  assert.equal(repository.default_branch, 'master');
  const defaultRef = `${prefix}/git/ref/heads/master`;
  assert.equal((await get(defaultRef)).object?.sha, c.controllerSha);
  const before = environmentPolicy(t, await get(path));
  const first = `${path}/deployment-branch-policies?per_page=100&page=1`;
  const second = `${path}/deployment-branch-policies?per_page=100&page=2`;
  const policy = branchPage(await get(first));
  branchPage(await get(second), true);
  assert.deepEqual(environmentPolicy(t, await get(path)), before, 'Environment changed during readiness read');
  assert.deepEqual(branchPage(await get(first)), policy, 'Deployment branch policy changed during readiness read');
  assert.equal((await get(defaultRef)).object?.sha, c.controllerSha, 'Default revision changed during readiness read');
  // A snapshot is not an atomic lock against a later administrator mutation.
  return {...before, repositoryId: t.repositoryId, defaultSha: c.controllerSha,
    branchPolicyId: policy.id, policySha256: hash(Buffer.from(JSON.stringify({environment: before, policy})))};
}
export function matchEnvironment(receipt, expected) {
  assert(/^[1-9][0-9]*$/.test(expected.id), 'Prior environment readiness identity missing');
  assert(/^[a-f0-9]{64}$/.test(expected.policySha256), 'Prior environment policy digest missing');
  assert.equal(String(receipt.environmentId), expected.id, 'Environment identity changed before upload');
  assert.equal(receipt.policySha256, expected.policySha256, 'Environment policy changed before upload');
}
