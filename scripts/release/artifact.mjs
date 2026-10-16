import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,readdir,lstat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const limits={total:512*1024**2,asset:25*1024**2,module:256*1024,manifest:1024**2,count:20000};
export function identity(value){assert(/^[a-f0-9]{40}$/.test(value.sourceSha));for(const key of ['runId','attempt'])assert(Number.isSafeInteger(value[key])&&value[key]>0);assert(value.prNumber===null||(Number.isSafeInteger(value.prNumber)&&value.prNumber>0));return {sourceSha:value.sourceSha,runId:value.runId,attempt:value.attempt,prNumber:value.prNumber}}
export function safePath(t,path){
 assert(typeof path==='string'&&/^[A-Za-z0-9_][A-Za-z0-9._/-]*$/.test(path)&&!path.split('/').some(x=>!x||x==='..'||x.startsWith('.')),'Unsafe release path');
 if(path==='worker/index.mjs')return path;
 assert(path.startsWith('assets/'),'Only sole Worker module and assets allowed');const asset=path.slice(7);
 assert(!/(?:^|\/)(?:node_modules|functions|package\.json|_worker\.js|_routes\.json)(?:\/|$)|\.(?:map|pem|key|db|sqlite|sh|mjs|cjs)$/i.test(asset),'Executable/private asset rejected');
 assert(t.assetRoots.includes(asset)||(t.assetDirectories.some(d=>asset.startsWith(d+'/'))&&/\.(?:js|css|wasm|svg|png|ico|jpe?g|webp|avif|woff2?)$/.test(asset)),'Asset outside reviewed static allowlist');return path;
}
export function validateManifest(t,m,expected){
 assert.deepEqual(Object.keys(m).sort(),['schema','service','repositoryId','sourceSha','runId','attempt','prNumber','files'].sort(),'Unknown release metadata');assert.equal(m.schema,1);assert.equal(m.service,t.service);assert.equal(m.repositoryId,t.repositoryId);assert.deepEqual(identity(m),identity(expected));assert(Array.isArray(m.files)&&m.files.length>1&&m.files.length<=limits.count);
 const seen=new Set();let total=0;for(const f of m.files){assert.deepEqual(Object.keys(f).sort(),['bytes','path','sha256']);safePath(t,f.path);assert(!seen.has(f.path),'Duplicate release member');seen.add(f.path);assert(Number.isSafeInteger(f.bytes)&&f.bytes>=0&&f.bytes<=(f.path==='worker/index.mjs'?limits.module:limits.asset));assert(/^[a-f0-9]{64}$/.test(f.sha256));total+=f.bytes}assert(total<=limits.total);assert(seen.has('worker/index.mjs')&&seen.has('assets/index.html'),'Worker and index required');return m;
}
export async function inventory(root,prefix=''){
 const result=[];for(const entry of await readdir(join(root,prefix),{withFileTypes:true})){const name=prefix?`${prefix}/${entry.name}`:entry.name;const stat=await lstat(join(root,name));assert(!stat.isSymbolicLink(),'Symlink rejected');if(stat.isDirectory())result.push(...await inventory(root,name));else{assert(stat.isFile(),'Nonregular member rejected');result.push(name)}}return result.sort();
}
export async function validateDirectory(t,root,expected){
 const ms=await lstat(join(root,'manifest.json'));assert(ms.isFile()&&!ms.isSymbolicLink()&&ms.size<=limits.manifest);const m=validateManifest(t,JSON.parse(await readFile(join(root,'manifest.json'),'utf8')),expected);
 assert.deepEqual(await inventory(root),['manifest.json',...m.files.map(f=>f.path)].sort(),'Complete release inventory mismatch');for(const f of m.files){const bytes=await readFile(join(root,f.path));assert.equal(bytes.length,f.bytes);assert.equal(hash(bytes),f.sha256,`Release hash mismatch: ${f.path}`)}for(const [path,text]of Object.entries(t.assetMetadata??{})){assert(m.files.some(f=>f.path==='assets/'+path),'Required asset metadata missing');assert.equal(await readFile(join(root,'assets',path),'utf8'),text,'Asset rule differs from trusted default policy')}return m;
}
export async function pack(t,{assets,worker,destination,...expected}){
 identity(expected);const paths=await inventory(assets);const files=[];await mkdir(destination,{recursive:false});
 for(const [path,source]of [['worker/index.mjs',worker],...paths.map(p=>['assets/'+p,join(assets,p)])]){safePath(t,path);const stat=await lstat(source);assert(stat.isFile()&&!stat.isSymbolicLink());const bytes=await readFile(source);const dest=join(destination,path);await mkdir(resolve(dest,'..'),{recursive:true});await writeFile(dest,bytes,{flag:'wx'});files.push({path,bytes:bytes.length,sha256:hash(bytes)})}
 const m={schema:1,service:t.service,repositoryId:t.repositoryId,...identity(expected),files:files.sort((a,b)=>a.path.localeCompare(b.path))};validateManifest(t,m,expected);await writeFile(join(destination,'manifest.json'),JSON.stringify(m,null,2)+'\n',{flag:'wx'});await validateDirectory(t,destination,expected);return m;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const t=JSON.parse(await readFile(new URL('../cd/target.json',import.meta.url)));const expected={sourceSha:process.env.SOURCE_SHA,runId:Number(process.env.GITHUB_RUN_ID),attempt:Number(process.env.GITHUB_RUN_ATTEMPT),prNumber:process.env.PR_NUMBER?Number(process.env.PR_NUMBER):null};assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),expected.sourceSha,'Pack only exact tested checkout');if(process.argv[2]==='--verify')await validateDirectory(t,resolve('release'),expected);else{assert(process.argv.length===2);await pack(t,{assets:resolve(t.assetDirectory),worker:resolve('worker/index.mjs'),destination:resolve('release'),...expected})}
}
