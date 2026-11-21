import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {backOfficeWorkspaces,workspaceItems} from '../utils/backOfficeWorkspaces';
test('customers cannot see back-office actions and investor management stays privileged',()=>{
 for(const w of backOfficeWorkspaces)assert.deepEqual(workspaceItems(w.id,['customer']),[]);
 assert(!workspaceItems('investors',['staff']).some(i=>i.path.includes('back-office-investors')));
 const admin=workspaceItems('investors',['super_admin']);assert(admin.some(i=>i.path.endsWith('#invitations')));assert(admin.some(i=>i.label==='Invite investor'));
});
test('every dashboard action resolves to an existing route, including hash navigation',()=>{
 const routes=readFileSync(new URL('../user-routes.tsx',import.meta.url),'utf8');
 for(const group of backOfficeWorkspaces)for(const item of group.items)assert(routes.includes('"'+item.path.split(/[?#]/)[0]+'"'),item.path);
 assert.equal(backOfficeWorkspaces.length,5);
});
