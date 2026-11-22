type Item={label:string;path:string;description:string;roles?:readonly string[]};
export const backOfficeWorkspaces:{id:string;label:string;description:string;items:Item[]}[]=[
  {
    "id": "investors",
    "label": "Investors",
    "description": "Profiles, invitations and investments.",
    "items": [
      {"label":"Source reconciliation","path":"/back-office-investor-reconciliation","description":"Contacts, holdings, bank evidence and exceptions.","roles":["admin","super_admin"]},
      {
        "label": "Investor profiles",
        "path": "/back-office-investors",
        "description": "Manage details and open portfolios.",
        "roles": [
          "admin",
          "super_admin"
        ]
      },
      {
        "label": "Invited investors",
        "path": "/back-office-investor-invitations",
        "description": "Acceptance, email status and resending.",
        "roles": [
          "admin",
          "super_admin"
        ]
      },
      {
        "label": "Invite investor",
        "roles": ["admin", "super_admin"],
        "path": "/back-office-investors?invite=1",
        "description": "Add a prospect and send an invitation."
      },
      {"label":"Prospects & imports","path":"/back-office-investor-leads","description":"Maintain prospects and import lead lists."},
      {
        "label": "Subscriptions & payments",
        "path": "/back-office-subscriptions",
        "description": "Review subscriptions and record payments."
      },
      {
        "label": "Subscribe on behalf",
        "path": "/back-office-subscribe-on-behalf",
        "description": "Capture an investment for a subscriber."
      },
      {
        "label": "Certificates",
        "path": "/back-office-certificates",
        "description": "Preview and manage certificates."
      },
      {
        "label": "Admin subscriptions",
        "path": "/back-office-admin-subscriptions",
        "description": "Additional subscription controls."
      },
      {
        "label": "Share promotions",
        "path": "/back-office-share-promotions",
        "description": "Manage approved share promotions.",
        "roles": [
          "super_admin",
          "staff"
        ]
      }
    ]
  },
  {
    "id": "board",
    "label": "Board",
    "description": "Members, appointments and governance.",
    "items": [
      {
        "label": "Board members",
        "path": "/back-office-board-members",
        "description": "Manage board member records."
      },
      {
        "label": "Board invitations",
        "path": "/back-office-invitations",
        "description": "Invite members and track acceptance."
      },
      {
        "label": "Board positions",
        "path": "/admin-board-positions",
        "description": "Maintain appointment positions.",
        "roles": [
          "admin",
          "super_admin"
        ]
      },
      {
        "label": "Board mapping",
        "path": "/back-office-board-mapping",
        "description": "Review appointment coverage."
      },
      {
        "label": "Board investments",
        "path": "/back-office-board-investments",
        "description": "Review member investment records."
      },
      {
        "label": "Governance & voting",
        "path": "/governance-admin",
        "description": "Meetings, resolutions and votes."
      },
      {
        "label": "Board engagement",
        "path": "/back-office-engagement",
        "description": "Communicate with board members."
      }
    ]
  },
  {
    "id": "documents",
    "label": "Documents",
    "description": "Evidence, templates and private access.",
    "items": [
      {
        "label": "License documents",
        "path": "/back-office-license-documents",
        "description": "Review licensing evidence."
      },
      {
        "label": "Board documents",
        "path": "/back-office-board-documents",
        "description": "Manage board documentation."
      },
      {
        "label": "Data room",
        "path": "/back-office-data-room",
        "description": "Maintain investment information."
      },
      {
        "label": "Data room access",
        "path": "/back-office-data-room-access",
        "description": "Review permitted access."
      },
      {
        "label": "Certificate templates",
        "path": "/back-office-certificate-templates",
        "description": "Maintain document layouts."
      }
    ]
  },
  {
    "id": "communications",
    "label": "Communications",
    "description": "Email delivery and business updates.",
    "items": [
      {
        "label": "Email delivery",
        "roles": ["admin", "super_admin"],
        "path": "/back-office-sent-items",
        "description": "Sender connection, provider IDs and send history."
      },
      {
        "label": "Communication",
        "path": "/communication-portal",
        "description": "Manage communications."
      },
      {
        "label": "Media releases",
        "path": "/back-office-media-releases",
        "description": "Publish business news."
      },
      {
        "label": "Achievements",
        "path": "/back-office-achievements",
        "description": "Maintain milestones and progress."
      },
      {
        "label": "Notification analytics",
        "path": "/notification-analytics",
        "description": "Review notification activity."
      }
    ]
  },
  {
    "id": "settings",
    "label": "Settings",
    "description": "Users, reference data and website settings.",
    "items": [
      {
        "label": "User access",
        "path": "/admin-users",
        "description": "Manage roles and account access.",
        "roles": [
          "admin",
          "super_admin"
        ]
      },
      {
        "label": "Website settings",
        "path": "/website-settings",
        "description": "Maintain public website information.",
        "roles": [
          "admin",
          "super_admin"
        ]
      },
      {
        "label": "Reference settings",
        "path": "/reference-settings",
        "description": "Maintain shared lookup values.",
        "roles": [
          "admin",
          "super_admin"
        ]
      },
      {
        "label": "Share classes",
        "path": "/back-office-share-classes",
        "description": "Review the current share configuration."
      },
      {
        "label": "Bank accounts",
        "path": "/back-office-bank-accounts",
        "description": "Maintain payment instructions."
      },
      {
        "label": "Crypto wallets",
        "path": "/back-office-crypto-wallets",
        "description": "Maintain supported payment wallets."
      }
    ]
  }
];
export function workspaceItems(id:string,roles:readonly string[]){
 if(!roles.some(role=>['admin','super_admin','staff','back_office'].includes(role)))return [];
 return (backOfficeWorkspaces.find(w=>w.id===id)?.items||[]).filter(item=>!item.roles||item.roles.some(role=>roles.includes(role)));
}
export function activeWorkspace(path:string){return backOfficeWorkspaces.find(w=>w.items.some(i=>i.path.split(/[?#]/)[0]===path))?.id;}
