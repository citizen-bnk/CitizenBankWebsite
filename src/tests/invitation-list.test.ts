import test from 'node:test';
import assert from 'node:assert/strict';
import {filterInvitations,investorInvitationPath,onlyInvestorInvitations} from '../utils/invitationList';
test('missing or null resend counters cannot hide pending invitations',()=>{
 const records=[{id:1,status:'pending'},{id:2,status:'pending',user_resend_count:null},{id:3,status:'sent',user_resend_count:0},{id:4,status:'pending',user_resend_count:2},{id:5,status:'accepted'}];
 assert.deepEqual(filterInvitations(records,'new').map(r=>r.id),[1,2,3]);
 assert.deepEqual(filterInvitations(records,'resent').map(r=>r.id),[4]);
 assert.equal(filterInvitations(records,'all').length,5);
});
test('admin investor cards open the investor directory and exclude board records',()=>{
 assert.equal(investorInvitationPath(['super_admin']),'/back-office-investors#invitations');
 assert.equal(investorInvitationPath(['admin']),'/back-office-investors#invitations');
 assert.equal(investorInvitationPath(['investor']),'/board-portal-invitations');
 assert.equal(onlyInvestorInvitations([{status:'pending',role:'board_member'},{status:'pending',role:'investor'}]).length,1);
});
