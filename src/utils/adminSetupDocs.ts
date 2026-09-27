/**
 * Admin Setup Guide Documentation
 * 
 * This file contains comprehensive documentation for setting up
 * administrators and back office staff in the Citizen Bank platform.
 */

export const ADMIN_SETUP_GUIDE = `
=============================================================================
  ADMIN SETUP GUIDE - CITIZEN BANK PLATFORM
=============================================================================

OVERVIEW
--------
This guide explains how to set up administrators and back office staff.

=============================================================================
1. CREATING THE FIRST SUPER ADMINISTRATOR
=============================================================================

The first super admin must be created using a secure setup token.
This is a ONE-TIME PROCESS.

PREREQUISITES:
- Access to application secrets/environment variables
- The SUPER_ADMIN_SETUP_TOKEN value from your secrets

STEPS:

Step 1: Get Your Setup Token
  1. Navigate to your app's secrets management (in Databutton workspace)
  2. Find the secret named: SUPER_ADMIN_SETUP_TOKEN
  3. Copy this value - you'll need it in Step 3

Step 2: Navigate to Setup Guide
  1. Go to your application homepage
  2. Click "Admin Setup Guide" link in:
     - Footer (under "Investment" section)
     - Home page banner (purple alert box)
     - User menu dropdown (if logged in as super admin)
  3. Or use direct URL: /admin-setup-guide

Step 3: Initialize Super Admin
  1. On the Admin Setup Guide page, fill out the form:
     - Setup Token: Paste SUPER_ADMIN_SETUP_TOKEN from Step 1
     - Email Address: admin@citizenhub.co.za
     - Full Name: Administrator's full name
     - Phone Number: +266 5800 0000
     - ID Number: ID or Passport number
  2. Click "Initialize Super Admin"
  3. Upon success, the admin account is created in the system

Step 4: Register User Account
  1. User must register via Sign-Up page using SAME email address
  2. Once registered, they automatically have super admin privileges
  3. They can now access the Admin Dashboard

=============================================================================
2. CREATING ADDITIONAL SUPER ADMINS
=============================================================================

Once you have one super admin, create more through the dashboard.

STEPS:
  1. Log in as a super administrator
  2. Navigate to Admin Dashboard (/admin-dashboard)
  3. Go to "Manage Users" section
  4. Search for an existing registered user
  5. Assign the "super_admin" role
  6. User must log out and back in for changes to take effect

=============================================================================
3. CREATING BACK OFFICE STAFF
=============================================================================

Back office staff handle operational tasks like document verification,
subscription management, and member onboarding.

PROCESS OVERVIEW:
  User Registration → Role Assignment → Access Granted

STEPS:

Step 1: User Registers
  1. Person goes to Sign-Up page (/auth/sign-up)
  2. Completes registration with their details
  3. Verifies their email address

Step 2: Admin Assigns Back Office Role
  1. Super admin logs into Admin Dashboard
  2. Navigate to "Manage Users" section
  3. Search for newly registered user by email
  4. Assign role: back_office_staff
  5. Save changes

Step 3: User Accesses Back Office
  1. User logs out and logs back in
  2. Navigate to Back Office Dashboard (/back-office-dashboard)
  3. They now have access to:
     - Board member management
     - Document review and approval
     - Subscription processing
     - License document tracking
     - Invitation management

=============================================================================
4. ROLE DEFINITIONS
=============================================================================

SUPER ADMIN (super_admin)
  - Full system access
  - Manage all users and assign roles
  - Access all administrative features
  - Create and manage back office staff
  - Access audit logs and system configuration

BACK OFFICE STAFF (back_office_staff)
  - Operational access only
  - Document verification and approval
  - Subscription management
  - Board member appointment and management
  - License document processing
  - Invitation sending and tracking
  - Cannot manage user roles or system configuration

BOARD MEMBER (board_member)
  - Access Board Portal
  - Upload required documents
  - View board positions and appointments
  - Access investment opportunities
  - Submit share subscriptions

INVESTOR (investor)
  - Access investment portal
  - View investment opportunities
  - Track portfolio and dividends

CUSTOMER (customer)
  - Access customer banking portal
  - View accounts and balances
  - Make transfers and payments
  - Manage beneficiaries, apply for loans
  - Card management

=============================================================================
5. COMMON ISSUES & TROUBLESHOOTING
=============================================================================

ISSUE: "Invalid setup token" error
SOLUTION:
  - Verify exact token value from SUPER_ADMIN_SETUP_TOKEN
  - Check for extra spaces or line breaks
  - Ensure secret exists in your environment

ISSUE: "Super admin already exists" error
SOLUTION:
  - First super admin already created
  - Use Admin Dashboard to create additional admins

ISSUE: User can't access Back Office after role assignment
SOLUTION:
  - User MUST log out and log back in for role changes
  - Verify correct role (back_office_staff) was assigned

ISSUE: Email mismatch during registration
SOLUTION:
  - Ensure user registers with EXACT same email
  - Email addresses are case-insensitive but must match

=============================================================================
6. SECURITY BEST PRACTICES
=============================================================================

1. Protect the Setup Token
   - Never share SUPER_ADMIN_SETUP_TOKEN publicly
   - Store securely in environment secrets only

2. Role Assignment
   - Only assign super_admin to trusted individuals
   - Regularly audit user roles and permissions

3. Access Control
   - Monitor audit logs for suspicious activity
   - Implement strong password policies

=============================================================================
`;

export const SETUP_STEPS = {
  FIRST_ADMIN: [
    'Get SUPER_ADMIN_SETUP_TOKEN from app secrets',
    'Navigate to /admin-setup-guide',
    'Fill form with token and admin details',
    'Submit to initialize super admin',
    'Register user account with same email',
  ],
  ADDITIONAL_ADMIN: [
    'Log in as super admin',
    'Go to Admin Dashboard',
    'Search for existing user',
    'Assign super_admin role',
  ],
  BACK_OFFICE: [
    'User registers via Sign-Up page',
    'Admin assigns back_office_staff role',
    'User logs out and back in',
    'Access Back Office Dashboard',
  ],
};

export const ROLE_PERMISSIONS = {
  super_admin: [
    'Full system access',
    'User management',
    'Role assignment',
    'Audit logs',
    'System configuration',
  ],
  back_office_staff: [
    'Document verification',
    'Subscription management',
    'Board member management',
    'Invitation management',
    'License document processing',
  ],
  board_member: [
    'Board portal access',
    'Document upload',
    'Investment opportunities',
    'Share subscriptions',
  ],
  investor: [
    'Investment portal',
    'Portfolio tracking',
    'Dividend information',
  ],
  customer: [
    'Banking portal',
    'Account management',
    'Transfers and payments',
    'Loan applications',
  ],
};

export const ACCESS_POINTS = [
  { location: 'Home page banner', path: '/', visibility: 'All users + super admins' },
  { location: 'Header dropdown', path: 'User menu', visibility: 'Super admins only' },
  { location: 'Footer', path: 'Investment section', visibility: 'All users' },
  { location: 'Direct URL', path: '/admin-setup-guide', visibility: 'All users' },
];
