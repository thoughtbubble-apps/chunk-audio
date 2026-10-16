import {cpSync, mkdirSync} from "node:fs";
mkdirSync("public/ffmpeg", {recursive:true});
cpSync("node_modules/@ffmpeg/core/dist", "public/ffmpeg", {recursive:true});
