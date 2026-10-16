import {setTimeout} from "node:timers/promises";
export async function waitForVersion(url, sha, {attempts=15, intervalMs=1000, requestTimeoutMs=5000}={}) {
 let last="no response";
 for(let attempt=0;attempt<attempts;attempt++){
  try{
   const response=await fetch(`${url}/__version`,{cache:"no-store",signal:AbortSignal.timeout(requestTimeoutMs)});
   last=`HTTP ${response.status}`;
   if(response.status===200){const version=await response.json();if(version.sha===sha)return version;last="source SHA mismatch";}else{await response.body?.cancel();}
  }catch{last="transport or invalid version response";}
  if(attempt+1<attempts)await setTimeout(intervalMs);
 }
 throw Error(`Deployment readiness failed: expected source SHA was not observed after ${attempts} checks (${last})`);
}
