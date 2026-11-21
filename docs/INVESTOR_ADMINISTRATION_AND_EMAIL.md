# Investor administration and email delivery

Updated 21 November 2026.

## Compact administration

Back Office has five role-filtered workspaces: Investors, Board, Documents, Communications and Settings. Each opens a small dashboard of actions, with search. Lists remain separate screens; investor editing, invitation creation, portfolios and email previews use dialogs. Navigation wraps on narrow screens rather than requiring horizontal scrolling. All previous service routes remain available.

For administrators: Back Office → Investors → Invited investors. The same list is directly linked from the signed-in account menu and from the Hub Invest workspace. It supports name/email search, acceptance-state filters, pagination, resending and cancellation. Board invitations are a separately labelled Board action.

The simple investor invitation dialog takes name and email. Server-side role checks require a verified administrator identity. Creation uses an email-scoped lock, reuses an existing invitation, and atomically saves the invitation, durable outbox entry and audit link. The current approved Class B offer supplies the offer reference; it does not issue shares or confirm payment. The recipient follows the existing invitation acceptance/password setup flow.

The legacy prospect/import screens remain accessible. Their single and bulk send actions now save outbox entries and audit links rather than reporting immediate delivery before a durable history record exists. The queue dispatcher sends after commit. Existing scheduled dispatch applies; an administrator can process the queue through the authorised email controls.

## Actual email path

Website email service → `ai.citizenbank.co.ls/api/internal/invitation-email` → Resend, using server credentials on the original Vercel `citizenbankcore` project. The sender is `Citizen Bank Invitations <invitations@citizenbank.co.ls>` and reply-to is `admin@citizenbank.co.ls`.

This differs from the Vercel Resend Marketplace installation, which had no attached projects at inspection. A mailbox welcome email establishes that meshthang@gmail.com has a Resend account, but does not establish that Core's active key belongs to that account. Do not label it as the confirmed sending-account owner until the matching team/domain has been checked.

Communications → Email delivery exposes a manual, administrator-only connection check and links to Resend's email log and Core settings. Private Core diagnostics return sender, configured account label (if supplied), a non-secret connection fingerprint and permitted domain metadata. They never return keys, message contents or recipient lists. A sending-only API key may not have read access; that is reported separately from sending failure.

New email history records store the genuine Resend message ID. Previously generated `EM-...` references are retained; they cannot be represented as provider delivery evidence. The email detail dialog can query the last provider event only for a valid provider ID already recorded in Citizen email history. “Accepted by provider” does not mean delivered, read or placed in the inbox. Historical messages without a genuine provider ID require comparison in the matching Resend team by recipient, subject and time.

No investor data is replaced and no mail is sent merely by opening a dashboard, running a connection check or building a deployment. Live record and role verification still require the investor database to be available. The retained free-plan quota pause cannot be repaired by UI changes.
