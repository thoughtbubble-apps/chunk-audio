import {test,expect} from "@playwright/test";
import JSZip from "jszip";
import {readFileSync} from "node:fs";
function wav(){
 const samples=8000;const data=Buffer.alloc(44+samples*2);
 data.write("RIFF");data.writeUInt32LE(data.length-8,4);data.write("WAVEfmt ",8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(8000,24);data.writeUInt32LE(16000,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write("data",36);data.writeUInt32LE(samples*2,40);
 for(let i=0;i<samples;i++) data.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/8000)*8000),44+i*2);
 return data;
}
test("same-origin ffmpeg loads, splits synthetic audio and downloads ZIP",async({page})=>{
 await page.goto("/");
 expect(await page.evaluate(()=>crossOriginIsolated)).toBe(true);
 await page.locator('input[type="file"]').setInputFiles({name:"fixture.wav",mimeType:"audio/wav",buffer:wav()});
 await page.getByRole("button",{name:"Chunk",exact:true}).click();
 const button=page.getByRole("button",{name:"Export ZIP",exact:true});
 await expect(button).toBeEnabled({timeout:60_000});
 const downloadPromise=page.waitForEvent("download");await button.click();const download=await downloadPromise;
 expect(download.suggestedFilename()).toMatch(/\.zip$/);
 const bytes=readFileSync(await download.path());expect(bytes.subarray(0,2).toString()).toBe("PK");expect(bytes.length).toBeGreaterThan(100);
 const zip=await JSZip.loadAsync(bytes);const tracks=Object.values(zip.files).filter(file=>!file.dir && file.name.endsWith(".mp3"));expect(tracks.length).toBeGreaterThan(0);for(const track of tracks)expect((await track.async("uint8array")).length).toBeGreaterThan(100);
 await page.goto("/preview-route");await expect(page.locator('input[type="file"]')).toBeAttached();
});
