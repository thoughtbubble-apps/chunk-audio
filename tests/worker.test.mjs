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
