import {readFileSync,writeFileSync,readdirSync} from "node:fs";
import {createHash} from "node:crypto";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
const sha=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
const hash=path=>createHash("sha256").update(readFileSync(path)).digest("hex");
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(`${dir}/${e.name}`):[`${dir}/${e.name}`]);
if(process.argv.includes("--verify")){
 const manifest=JSON.parse(readFileSync(".delivery-manifest.json","utf8"));assert.equal(manifest.sha,sha);
 for(const [path,digest] of Object.entries(manifest.files)) assert.equal(hash(path),digest,path);
 console.log(`Verified build artifact at ${sha}`);
}else{
 const paths=["wrangler.jsonc",...walk("dist")];
 writeFileSync(".delivery-manifest.json",JSON.stringify({sha,files:Object.fromEntries(paths.map(path=>[path,hash(path)]))},null,2)+"\n");
}
