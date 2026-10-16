import {test} from "node:test";
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {once} from "node:events";
import {waitForVersion} from "../scripts/wait-version.mjs";
async function serve(handler,run){const server=createServer(handler);server.listen(0,"127.0.0.1");await once(server,"listening");try{await run(`http://127.0.0.1:${server.address().port}`)}finally{await new Promise(resolve=>server.close(resolve))}}
test("GET readiness tolerates propagation and stale source, then accepts exact SHA",async()=>{
 let calls=0;await serve((req,res)=>{assert.equal(req.method,"GET");assert.equal(req.url,"/__version");calls++;res.statusCode=calls===1?404:200;res.setHeader("content-type","application/json");res.end(JSON.stringify({sha:calls<3?"old":"expected"}))},async url=>{
  assert.deepEqual(await waitForVersion(url,"expected",{attempts:3,intervalMs:1,requestTimeoutMs:1000}),{sha:"expected"});assert.equal(calls,3);
 });
});
test("wrong source remains fail-closed at a bounded check count",async()=>{
 let calls=0;await serve((req,res)=>{assert.equal(req.method,"GET");calls++;res.setHeader("content-type","application/json");res.end(JSON.stringify({sha:"old"}))},async url=>{
  await assert.rejects(waitForVersion(url,"expected",{attempts:3,intervalMs:1,requestTimeoutMs:1000}),/expected source SHA was not observed after 3 checks/);assert.equal(calls,3);
 });
});
