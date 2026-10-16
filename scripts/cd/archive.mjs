import assert from 'node:assert/strict';
import {createWriteStream} from 'node:fs';
import {readFile,lstat,mkdir,rm} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {pipeline} from 'node:stream/promises';
import {Transform} from 'node:stream';
import {createHash} from 'node:crypto';
import yauzl from './tooling/node_modules/yauzl/index.js';
import {safePath,validateManifest,validateDirectory,limits,hash} from '../release/artifact.mjs';
const open=path=>new Promise((resolve,reject)=>yauzl.open(path,{lazyEntries:true,autoClose:false,strictFileNames:true,validateEntrySizes:true},(e,z)=>e?reject(e):resolve(z)));
const stream=(z,e)=>new Promise((resolve,reject)=>z.openReadStream(e,(error,s)=>error?reject(error):resolve(s)));
function entries(z){return new Promise((resolve,reject)=>{const all=[];z.on('error',reject);z.on('entry',e=>{try{assert(all.length<limits.count+1);assert(!e.isEncrypted());assert(!e.fileName.endsWith('/')&&!e.fileName.includes('\\'));const mode=e.externalFileAttributes>>>16,type=mode&0o170000;assert((type===0||type===0o100000)&&!(mode&0o111),'Nonregular or executable archive member');assert(e.uncompressedSize<=(e.fileName==='manifest.json'?limits.manifest:e.fileName==='worker/index.mjs'?limits.module:limits.asset));all.push(e);z.readEntry()}catch(error){reject(error)}});z.on('end',()=>resolve(all));z.readEntry()})}
async function boundedBuffer(z,e,max){const chunks=[];let n=0;for await(const b of await stream(z,e)){n+=b.length;assert(n<=max);chunks.push(b)}return Buffer.concat(chunks)}
export async function extractArtifact(t,path,destination,identity,digest){
 const stat=await lstat(path);assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.size<=limits.total);assert(/^[a-f0-9]{64}$/.test(digest));assert.equal(hash(await readFile(path)),digest,'GitHub artifact archive digest mismatch');const z=await open(path);let created=false;
 try{const list=await entries(z),seen=new Set();for(const e of list){if(e.fileName!=='manifest.json')safePath(t,e.fileName);assert(!seen.has(e.fileName),'Duplicate ZIP member');seen.add(e.fileName)}const info=list.find(e=>e.fileName==='manifest.json');assert(info);const m=validateManifest(t,JSON.parse((await boundedBuffer(z,info,limits.manifest)).toString('utf8')),identity);const expected=new Map(m.files.map(f=>[f.path,f]));assert.equal(list.length,expected.size+1,'Complete archive inventory mismatch');for(const e of list)if(e!==info){assert(expected.has(e.fileName));assert.equal(e.uncompressedSize,expected.get(e.fileName).bytes)}
 await mkdir(destination);created=true;for(const e of list){const dest=join(destination,e.fileName);await mkdir(dirname(dest),{recursive:true});let size=0;const h=createHash('sha256');const max=e===info?limits.manifest:expected.get(e.fileName).bytes;const verify=new Transform({transform(b,encoding,cb){size+=b.length;if(size>max)return cb(new Error('ZIP stream bound'));h.update(b);cb(null,b)}});await pipeline(await stream(z,e),verify,createWriteStream(dest,{flags:'wx',mode:0o644}));assert.equal(size,e.uncompressedSize);if(e!==info)assert.equal(h.digest('hex'),expected.get(e.fileName).sha256)}return await validateDirectory(t,destination,identity);
 }catch(error){if(created)await rm(destination,{recursive:true,force:true});throw error}finally{z.close()}
}
