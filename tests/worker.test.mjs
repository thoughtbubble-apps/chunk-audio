import {test} from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.mjs";
const env = {DEPLOYED_SHA: "test-sha", ASSETS: {fetch: async () => new Response("app", {headers: {"content-type":"text/html"}})}};
test("version identifies exact deployed source without caching", async () => {
 const response = await worker.fetch(new Request("https://preview.example/__version"), env);
 assert.deepEqual(await response.json(), {sha:"test-sha"}); assert.equal(response.headers.get("cache-control"),"no-store");
});
test("serves assets and preserves runtime headers", async () => {
 const response = await worker.fetch(new Request("https://preview.example/"), env);
 assert.equal(await response.text(),"app"); assert.equal(response.headers.get("x-deployed-sha"),"test-sha");
 assert.equal(response.headers.get("cross-origin-opener-policy"),"same-origin"); assert.equal(response.headers.get("cross-origin-embedder-policy"),"require-corp");
 });
test("rejects mutation and supports HEAD", async () => {
 assert.equal((await worker.fetch(new Request("https://preview.example/",{method:"POST"}),env)).status,405);
 assert.equal(await (await worker.fetch(new Request("https://preview.example/",{method:"HEAD"}),env)).text(),"");
});

test("HEAD preserves GET asset status and headers without a body; rejected methods advertise Allow", async () => {
 const requests = [];
 const guardedEnv = {
  ...env,
  ASSETS: {fetch: async request => {
   requests.push(request.method);
   return new Response("asset body", {status:206, headers:{"content-type":"text/html","etag":"W/\"fixture\"","cache-control":"public, max-age=60"}});
  }}
 };
 const get = await worker.fetch(new Request("https://preview.example/asset"), guardedEnv);
 const head = await worker.fetch(new Request("https://preview.example/asset", {method:"HEAD"}), guardedEnv);
 assert.equal(head.status, get.status);
 assert.deepEqual(Array.from(head.headers), Array.from(get.headers));
 assert.equal(await head.text(), "");
 assert.deepEqual(requests, ["GET", "HEAD"]);

 const rejected = await worker.fetch(new Request("https://preview.example/asset", {method:"PUT"}), guardedEnv);
 assert.equal(rejected.status, 405);
 assert.equal(rejected.headers.get("allow"), "GET, HEAD");
});
