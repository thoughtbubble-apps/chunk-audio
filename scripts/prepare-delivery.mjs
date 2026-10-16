import {readFileSync, writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
const [mode, number] = process.argv.slice(2);
if (!["preview", "production"].includes(mode)) throw Error("Explicit preview or production required");
if (mode === "preview" && !/^\d+$/.test(number ?? "")) throw Error("Numeric PR required");
const config = JSON.parse(readFileSync("wrangler.jsonc", "utf8"));
const sha = execFileSync("git", ["rev-parse", "HEAD"], {encoding:"utf8"}).trim();
config.vars = {...config.vars, DEPLOYED_SHA:sha};
if (mode === "preview") {
 config.name += `-pr-${number}`;
 delete config.routes;
 delete config.route;
}
writeFileSync("wrangler.jsonc", JSON.stringify(config,null,2)+"\n");

console.log(`Prepared ${mode}: ${config.name} at ${sha}`);
