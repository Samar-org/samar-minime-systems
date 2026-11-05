import { readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const compiler=createRequire(import.meta.url).resolve('typescript/bin/tsc');
// Dependencies need generated declaration files before consumer typechecking.
const built=spawnSync('pnpm',['exec','turbo','run','build','--filter=!@samar/dashboard'],{stdio:'inherit'});
if(built.status!==0)process.exit(built.status??1);
const configurations=[];
for(const group of ['platform','modules','projects','apps']) {
 for(const entry of readdirSync(group,{withFileTypes:true})) {
  if(!entry.isDirectory())continue;
  const path=`${group}/${entry.name}/tsconfig.json`;
  if(!existsSync(path))throw new Error(`Missing TypeScript configuration: ${path}`);
  configurations.push(path);
 }
}
let failed=false;
for(const path of configurations) {
 const result=spawnSync(process.execPath,[compiler,'--noEmit','--project',path],{stdio:'inherit'});
 if(result.status!==0)failed=true;
}
if(failed)process.exit(1);
console.log(`Typechecked ${configurations.length} workspace configurations`);
