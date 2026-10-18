import {test} from 'node:test';
import assert from 'node:assert/strict';
const p=await import('./policy.mjs').catch(()=>({}));
import {target,facts} from './fixtures.mjs';
test('only fresh exact same-repo successful source context authorizes artifact',()=>{
 assert.equal(typeof p.authorize,'function','pure source admission required');const f=facts();assert.equal(p.authorize(target,f).workerName,'fixture-pr-7');
 for(const mutate of [f=>f.repository.id=9,f=>f.repository.private=true,f=>f.repository.owner.id=9,f=>f.run.workflow_id=9,f=>f.run.conclusion='failure',f=>f.run.run_attempt=2,f=>f.pr.head.repo.id=9,f=>f.pr.base.repo.id=9,f=>f.pr.state='closed',f=>f.pr.head.sha='c'.repeat(40),f=>f.pr.base.sha='c'.repeat(40),f=>f.pr.base.ref='main',f=>f.defaultSha='c'.repeat(40),f=>f.sourceWorkflowBlob='c'.repeat(40),f=>f.artifact.digest='bad',f=>f.artifact.name='wrong',f=>f.artifact.expired=true,f=>f.artifact.workflow_run.head_sha='c'.repeat(40),f=>f.run.event='pull_request_target',f=>f.run.pull_requests=[]]){const g=structuredClone(facts());mutate(g);assert.throws(()=>p.authorize(target,g))}
});
test('push cannot create target or reuse an unrelated PR preview; production is disabled',()=>{
 assert.equal(typeof p.authorize,'function');const f=facts();f.run.event='push';f.run.head_sha=f.defaultSha;f.run.head_branch='master';f.event.workflow_run=structuredClone(f.run);f.artifact.name=`worker-${f.defaultSha}-4-1`;f.artifact.workflow_run.head_sha=f.defaultSha;f.mergedPr={number:7,merged:true,merge_commit_sha:f.defaultSha,head:f.pr.head,base:f.pr.base};
 assert.equal(p.authorize(target,f).workerName,'fixture-pr-7');delete f.mergedPr;assert.throws(()=>p.authorize(target,f));assert.throws(()=>p.productionTarget(target));
});

test('GitHub run PR snapshots require stable IDs but do not invent owner/private fields absent in API',()=>{const f=facts();f.pr=structuredClone(f.pr);for(const ref of [f.run.pull_requests[0].head,f.run.pull_requests[0].base])ref.repo={id:target.repositoryId,name:'fixture',url:'https://api.github.com/repos/org/fixture'};assert.equal(p.authorize(target,f).sourcePrNumber,7);f.pr.head.repo={...f.pr.head.repo,private:true};assert.throws(()=>p.authorize(target,f))});
