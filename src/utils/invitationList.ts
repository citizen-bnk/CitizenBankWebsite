export const INVESTOR_INVITATIONS_PATH='/back-office-investors#invitations';
export function managesInvestorInvitations(roles:readonly string[]){return roles.some(role=>role==='admin'||role==='super_admin');}
export function investorInvitationPath(roles:readonly string[]){return managesInvestorInvitations(roles)?INVESTOR_INVITATIONS_PATH:'/board-portal-invitations';}
type InvitationState={status:string;user_resend_count?:number|null;role?:string;invitation_type?:string;expires_at?:string|null};
export function filterInvitations<T extends InvitationState>(records:readonly T[],tab:string):T[]{
 const awaiting=(record:T)=>['pending','sent'].includes(record.status);
 return records.filter(record=>tab==='new'?awaiting(record)&&(record.user_resend_count??0)===0:
  tab==='resent'?awaiting(record)&&(record.user_resend_count??0)>0:
  tab==='expired'?['expired','cancelled'].includes(record.status):true);
}
export function onlyInvestorInvitations<T extends InvitationState>(records:readonly T[]):T[]{return records.filter(r=>r.role==='investor'||r.invitation_type==='investor');}
