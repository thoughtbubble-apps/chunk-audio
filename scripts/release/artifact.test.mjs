import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const mod=await import('./artifact.mjs').catch(()=>({}));
const t={service:'fixture',repositoryId:1,assetRoots:['index.html','_headers'],assetDirectories:['assets','ffmpeg']};
const identity={sourceSha:'a'.repeat(40),runId:1,attempt:1,prNumber:7};
test('release includes exact Worker bytes and complete inventory, never executes code',async()=>{
 assert.equal(typeof mod.pack,'function','release packer must exist');
 const root=await mkdtemp(join(tmpdir(),'worker-release-'));
 try{await mkdir(join(root,'assets'));await writeFile(join(root,'assets/index.html'),'fixture');await writeFile(join(root,'worker.mjs'),'throw Error("must never execute")');
 const dest=join(root,'release');const manifest=await mod.pack(t,{assets:join(root,'assets'),worker:join(root,'worker.mjs'),destination:dest,...identity});
 assert.deepEqual(manifest.files.map(f=>f.path).sort(),['assets/index.html','worker/index.mjs']);assert.equal((await mod.validateDirectory(t,dest,identity)).files.length,2);
 await writeFile(join(dest,'assets/extra.js'),'extra');await assert.rejects(mod.validateDirectory(t,dest,identity));await rm(join(dest,'assets/extra.js'));
 await symlink(join(root,'worker.mjs'),join(dest,'assets/link.js'));await assert.rejects(mod.validateDirectory(t,dest,identity));await rm(join(dest,'assets/link.js'));
 await writeFile(join(dest,'worker/index.mjs'),'changed');await assert.rejects(mod.validateDirectory(t,dest,identity));
 }finally{await rm(root,{recursive:true,force:true})}
});
test('manifest rejects traversal, arbitrary config, duplicates, missing module/index and wrong identity',()=>{
 assert.equal(typeof mod.validateManifest,'function');
 const file=(path,bytes=1)=>({path,bytes,sha256:'c'.repeat(64)});const good={schema:1,service:t.service,repositoryId:1,...identity,files:[file('assets/index.html'),file('worker/index.mjs')]};
 mod.validateManifest(t,good,identity);
 mod.validateManifest(t,{...good,files:[...good.files,file('assets/assets/photo.avif')]},identity);
 for(const path of ['../index.html','assets/../x.js','assets/.env','assets/package.json','assets/a.map','assets/functions/x.js','wrangler.jsonc','worker/hooks.mjs'])assert.throws(()=>mod.validateManifest(t,{...good,files:[...good.files,file(path)]},identity));
 for(const files of [[good.files[0]],[good.files[1]],[...good.files,good.files[0]]])assert.throws(()=>mod.validateManifest(t,{...good,files},identity));
 for(const key of ['sourceSha','runId','attempt','prNumber'])assert.throws(()=>mod.validateManifest(t,{...good,[key]:key==='sourceSha'?'b'.repeat(40):2},identity));
 assert.throws(()=>mod.validateManifest(t,{...good,config:{}},identity));assert.throws(()=>mod.validateManifest(t,{...good,files:[file('assets/index.html',26*1024**2),file('worker/index.mjs')]},identity));
});
