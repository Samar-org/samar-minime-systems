import { spawnSync } from 'node:child_process';
// Workspace package exports point at dist; fresh checkouts must generate them first.
for (const args of [
 ['--filter','@samar/worker...','build'],
 ['exec','vitest','run','--pool=forks','--maxWorkers=2','--minWorkers=1'],
]) {
 const result=spawnSync('pnpm',args,{stdio:'inherit'});
 if(result.status!==0)process.exit(result.status??1);
}
