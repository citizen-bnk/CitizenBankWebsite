# Shared profile stages

The restored website keeps one `user_profiles` record per identity. Stages organise its existing fields; they do not create separate profiles or grant access to banking, investment, or staff APIs.

| Stage | Eligibility | Information shown |
| --- | --- | --- |
| Basic | Every registered user | Name, birth date, contact details, photo/bio, account status and settings |
| Standard | User has an account in the website banking `accounts` table | Identity and address details; registered-business details when applicable |
| Advanced | User has a linked investment subscription or an investor, shareholder, employee, board or staff role | Professional and investor details, board profile and assigned roles |

Eligibility is calculated on each profile read. A generic `customer` role does not unlock Standard because website registration assigns that role before a banking account exists. An investor without a banking account sees Basic and Advanced; the identity details needed for investment appear within Advanced. Subscription checks use the authenticated `user_id`, never email alone, because several historical investors share a contact email.

The website `accounts` table is not Citizen Bank Core's account store. Before treating these stages as an ecosystem-wide entitlement, integrate Core's account ownership through the existing authenticated service boundary and verify identity mapping. Continue to authorize each operation in its owning subsystem; a visible profile stage is only a navigation aid.
