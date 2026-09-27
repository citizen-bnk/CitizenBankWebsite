/**
 * AIAnalysis
 * AI-generated analysis of lead health.
 */
export interface AIAnalysis {
  /** Is Stalled */
  is_stalled: boolean;
  /** Confidence */
  confidence: number;
  /** Summary */
  summary: string;
  /** Recommended Actions */
  recommended_actions: string[];
  /** Priority */
  priority: string;
}

/** AcceptInvitationRequest */
export interface AcceptInvitationRequest {
  /** Token */
  token: string;
}

/** AcceptInvitationResponse */
export interface AcceptInvitationResponse {
  /** Success */
  success: boolean;
  /** Role */
  role: string;
  /** Message */
  message: string;
}

/** AccessLogResponse */
export interface AccessLogResponse {
  /** Id */
  id: number;
  /** User Id */
  user_id: string;
  /** Document Id */
  document_id: number;
  /** Document Name */
  document_name: string;
  /** Accessed At */
  accessed_at: string;
  /** Access Reason */
  access_reason: string | null;
  /** Ip Address */
  ip_address: string | null;
  /** User Agent */
  user_agent: string | null;
}

/** AccessLogsListResponse */
export interface AccessLogsListResponse {
  /** Logs */
  logs: AccessLogResponse[];
  /** Total */
  total: number;
}

/** AccessStatusResponse */
export interface AccessStatusResponse {
  /** Has Access */
  has_access: boolean;
  /** Ncnda Signed */
  ncnda_signed: boolean;
  /** Terms Signed */
  terms_signed: boolean;
  /** Loi Agreed */
  loi_agreed: boolean;
  /** Missing Agreements */
  missing_agreements: string[];
}

/**
 * Account
 * Bank account model
 */
export interface Account {
  /** Id */
  id: number;
  /** Account Number */
  account_number: string;
  /** User Id */
  user_id: string;
  /** Account Type */
  account_type: "checking" | "savings" | "fixed_deposit" | "business";
  /** Account Name */
  account_name: string;
  /** Balance */
  balance: string;
  /** Available Balance */
  available_balance: string;
  /**
   * Currency
   * @default "ZAR"
   */
  currency?: string;
  /** Status */
  status: "active" | "inactive" | "frozen" | "closed";
  /** Interest Rate */
  interest_rate?: string | null;
  /**
   * Opened Date
   * @format date-time
   */
  opened_date: string;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /**
   * Updated At
   * @format date-time
   */
  updated_at: string;
}

/**
 * AccountSummary
 * Account summary for dashboard
 */
export interface AccountSummary {
  /** Total Balance */
  total_balance: string;
  /** Checking Balance */
  checking_balance: string;
  /** Savings Balance */
  savings_balance: string;
  /** Fixed Deposit Balance */
  fixed_deposit_balance: string;
  /** Active Accounts */
  active_accounts: number;
}

/**
 * Achievement
 * Achievement model
 */
export interface Achievement {
  /** Id */
  id: number;
  /** Title */
  title: string;
  /** Description */
  description: string;
  /**
   * Achievement Date
   * @format date
   */
  achievement_date: string;
  /** Category */
  category: string;
  /** Image Url */
  image_url?: string | null;
  /** Display Order */
  display_order: number;
  /** Is Published */
  is_published: boolean;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /**
   * Updated At
   * @format date-time
   */
  updated_at: string;
  /** Created By */
  created_by?: string | null;
}

/** ActionItemRequest */
export interface ActionItemRequest {
  /**
   * Title
   * @minLength 1
   * @maxLength 255
   */
  title: string;
  /** Description */
  description?: string | null;
  /** Assigned To */
  assigned_to: string;
  /** Due Date */
  due_date?: string | null;
  /**
   * Priority
   * @default "medium"
   */
  priority?: string | null;
}

/** ActionItemResponse */
export interface ActionItemResponse {
  /** Id */
  id: string;
  /** Meeting Id */
  meeting_id: string;
  /** Title */
  title: string;
  /** Description */
  description: string | null;
  /** Assigned To */
  assigned_to: string;
  /** Due Date */
  due_date: string | null;
  /** Status */
  status: string;
  /** Priority */
  priority: string;
  /** Completed At */
  completed_at: string | null;
  /** Completed By */
  completed_by: string | null;
  /** Created At */
  created_at: string;
  /** Updated At */
  updated_at: string;
}

/**
 * ActivityLog
 * Activity log entry.
 */
export interface ActivityLog {
  /**
   * Activity Type
   * Type of activity performed
   */
  activity_type: "page_view" | "click" | "download" | "form_submit" | "search";
  /**
   * Page Path
   * Path of the page where activity occurred
   */
  page_path?: string | null;
  /**
   * Element Name
   * Name/label of the clicked element
   */
  element_name?: string | null;
  /**
   * Element Type
   * Type of element (button, link, form, etc.)
   */
  element_type?: string | null;
  /**
   * Metadata
   * Additional context
   */
  metadata?: Record<string, any> | null;
}

/**
 * ActivityLogResponse
 * Response after logging activity.
 */
export interface ActivityLogResponse {
  /** Success */
  success: boolean;
  /** Id */
  id: number;
  /**
   * Timestamp
   * @format date-time
   */
  timestamp: string;
}

/** ActivityResponse */
export interface ActivityResponse {
  /** Id */
  id: number;
  /** Activity Type */
  activity_type: string;
  /** Details */
  details: Record<string, any>;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /** Created By */
  created_by: string | null;
}

/**
 * ActivitySummary
 * User activity summary
 */
export interface ActivitySummary {
  /** Login Count */
  login_count: number;
  /** Last Login At */
  last_login_at?: string | null;
  /** Last Login Ip */
  last_login_ip?: string | null;
  /**
   * Registration Date
   * @format date-time
   */
  registration_date: string;
  /** Days Since Registration */
  days_since_registration: number;
}

/** AddNoteRequest */
export interface AddNoteRequest {
  /** Note */
  note: string;
}

/**
 * AdminListResponse
 * Admin list response with all achievements
 */
export interface AdminListResponse {
  /** Achievements */
  achievements: Achievement[];
  /** Total */
  total: number;
}

/** AgendaItemRequest */
export interface AgendaItemRequest {
  /** Item Number */
  item_number: number;
  /**
   * Title
   * @minLength 1
   * @maxLength 255
   */
  title: string;
  /** Description */
  description?: string | null;
  /** Duration Minutes */
  duration_minutes?: number | null;
  /** Presenter */
  presenter?: string | null;
  /** Attachments */
  attachments?: any[] | null;
}

/** AgendaItemResponse */
export interface AgendaItemResponse {
  /** Id */
  id: string;
  /** Meeting Id */
  meeting_id: string;
  /** Item Number */
  item_number: number;
  /** Title */
  title: string;
  /** Description */
  description: string | null;
  /** Duration Minutes */
  duration_minutes: number | null;
  /** Presenter */
  presenter: string | null;
  /** Attachments */
  attachments: any[];
  /** Created At */
  created_at: string;
}

/** AgreementRecord */
export interface AgreementRecord {
  /** Id */
  id: number;
  /** User Id */
  user_id: string;
  /** Agreement Type */
  agreement_type: string;
  /** Signed At */
  signed_at: string;
  /** Agreement Version */
  agreement_version: string | null;
  /** Ip Address */
  ip_address: string | null;
}

/** AgreementsListResponse */
export interface AgreementsListResponse {
  /** Agreements */
  agreements: AgreementRecord[];
  /** Total */
  total: number;
}

/**
 * AlertAcknowledgment
 * Request to acknowledge an alert.
 */
export interface AlertAcknowledgment {
  /** Action Taken */
  action_taken: string;
  /** Notes */
  notes?: string | null;
}

/**
 * AllShareClassesResponse
 * All available share classes.
 */
export interface AllShareClassesResponse {
  /** Classes */
  classes: ShareClassInfo[];
  /** Share configuration data. */
  global_config: ShareConfigResponse;
}

/** AnalyticsResponse */
export interface AnalyticsResponse {
  /** Total Leads */
  total_leads: number;
  /** Leads By Status */
  leads_by_status: Record<string, number>;
  /** Leads By Source */
  leads_by_source: Record<string, number>;
  /** Conversion Rate */
  conversion_rate: number;
  /** Avg Days To Conversion */
  avg_days_to_conversion: number | null;
  /** Recent Conversions */
  recent_conversions: number;
  /** Total Invited */
  total_invited: number;
  /** Invitation Response Rate */
  invitation_response_rate: number;
}

/**
 * AppConfig
 * Public app configuration
 */
export interface AppConfig {
  pushwoosh?: PushwooshConfig | null;
}

/** AppointBoardMemberRequest */
export interface AppointBoardMemberRequest {
  /** User Id */
  user_id?: string | null;
  /** Invitation Id */
  invitation_id?: number | null;
  /** Position */
  position: string;
  /**
   * Term Years
   * @default 3
   */
  term_years?: number;
}

/** ApprovalStatus */
export enum ApprovalStatus {
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
  ChangesRequested = "changes_requested",
}

/** ApprovalType */
export enum ApprovalType {
  Minutes = "minutes",
  Resolution = "resolution",
  Document = "document",
  MeetingRsvp = "meeting_rsvp",
}

/**
 * ApproveDocumentRequest
 * Request to approve a low-confidence document.
 */
export interface ApproveDocumentRequest {
  /** Category Id */
  category_id?: number | null;
  /**
   * Use Suggested Category
   * @default true
   */
  use_suggested_category?: boolean;
}

/**
 * ApproveItemRequest
 * Approve a document or RSVP to a meeting
 */
export interface ApproveItemRequest {
  approval_type: ApprovalType;
  /** Item Id */
  item_id: number;
  /** @default "approved" */
  status?: ApprovalStatus;
  /** Response Value */
  response_value?: string | null;
  /** Comments */
  comments?: string | null;
}

/**
 * AssetAllocation
 * Asset allocation by share class.
 */
export interface AssetAllocation {
  /** Share Class */
  share_class: string;
  /** Total Value */
  total_value: number;
  /** Num Shares */
  num_shares: number;
  /** Percentage */
  percentage: number;
  /** Color */
  color: string;
}

/**
 * AssignPositionRequest
 * Request to assign a position to a board member
 */
export interface AssignPositionRequest {
  /** Position Id */
  position_id: number;
  /** Notes */
  notes?: string | null;
  /** Term Start Date */
  term_start_date?: string | null;
  /** Term End Date */
  term_end_date?: string | null;
}

/**
 * AssignPositionResponse
 * Response for position assignment
 */
export interface AssignPositionResponse {
  /** Success */
  success: boolean;
  /** Message */
  message: string;
  /** Board Member Id */
  board_member_id: number;
  /** Position Id */
  position_id: number;
  /**
   * Appointed At
   * @format date-time
   */
  appointed_at: string;
}

/**
 * AssignRoleRequest
 * Request to assign a role to a user
 */
export interface AssignRoleRequest {
  /** User Id */
  user_id: string;
  /** Role Name */
  role_name: string;
}

/**
 * AtRiskLead
 * Lead flagged as at-risk with analysis.
 */
export interface AtRiskLead {
  /** Lead Id */
  lead_id: number;
  /** Lead Name */
  lead_name: string;
  /** Lead Email */
  lead_email: string;
  /** Lead Company */
  lead_company: string | null;
  /** Status */
  status: string;
  /** Investment Interest */
  investment_interest: string | null;
  /** Days Since Creation */
  days_since_creation: number;
  /** Days In Current Status */
  days_in_current_status: number;
  /** Assignee Name */
  assignee_name: string;
  /** Assignee Email */
  assignee_email: string;
  /** Criteria that caused a lead to be flagged as at-risk. */
  stall_criteria: StallCriteria;
  ai_analysis?: AIAnalysis | null;
  /** Last Activity Date */
  last_activity_date: string | null;
  /** Next Contact Date */
  next_contact_date: string | null;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
}

/** AttendanceRequest */
export interface AttendanceRequest {
  /** Board Member Id */
  board_member_id: string;
  /**
   * Status
   * @pattern ^(present|absent|excused|late)$
   */
  status: string;
  /** Arrival Time */
  arrival_time?: string | null;
  /** Departure Time */
  departure_time?: string | null;
  /** Notes */
  notes?: string | null;
}

/** AttendanceResponse */
export interface AttendanceResponse {
  /** Id */
  id: string;
  /** Meeting Id */
  meeting_id: string;
  /** Board Member Id */
  board_member_id: string;
  /** Status */
  status: string;
  /** Arrival Time */
  arrival_time: string | null;
  /** Departure Time */
  departure_time: string | null;
  /** Notes */
  notes: string | null;
  /** Created At */
  created_at: string;
  /** Updated At */
  updated_at: string;
}

/**
 * AuthUrlResponse
 * OAuth authorization URL response.
 */
export interface AuthUrlResponse {
  /** Auth Url */
  auth_url: string;
  /** State */
  state: string;
}

/**
 * AutoSyncResult
 * Result of automatic sync operation
 */
export interface AutoSyncResult {
  /** Total Unmapped */
  total_unmapped: number;
  /** Successfully Mapped */
  successfully_mapped: number;
  /** Failed Mappings */
  failed_mappings: number;
  /** Mappings */
  mappings: MappingResult[];
}

/** AutomationActionRequest */
export interface AutomationActionRequest {
  /** Action */
  action: string;
  /** Queue Ids */
  queue_ids?: string[] | null;
  /** Config Override */
  config_override?: Record<string, any> | null;
}

/** AutomationRuleConfig */
export interface AutomationRuleConfig {
  /** Rule Type */
  rule_type: string;
  /** Enabled */
  enabled: boolean;
  /** Config */
  config: Record<string, any>;
}

/**
 * AvailableUsersResponse
 * Response with available registered users
 */
export interface AvailableUsersResponse {
  /** Users */
  users: RegisteredUser[];
  /** Total Count */
  total_count: number;
}

/**
 * BankAccount
 * Bank account model.
 */
export interface BankAccount {
  /** Id */
  id: number;
  /** Account Name */
  account_name: string;
  /** Bank Name */
  bank_name: string;
  /** Account Number */
  account_number: string;
  /** Branch Code */
  branch_code: string;
  /** Branch Name */
  branch_name?: string | null;
  /** Swift Code */
  swift_code?: string | null;
  /** Currency */
  currency: string;
  /** Is Active */
  is_active: boolean;
  /** Is Default */
  is_default: boolean;
  /** Description */
  description?: string | null;
}

/** BankAccountDetails */
export interface BankAccountDetails {
  /** Bank Name */
  bank_name: string;
  /** Account Holder */
  account_holder: string;
  /** Account Number */
  account_number: string;
  /**
   * Account Type
   * @default "savings"
   */
  account_type?: string;
  /** Branch Code */
  branch_code?: string | null;
}

/**
 * Beneficiary
 * Beneficiary model
 */
export interface Beneficiary {
  /** Id */
  id: number;
  /** User Id */
  user_id: string;
  /** Beneficiary Name */
  beneficiary_name: string;
  /** Account Number */
  account_number: string;
  /** Bank Name */
  bank_name: string;
  /** Bank Code */
  bank_code?: string | null;
  /** Beneficiary Type */
  beneficiary_type: "internal" | "external" | "international";
  /** Swift Code */
  swift_code?: string | null;
  /**
   * Is Favorite
   * @default false
   */
  is_favorite?: boolean;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /**
   * Updated At
   * @format date-time
   */
  updated_at: string;
}

/**
 * BeneficiaryRequest
 * Add beneficiary request
 */
export interface BeneficiaryRequest {
  /** Beneficiary Name */
  beneficiary_name: string;
  /** Account Number */
  account_number: string;
  /** Bank Name */
  bank_name: string;
  /** Bank Code */
  bank_code?: string | null;
  /** Beneficiary Type */
  beneficiary_type: "internal" | "external" | "international";
  /** Swift Code */
  swift_code?: string | null;
}

/**
 * BillPayment
 * Bill payment model
 */
export interface BillPayment {
  /** Id */
  id: number;
  /** Payment Id */
  payment_id: string;
  /** User Id */
  user_id: string;
  /** Account Id */
  account_id: number;
  /** Biller Name */
  biller_name: string;
  /** Biller Category */
  biller_category: "electricity" | "water" | "telecom" | "internet" | "insurance" | "loan" | "credit_card" | "other";
  /** Account Reference */
  account_reference: string;
  /** Amount */
  amount: string;
  /** Status */
  status: "pending" | "completed" | "failed" | "scheduled";
  /**
   * Payment Date
   * @format date-time
   */
  payment_date: string;
  /** Scheduled Date */
  scheduled_date?: string | null;
  /**
   * Is Recurring
   * @default false
   */
  is_recurring?: boolean;
  /** Recurrence Pattern */
  recurrence_pattern?: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | null;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
}

/**
 * BillPaymentRequest
 * Bill payment request
 */
export interface BillPaymentRequest {
  /** Account Id */
  account_id: number;
  /** Biller Name */
  biller_name: string;
  /** Biller Category */
  biller_category: "electricity" | "water" | "telecom" | "internet" | "insurance" | "loan" | "credit_card" | "other";
  /** Account Reference */
  account_reference: string;
  /** Amount */
  amount: number | string;
  /** Scheduled Date */
  scheduled_date?: string | null;
  /**
   * Is Recurring
   * @default false
   */
  is_recurring?: boolean;
  /** Recurrence Pattern */
  recurrence_pattern?: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | null;
}

/**
 * BoardDashboardResponse
 * Combined dashboard data for board portal
 */
export interface BoardDashboardResponse {
  profile: BoardProfileData | null;
  onboarding_status: OnboardingStatusData | null;
  /** Pending Approvals */
  pending_approvals: PendingApproval[];
  /** Is Chair */
  is_chair: boolean;
  popup_notification: AppApisBoardDashboardPopupNotification | null;
  document_summary: DocumentStatusSummary | null;
  next_meeting: NextMeeting | null;
}

/**
 * BoardDocumentRequirement
 * Document requirement definition
 */
export interface BoardDocumentRequirement {
  /** Id */
  id?: number | null;
  /** Name */
  name: string;
  /** Description */
  description?: string | null;
  /** Jurisdictions */
  jurisdictions?: string[];
  /** File Formats Accepted */
  file_formats_accepted?: string[];
  /**
   * Max File Size Mb
   * @default 10
   */
  max_file_size_mb?: number;
  /**
   * Is Required
   * @default true
   */
  is_required?: boolean;
  /**
   * Requires Certification
   * @default false
   */
  requires_certification?: boolean;
  /** Validity Period Days */
  validity_period_days?: number | null;
  /**
   * Display Order
   * @default 0
   */
  display_order?: number;
  /**
   * Is Active
   * @default true
   */
  is_active?: boolean;
  /**
   * Requires Template
   * @default false
   */
  requires_template?: boolean;
  /** Template File Url */
  template_file_url?: string | null;
  /** Template File Name */
  template_file_name?: string | null;
  /** Template Description */
  template_description?: string | null;
  /** Template Uploaded At */
  template_uploaded_at?: string | null;
  /** Template Uploaded By */
  template_uploaded_by?: string | null;
  /** Created At */
  created_at?: string | null;
  /** Updated At */
  updated_at?: string | null;
  /** Created By */
  created_by?: string | null;
}

/**
 * BoardMemberData
 * Board member specific data
 */
export interface BoardMemberData {
  /** Position */
  position?: string | null;
  /** Status */
  status: string;
  /** Appointed Date */
  appointed_date?: string | null;
  /** Term End Date */
  term_end_date?: string | null;
  /** Term Years */
  term_years?: number | null;
  /** Total Shares */
  total_shares: number;
  /** Documents Count */
  documents_count: number;
  /** Compliance Status */
  compliance_status: string;
}

/**
 * BoardMemberDocument
 * Tracks document submission for a board member
 */
export interface BoardMemberDocument {
  /** Id */
  id?: number | null;
  /** Board Member Id */
  board_member_id: number;
  /** Document Requirement Id */
  document_requirement_id: number;
  /** File Url */
  file_url?: string | null;
  /** File Name */
  file_name?: string | null;
  /** File Size Kb */
  file_size_kb?: number | null;
  /** File Type */
  file_type?: string | null;
  /**
   * Document submission status
   * @default "not_submitted"
   */
  status?: DocumentStatus;
  /** Submitted At */
  submitted_at?: string | null;
  /** Reviewed At */
  reviewed_at?: string | null;
  /** Reviewed By */
  reviewed_by?: string | null;
  /** Rejection Reason */
  rejection_reason?: string | null;
  /** Review Notes */
  review_notes?: string | null;
  /**
   * Resubmission Count
   * @default 0
   */
  resubmission_count?: number;
  /** Expires At */
  expires_at?: string | null;
  /** Created At */
  created_at?: string | null;
  /** Updated At */
  updated_at?: string | null;
}

/**
 * BoardMemberDocumentStatus
 * Board member's document submission status
 */
export interface BoardMemberDocumentStatus {
  /** Document requirement definition */
  requirement: BoardDocumentRequirement;
  submission?: BoardMemberDocument | null;
  /** Is Required */
  is_required: boolean;
  /** Is Complete */
  is_complete: boolean;
  /** Days Until Expiry */
  days_until_expiry?: number | null;
}

/**
 * BoardMemberForNotification
 * Board member details for notification selection
 */
export interface BoardMemberForNotification {
  /** User Id */
  user_id: string;
  /** Full Name */
  full_name: string;
  /** Email */
  email: string;
  /** Position */
  position?: string | null;
}

/** BoardMemberOption */
export interface BoardMemberOption {
  /** User Id */
  user_id: string;
  /** Full Name */
  full_name: string;
  /** Email */
  email: string;
  /** Position */
  position: string | null;
}

/** BoardMemberStats */
export interface BoardMemberStats {
  /** Active */
  active: number;
  /** Total */
  total: number;
}

/** BoardMemberStatusOverview */
export interface BoardMemberStatusOverview {
  /** Board Member Id */
  board_member_id: number;
  /** User Id */
  user_id: string;
  /** Full Name */
  full_name: string;
  /** Position */
  position: string;
  /** Email */
  email: string;
  /** Total Required */
  total_required: number;
  /** Total Submitted */
  total_submitted: number;
  /** Total Approved */
  total_approved: number;
  /** Total Rejected */
  total_rejected: number;
  /** Completion Percentage */
  completion_percentage: number;
  /** Last Activity */
  last_activity?: string | null;
  /** Status */
  status: string;
}

/**
 * BoardMemberWithInvestment
 * Board member with position and investment status
 */
export interface BoardMemberWithInvestment {
  /** Board Member Id */
  board_member_id: number;
  /** User Id */
  user_id: string | null;
  /** Full Name */
  full_name: string;
  /** Email */
  email: string;
  /** Position Name */
  position_name: string | null;
  /** Position Level */
  position_level: number | null;
  /** Minimum Investment Shares */
  minimum_investment_shares: number | null;
  /** Appointed At */
  appointed_at: string | null;
  /** Term End Date */
  term_end_date?: string | null;
  /** Status */
  status?: string | null;
  investment_status: InvestmentStatus | null;
  /** Profile Completion Percentage */
  profile_completion_percentage?: number | null;
  document_compliance?: DocumentCompliance | null;
}

/**
 * BoardMembersInvestmentResponse
 * Response for board members with investment status
 */
export interface BoardMembersInvestmentResponse {
  /** Members */
  members: BoardMemberWithInvestment[];
  /** Total */
  total: number;
}

/**
 * BoardPosition
 * Board position definition
 */
export interface BoardPosition {
  /** Id */
  id: number;
  /** Position Name */
  position_name: string;
  /** Position Level */
  position_level: number;
  /** Description */
  description?: string | null;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
}

/**
 * BoardPositionListResponse
 * Response for listing board positions
 */
export interface BoardPositionListResponse {
  /** Positions */
  positions: BoardPosition[];
}

/**
 * BoardProfileData
 * Board member profile information
 */
export interface BoardProfileData {
  /** Position */
  position: string;
  /** Appointed Date */
  appointed_date: string;
  /** Term End Date */
  term_end_date: string | null;
  /** Status */
  status: string;
  /** Total Shares */
  total_shares: number;
  /** Board Member Id */
  board_member_id: number;
}

/** Body_bulk_import_leads */
export interface BodyBulkImportLeads {
  /**
   * File
   * @format binary
   */
  file: File;
}

/** Body_payments_upload_payment_proof */
export interface BodyPaymentsUploadPaymentProof {
  /**
   * File
   * @format binary
   */
  file: File;
}

/** Body_record_board_member_payment */
export interface BodyRecordBoardMemberPayment {
  /** Payment Date */
  payment_date?: string | null;
  /** Notes */
  notes?: string | null;
  /** Proof Of Payment */
  proof_of_payment?: File | null;
  /**
   * Send Email
   * @default true
   */
  send_email?: boolean;
}

/** Body_resubmit_document */
export interface BodyResubmitDocument {
  /**
   * File
   * @format binary
   */
  file: File;
}

/** Body_upload_achievement_image */
export interface BodyUploadAchievementImage {
  /**
   * File
   * @format binary
   */
  file: File;
}

/** Body_upload_admin_payment_proof */
export interface BodyUploadAdminPaymentProof {
  /**
   * File
   * @format binary
   */
  file: File;
}

/** Body_upload_cv */
export interface BodyUploadCv {
  /**
   * File
   * @format binary
   */
  file: File;
}

/** Body_upload_data_room_document */
export interface BodyUploadDataRoomDocument {
  /**
   * File
   * @format binary
   */
  file: File;
  /** Document Name */
  document_name: string;
  /** Category Id */
  category_id?: number | null;
  /** Description */
  description?: string | null;
  /**
   * Is Required For License
   * @default false
   */
  is_required_for_license?: boolean;
  /**
   * Version
   * @default "1.0"
   */
  version?: string;
}

/** Body_upload_document */
export interface BodyUploadDocument {
  /**
   * File
   * @format binary
   */
  file: File;
}

/** Body_upload_image */
export interface BodyUploadImage {
  /**
   * File
   * @format binary
   */
  file: File;
}

/** Body_upload_pdf_template */
export interface BodyUploadPdfTemplate {
  /**
   * File
   * @format binary
   */
  file: File;
  /** Template Name */
  template_name: string;
  /** Description */
  description?: string | null;
  /** Share Class */
  share_class?: string | null;
}

/** Body_upload_profile_picture */
export interface BodyUploadProfilePicture {
  /**
   * File
   * @format binary
   */
  file: File;
}

/** Body_upload_template */
export interface BodyUploadTemplate {
  /**
   * File
   * @format binary
   */
  file: File;
}

/** BroadcastDocumentRequestBody */
export interface BroadcastDocumentRequestBody {
  /** Requirement Ids */
  requirement_ids: number[];
  /** Board Member Ids */
  board_member_ids?: number[] | null;
  /** Message */
  message?: string | null;
  /** Deadline */
  deadline?: string | null;
  /**
   * Severity
   * @default "normal"
   */
  severity?: string;
  /**
   * Channel
   * @default "email"
   */
  channel?: string;
}

/** BroadcastDocumentRequestResponse */
export interface BroadcastDocumentRequestResponse {
  /** Success */
  success: boolean;
  /** Requests Created */
  requests_created: number;
  /** Members Notified */
  members_notified: number[];
  /** Emails Sent */
  emails_sent: number;
  /** Sms Sent */
  sms_sent: number;
  /** Whatsapp Sent */
  whatsapp_sent: number;
  /** Failed Deliveries */
  failed_deliveries: Record<string, string>[];
}

/** BulkImportSummary */
export interface BulkImportSummary {
  /** Total Rows */
  total_rows: number;
  /** Successful */
  successful: number;
  /** Failed */
  failed: number;
  /** Errors */
  errors: Record<string, string>[];
  /** Created Lead Ids */
  created_lead_ids: number[];
}

/** BulkInvitationResponse */
export interface BulkInvitationResponse {
  /** Total Sent */
  total_sent: number;
  /** Successful */
  successful: number;
  /** Failed */
  failed: number;
  /** Invitation Ids */
  invitation_ids: number[];
  /** Errors */
  errors: Record<string, any>[];
}

/** BulkSendInvitationRequest */
export interface BulkSendInvitationRequest {
  /** Lead Ids */
  lead_ids: number[];
  /** Share Class */
  share_class: string;
  /** Minimum Investment */
  minimum_investment: number;
  /** Special Terms */
  special_terms?: string | null;
  /**
   * Contact Person
   * @default "Investor Relations Team"
   */
  contact_person?: string | null;
  /**
   * Contact Email
   * @default "invest@citizenhub.co.za"
   */
  contact_email?: string | null;
  /**
   * Contact Phone
   * @default "+266 2231 2345"
   */
  contact_phone?: string | null;
}

/**
 * Card
 * Card model
 */
export interface Card {
  /** Id */
  id: number;
  /** Card Number Masked */
  card_number_masked: string;
  /** User Id */
  user_id: string;
  /** Account Id */
  account_id?: number | null;
  /** Card Type */
  card_type: "debit" | "credit";
  /** Card Brand */
  card_brand: "visa" | "mastercard";
  /** Card Name */
  card_name: string;
  /**
   * Expiry Date
   * @format date
   */
  expiry_date: string;
  /** Credit Limit */
  credit_limit?: string | null;
  /** Available Credit */
  available_credit?: string | null;
  /** Daily Limit */
  daily_limit: string;
  /** Monthly Limit */
  monthly_limit: string;
  /** Status */
  status: "active" | "blocked" | "expired" | "cancelled";
  /**
   * Is Contactless
   * @default true
   */
  is_contactless?: boolean;
  /**
   * Is Online Enabled
   * @default true
   */
  is_online_enabled?: boolean;
  /**
   * Issued Date
   * @format date
   */
  issued_date: string;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /**
   * Updated At
   * @format date-time
   */
  updated_at: string;
}

/**
 * CardActionRequest
 * Card action request (block/unblock)
 */
export interface CardActionRequest {
  /** Card Id */
  card_id: number;
  /** Action */
  action: "block" | "unblock";
  /** Reason */
  reason?: string | null;
}

/**
 * CastVoteRequest
 * Cast a vote
 */
export interface CastVoteRequest {
  /** Session Id */
  session_id: number;
  /** Item Id */
  item_id?: number | null;
  /** Vote Value */
  vote_value: string;
  /** Comments */
  comments?: string | null;
  /** Voting As Proxy For */
  voting_as_proxy_for?: string | null;
}

/** CategoryCreate */
export interface CategoryCreate {
  /** Category Name */
  category_name: string;
  /** Description */
  description?: string | null;
  /**
   * Display Order
   * @default 0
   */
  display_order?: number;
  /** Parent Category Id */
  parent_category_id?: number | null;
}

/** CategoryResponse */
export interface CategoryResponse {
  /** Id */
  id: number;
  /** Category Name */
  category_name: string;
  /** Description */
  description: string | null;
  /** Display Order */
  display_order: number;
  /** Parent Category Id */
  parent_category_id: number | null;
  /** Created At */
  created_at: string;
}

/** CategoryUpdate */
export interface CategoryUpdate {
  /** Category Name */
  category_name?: string | null;
  /** Description */
  description?: string | null;
  /** Display Order */
  display_order?: number | null;
}

/**
 * CertificateListResponse
 * Response for certificate list
 */
export interface CertificateListResponse {
  /** Certificates */
  certificates: ShareCertificate[];
  /** Total Count */
  total_count: number;
  /** Filters Applied */
  filters_applied: Record<string, any>;
}

/** CertificateRequest */
export interface CertificateRequest {
  /** Id */
  id: number;
  /** Subscription Id */
  subscription_id: string;
  /** User Id */
  user_id: string;
  /**
   * Requested At
   * @format date-time
   */
  requested_at: string;
  /** Status */
  status: string;
  /** Completed At */
  completed_at?: string | null;
  /** Completed By */
  completed_by?: string | null;
  /** Certificate Id */
  certificate_id?: number | null;
  /** Notes */
  notes?: string | null;
}

/**
 * CertificateRequestWithDetails
 * Certificate request with subscription and shareholder details
 */
export interface CertificateRequestWithDetails {
  /** Id */
  id: number;
  /** Subscription Id */
  subscription_id: string;
  /** User Id */
  user_id: string;
  /**
   * Requested At
   * @format date-time
   */
  requested_at: string;
  /** Status */
  status: string;
  /** Completed At */
  completed_at?: string | null;
  /** Completed By */
  completed_by?: string | null;
  /** Certificate Id */
  certificate_id?: number | null;
  /** Notes */
  notes?: string | null;
  /** Shareholder Name */
  shareholder_name: string;
  /** Shareholder Email */
  shareholder_email: string;
  /** Num Shares */
  num_shares: number;
  /** Share Class */
  share_class: string;
  /** Amount Paid */
  amount_paid: number;
  /** Payment Status */
  payment_status: string;
}

/**
 * CertificateTemplate
 * Certificate template model
 */
export interface CertificateTemplate {
  /** Id */
  id: number;
  /** Template Name */
  template_name: string;
  /** Template Html */
  template_html?: string | null;
  /** Is Active */
  is_active: boolean;
  /** Created By */
  created_by: string;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /**
   * Updated At
   * @format date-time
   */
  updated_at: string;
  /** Version */
  version: number;
  /** Description */
  description?: string | null;
  /** Preview Url */
  preview_url?: string | null;
  /**
   * Template Type
   * @default "pdf"
   */
  template_type?: string;
  /** Pdf Storage Key */
  pdf_storage_key?: string | null;
  /** Share Class */
  share_class?: string | null;
}

/**
 * CertificateVerificationResponse
 * Public certificate verification response
 */
export interface CertificateVerificationResponse {
  /** Verified */
  verified: boolean;
  /** Certificate Number */
  certificate_number: string;
  /** Shareholder Name */
  shareholder_name: string;
  /** Num Shares */
  num_shares: number;
  /** Share Class */
  share_class: string;
  /** Issue Date */
  issue_date: string;
  /** Status */
  status: string;
  /** Qr Code Data */
  qr_code_data?: string | null;
  /** Html Content */
  html_content?: string | null;
}

/**
 * ChannelStats
 * Daily channel performance statistics.
 */
export interface ChannelStats {
  /** Channel */
  channel: string;
  /** Notification Type */
  notification_type: string;
  /** Date */
  date: string;
  /** Total Attempts */
  total_attempts: number;
  /** Total Successes */
  total_successes: number;
  /** Total Failures */
  total_failures: number;
  /** Success Rate */
  success_rate: number;
  /** Unique Recipients */
  unique_recipients: number;
}

/**
 * ChannelStatsResponse
 * Response for channel stats query.
 */
export interface ChannelStatsResponse {
  /** Stats */
  stats: ChannelStats[];
  /** Date Range */
  date_range: Record<string, string>;
}

/**
 * ChatMessage
 * Chat message.
 */
export interface ChatMessage {
  /** Role */
  role: string;
  /** Content */
  content: string;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /** Metadata */
  metadata?: Record<string, any> | null;
}

/** CheckPopupsResponse */
export interface CheckPopupsResponse {
  /** Has Popups */
  has_popups: boolean;
  popup?: AppApisPopupsPopupNotification | null;
  /** Popups Shown Today */
  popups_shown_today: number;
  /** Is Dnd Time */
  is_dnd_time: boolean;
}

/** ChecklistResponse */
export interface ChecklistResponse {
  /** Jurisdiction */
  jurisdiction: string;
  /** Items */
  items: BoardMemberDocumentStatus[];
}

/**
 * CompleteConversationRequest
 * Request to complete conversation and create lead.
 */
export interface CompleteConversationRequest {
  /** Conversation Id */
  conversation_id: number;
  /** Extracted lead data from conversation. */
  extracted_data: ExtractedData;
}

/**
 * CompleteConversationResponse
 * Response after completing conversation.
 */
export interface CompleteConversationResponse {
  /** Lead Id */
  lead_id: number;
  /** Assignment Id */
  assignment_id?: number | null;
  /** Follow Up Id */
  follow_up_id?: number | null;
  /** Story Id */
  story_id?: number | null;
}

/**
 * CompleteFollowUpRequest
 * Request to mark follow-up as completed.
 */
export interface CompleteFollowUpRequest {
  /** Outcome */
  outcome: string;
  /** Notes */
  notes?: string | null;
}

/** CompleteRequestModel */
export interface CompleteRequestModel {
  /** Request Id */
  request_id: number;
}

/**
 * ConnectionStatusResponse
 * Connection status response.
 */
export interface ConnectionStatusResponse {
  /** Is Connected */
  is_connected: boolean;
  /** Message */
  message: string;
}

/**
 * ConversationHistoryResponse
 * Full conversation history.
 */
export interface ConversationHistoryResponse {
  /** Conversation Id */
  conversation_id: number;
  /** Lead Id */
  lead_id?: number | null;
  /** Messages */
  messages: Record<string, any>[];
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
}

/**
 * ConversationResponse
 * Full conversation with messages.
 */
export interface ConversationResponse {
  /** Id */
  id: number;
  /** Status */
  status: string;
  /** Messages */
  messages: ChatMessage[];
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /** Escalated At */
  escalated_at?: string | null;
}

/**
 * ConversionRequest
 * Request to convert an amount between currencies.
 */
export interface ConversionRequest {
  /** Amount */
  amount: number;
  /** From Currency */
  from_currency: string;
  /** To Currency */
  to_currency: string;
  /** Date */
  date?: null;
}

/**
 * ConversionResponse
 * Result of currency conversion.
 */
export interface ConversionResponse {
  /** Amount */
  amount: number;
  /** From Currency */
  from_currency: string;
  /** To Currency */
  to_currency: string;
  /** Converted Amount */
  converted_amount: number;
  /** Exchange Rate */
  exchange_rate: number;
  /**
   * Rate Date
   * @format date
   */
  rate_date: string;
}

/** ConvertShareClassRequest */
export interface ConvertShareClassRequest {
  /**
   * Subscription Id
   * Subscription ID
   */
  subscription_id: string;
  /**
   * New Share Class
   * New share class: Class A, Class B, Class C
   */
  new_share_class: string;
  /**
   * Conversion Reason
   * Reason for conversion
   */
  conversion_reason: string;
  /**
   * Conversion Date
   * Conversion date (ISO format)
   */
  conversion_date?: string | null;
  /**
   * Notes
   * Additional notes
   */
  notes?: string | null;
}

/** ConvertShareClassResponse */
export interface ConvertShareClassResponse {
  /** Success */
  success: boolean;
  /** Subscription Id */
  subscription_id: string;
  /** Old Class */
  old_class: string;
  /** New Class */
  new_class: string;
  /** Num Shares */
  num_shares: number;
  /** Message */
  message: string;
}

/**
 * CreateAchievementRequest
 * Request to create an achievement
 */
export interface CreateAchievementRequest {
  /** Title */
  title: string;
  /** Description */
  description: string;
  /**
   * Achievement Date
   * @format date
   */
  achievement_date: string;
  /** Category */
  category: string;
  /** Image Url */
  image_url?: string | null;
  /**
   * Display Order
   * @default 0
   */
  display_order?: number;
  /**
   * Is Published
   * @default false
   */
  is_published?: boolean;
}

/** CreateAdminRequest */
export interface CreateAdminRequest {
  /**
   * Email
   * @format email
   */
  email: string;
  /** Full Name */
  full_name: string;
  /** Phone */
  phone: string;
  /** Id Number */
  id_number: string;
  /**
   * Send Invitation
   * @default true
   */
  send_invitation?: boolean;
}

/** CreateAdminResponse */
export interface CreateAdminResponse {
  /** Success */
  success: boolean;
  /** Message */
  message: string;
  /** Invitation Sent */
  invitation_sent: boolean;
}

/**
 * CreateBankAccountRequest
 * Request to create a new bank account.
 */
export interface CreateBankAccountRequest {
  /** Account Name */
  account_name: string;
  /** Bank Name */
  bank_name: string;
  /** Account Number */
  account_number: string;
  /** Branch Code */
  branch_code: string;
  /** Branch Name */
  branch_name?: string | null;
  /** Swift Code */
  swift_code?: string | null;
  /**
   * Currency
   * @default "ZAR"
   */
  currency?: string;
  /**
   * Is Active
   * @default true
   */
  is_active?: boolean;
  /**
   * Is Default
   * @default false
   */
  is_default?: boolean;
  /** Description */
  description?: string | null;
}

/** CreateDocumentRequestModel */
export interface CreateDocumentRequestModel {
  /** Board Member Id */
  board_member_id: string;
  /** Document Type */
  document_type: string;
  /** Reason */
  reason?: string | null;
  /** Deadline */
  deadline?: string | null;
  /**
   * Is Urgent
   * @default false
   */
  is_urgent?: boolean;
}

/** CreateEmailTemplateModel */
export interface CreateEmailTemplateModel {
  /** Template Name */
  template_name: string;
  /** Category */
  category: string;
  /** Subject */
  subject: string;
  /** Body Html */
  body_html: string;
  /**
   * Variables
   * @default []
   */
  variables?: string[] | null;
}

/** CreateInvitationRequest */
export interface CreateInvitationRequest {
  /** Full Name */
  full_name: string;
  /**
   * Email
   * @format email
   */
  email: string;
  /** Role */
  role: string;
  /** Message */
  message?: string | null;
  /** Position */
  position?: string | null;
  /** Expires At */
  expires_at?: string | null;
}

/** CreateLeadRequest */
export interface CreateLeadRequest {
  /** Full Name */
  full_name: string;
  /**
   * Email
   * @format email
   */
  email: string;
  /** Phone */
  phone?: string | null;
  /** Company */
  company?: string | null;
  /** Country */
  country: string;
  /**
   * Lead Source
   * @default "unknown"
   */
  lead_source?: string;
  /** Investment Interest Amount */
  investment_interest_amount?: number | string | null;
  /** Preferred Share Class */
  preferred_share_class?: string | null;
  /** Notes */
  notes?: string | null;
  /** Assigned To */
  assigned_to?: string | null;
}

/** CreateMediaReleaseRequest */
export interface CreateMediaReleaseRequest {
  /** Title */
  title: string;
  /** Excerpt */
  excerpt?: string | null;
  /** Content */
  content: string;
  /** Featured Image Url */
  featured_image_url?: string | null;
  /**
   * Status
   * @default "draft"
   */
  status?: string;
  /** Published At */
  published_at?: string | null;
}

/** CreateMeetingRequest */
export interface CreateMeetingRequest {
  /**
   * Title
   * @minLength 1
   * @maxLength 255
   */
  title: string;
  /**
   * Meeting Type
   * @pattern ^(regular|special|emergency|agm|egm)$
   */
  meeting_type: string;
  /**
   * Meeting Date
   * @format date
   */
  meeting_date: string;
  /**
   * Meeting Time
   * @format time
   */
  meeting_time: string;
  /** Location */
  location?: string | null;
  /** Virtual Link */
  virtual_link?: string | null;
  /** Description */
  description?: string | null;
}

/** CreateOnBehalfRequest */
export interface CreateOnBehalfRequest {
  /** Board Member User Id */
  board_member_user_id: string;
  /** Num Shares */
  num_shares: number;
  /** Share Class */
  share_class: string;
  /** Payment Method */
  payment_method: string;
  /**
   * Payment Status
   * @default "pending"
   */
  payment_status?: string;
  /** Installment Months */
  installment_months?: number | null;
}

/**
 * CreatePositionRequest
 * Request to create a new board position
 */
export interface CreatePositionRequest {
  /**
   * Position Name
   * @minLength 2
   * @maxLength 100
   */
  position_name: string;
  /**
   * Position Level
   * Lower = higher rank
   * @min 1
   */
  position_level: number;
  /** Description */
  description?: string | null;
}

/**
 * CreateProxyRequest
 * Assign proxy voting rights
 */
export interface CreateProxyRequest {
  /** Proxy Id */
  proxy_id: string;
  scope_type: ProxyScope;
  /** Session Id */
  session_id?: number | null;
  /** Valid Until */
  valid_until?: string | null;
  /** Notes */
  notes?: string | null;
}

/**
 * CreateSessionRequest
 * Create a new governance session
 */
export interface CreateSessionRequest {
  session_type: SessionType;
  /**
   * Title
   * @minLength 3
   * @maxLength 500
   */
  title: string;
  /** Description */
  description?: string | null;
  /** Opens At */
  opens_at?: string | null;
  /** Closes At */
  closes_at?: string | null;
  /** Meeting Date */
  meeting_date?: string | null;
  /** Meeting Location */
  meeting_location?: string | null;
  /** Meeting Link */
  meeting_link?: string | null;
  /**
   * Requires Quorum
   * @default false
   */
  requires_quorum?: boolean;
  /** Quorum Percentage */
  quorum_percentage?: number | null;
  /**
   * Metadata
   * @default {}
   */
  metadata?: Record<string, any>;
}

/**
 * CreateSubscriptionRequest
 * Request model for admin creating subscription on behalf of investor.
 */
export interface CreateSubscriptionRequest {
  /** Full Name */
  full_name: string;
  /**
   * Email
   * @format email
   */
  email: string;
  /** Id Number */
  id_number: string;
  /** Phone */
  phone: string;
  /** Share Class */
  share_class: string;
  /** Num Shares */
  num_shares: number;
  /** Payment Method */
  payment_method: string;
  /** Payment Proof Filename */
  payment_proof_filename?: string | null;
  /** Admin Notes */
  admin_notes?: string | null;
}

/**
 * CreateVotingItemRequest
 * Add voting items to a session
 */
export interface CreateVotingItemRequest {
  /** Session Id */
  session_id: number;
  /**
   * Items
   * List of voting items with question, description, options
   */
  items: Record<string, any>[];
}

/**
 * CreateWalletRequest
 * Request to create or update a crypto wallet
 */
export interface CreateWalletRequest {
  /** Crypto Type */
  crypto_type: string;
  /** Wallet Address */
  wallet_address: string;
  /** Network Info */
  network_info?: string | null;
  /**
   * Is Active
   * @default true
   */
  is_active?: boolean;
}

/** CryptoWalletStats */
export interface CryptoWalletStats {
  /** Active */
  active: number;
  /** Total */
  total: number;
}

/**
 * CurrentBoardMember
 * Current board member with position
 */
export interface CurrentBoardMember {
  /** Board Member Id */
  board_member_id: number;
  /** User Id */
  user_id: string;
  /** Full Name */
  full_name: string;
  /** Email */
  email: string;
  /** Position Name */
  position_name: string;
  /** Position Level */
  position_level: number;
  /**
   * Appointed At
   * @format date-time
   */
  appointed_at: string;
}

/**
 * CurrentBoardResponse
 * Response for current board composition
 */
export interface CurrentBoardResponse {
  /** Board Members */
  board_members: CurrentBoardMember[];
  /** Total */
  total: number;
}

/**
 * CustomerData
 * Customer/Banking specific data
 */
export interface CustomerData {
  /** Accounts Count */
  accounts_count: number;
  /** Total Balance */
  total_balance: number;
  /** Savings Balance */
  savings_balance: number;
  /** Cheque Balance */
  cheque_balance: number;
  /** Recent Transactions Count */
  recent_transactions_count: number;
  /** Last Transaction Date */
  last_transaction_date?: string | null;
}

/**
 * DailyReminderResult
 * Result from daily reminder processing.
 */
export interface DailyReminderResult {
  /** Success */
  success: boolean;
  /**
   * Run Date
   * @format date
   */
  run_date: string;
  /** Total Due */
  total_due: number;
  /** Reminders Sent */
  reminders_sent: number;
  /** Reminders Failed */
  reminders_failed: number;
  /** Errors */
  errors: string[];
  /** Execution Time Seconds */
  execution_time_seconds: number;
}

/**
 * DashboardResponse
 * Dashboard overview response
 */
export interface DashboardResponse {
  /** Accounts */
  accounts: Account[];
  /** Account summary for dashboard */
  account_summary: AccountSummary;
  /** Recent Transactions */
  recent_transactions: Transaction[];
  /** Active Loans */
  active_loans: Loan[];
  /** Active Cards */
  active_cards: Card[];
  /** Pending Bills */
  pending_bills: number;
}

/** DashboardStatsResponse */
export interface DashboardStatsResponse {
  board_members: BoardMemberStats;
  invitations: InvitationStats;
  subscriptions: SubscriptionStats;
  crypto_wallets: CryptoWalletStats;
  documents: AppApisBackOfficeBoardDocumentStats;
}

/** DebitOrderListResponse */
export interface DebitOrderListResponse {
  /** Debit Orders */
  debit_orders: DebitOrderResponse[];
  /** Total Count */
  total_count: number;
}

/** DebitOrderResponse */
export interface DebitOrderResponse {
  /** Debit Order Id */
  debit_order_id: string;
  /** Subscription Id */
  subscription_id: string;
  /** Bank Name */
  bank_name: string;
  /** Account Holder */
  account_holder: string;
  /** Account Number Masked */
  account_number_masked: string;
  /** Monthly Amount */
  monthly_amount: number;
  /** Start Date */
  start_date: string;
  /** Next Debit Date */
  next_debit_date: string;
  /** End Date */
  end_date: string | null;
  /** Status */
  status: string;
  /** Mandate Signed */
  mandate_signed: boolean;
  /** Mandate Reference */
  mandate_reference: string | null;
  /** Total Debits Processed */
  total_debits_processed: number;
  /** Total Amount Collected */
  total_amount_collected: number;
  /** Last Debit Date */
  last_debit_date: string | null;
  /** Last Debit Status */
  last_debit_status: string | null;
  /** Created At */
  created_at: string;
}

/** DebitOrderSetupRequest */
export interface DebitOrderSetupRequest {
  /** Subscription Id */
  subscription_id: string;
  bank_details: BankAccountDetails;
  /** Monthly Amount */
  monthly_amount: number;
  /** Start Date */
  start_date: string;
  /** End Date */
  end_date?: string | null;
}

/** DebitOrderTransactionResponse */
export interface DebitOrderTransactionResponse {
  /** Transaction Id */
  transaction_id: string;
  /** Debit Order Id */
  debit_order_id: string;
  /** Debit Date */
  debit_date: string;
  /** Amount */
  amount: number;
  /** Status */
  status: string;
  /** Bank Reference */
  bank_reference: string | null;
  /** Failure Reason */
  failure_reason: string | null;
  /** Created At */
  created_at: string;
}

/**
 * DeliveryLog
 * Individual notification delivery log.
 */
export interface DeliveryLog {
  /** Id */
  id: number;
  /** User Identifier */
  user_identifier: string;
  /** User Id */
  user_id: string | null;
  /** Notification Type */
  notification_type: string;
  /** Subject */
  subject: string;
  /** Message Preview */
  message_preview: string;
  /** Channels Attempted */
  channels_attempted: string[];
  /** Channels Succeeded */
  channels_succeeded: string[];
  /** Channels Failed */
  channels_failed: string[];
  /** Error Details */
  error_details: Record<string, any> | null;
  /** Metadata */
  metadata: Record<string, any> | null;
  /** Created At */
  created_at: string;
}

/**
 * DeliveryLogsResponse
 * Response for delivery logs query.
 */
export interface DeliveryLogsResponse {
  /** Logs */
  logs: DeliveryLog[];
  /** Total Count */
  total_count: number;
  /** Page */
  page: number;
  /** Page Size */
  page_size: number;
}

/**
 * DeviceInfo
 * Device information
 */
export interface DeviceInfo {
  /** Id */
  id: number;
  /** User Id */
  user_id: string;
  /** Device Hwid */
  device_hwid: string;
  /** Device Type */
  device_type: string;
  /** Push Token */
  push_token: string;
  /** User Agent */
  user_agent: string | null;
  /** Browser Name */
  browser_name: string | null;
  /** Browser Version */
  browser_version: string | null;
  /** Os Name */
  os_name: string | null;
  /** Registered At */
  registered_at: string;
  /** Last Active */
  last_active: string;
  /** Is Active */
  is_active: boolean;
}

/**
 * DeviceRegistration
 * Register a device for push notifications
 */
export interface DeviceRegistration {
  /**
   * Device Hwid
   * Pushwoosh hardware ID
   */
  device_hwid: string;
  /**
   * Device Type
   * web_chrome, web_firefox, web_safari, etc.
   */
  device_type: string;
  /**
   * Push Token
   * FCM/APNS token
   */
  push_token: string;
  /** User Agent */
  user_agent?: string | null;
  /** Browser Name */
  browser_name?: string | null;
  /** Browser Version */
  browser_version?: string | null;
  /** Os Name */
  os_name?: string | null;
}

/** DismissPopupRequest */
export interface DismissPopupRequest {
  /** Snooze Hours */
  snooze_hours?: number | null;
}

/**
 * DividendMetrics
 * Dividend-related metrics.
 */
export interface DividendMetrics {
  /** Total Dividends Received */
  total_dividends_received: number;
  /** Current Year Dividends */
  current_year_dividends: number;
  /** Dividend Yield */
  dividend_yield: number;
  /** Reinvested Amount */
  reinvested_amount: number;
}

/**
 * DividendPayment
 * Individual dividend payment details.
 */
export interface DividendPayment {
  /** Dividend Id */
  dividend_id: string;
  /** Subscription Id */
  subscription_id: string;
  /** Amount */
  amount: number;
  /**
   * Payment Date
   * @format date
   */
  payment_date: string;
  /** Tax Withheld */
  tax_withheld: number;
  /** Reinvested */
  reinvested: boolean;
  /** Status */
  status: string;
  /** Payment Method */
  payment_method?: string | null;
  /** Reference Number */
  reference_number?: string | null;
  /** Notes */
  notes?: string | null;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
}

/**
 * DividendTaxReport
 * Complete tax report for dividends.
 */
export interface DividendTaxReport {
  /** User Id */
  user_id: string;
  /** Current Year Total */
  current_year_total: number;
  /** Current Year Tax */
  current_year_tax: number;
  /** Yearly Summaries */
  yearly_summaries: YearlyDividendSummary[];
  /** Total All Time */
  total_all_time: number;
  /** Total Tax All Time */
  total_tax_all_time: number;
}

/** DocumentAccessRequest */
export interface DocumentAccessRequest {
  /** Access Reason */
  access_reason: string;
}

/** DocumentAccessResponse */
export interface DocumentAccessResponse {
  /** File Url */
  file_url: string;
  /** Document Name */
  document_name: string;
  /** Access Logged */
  access_logged: boolean;
}

/**
 * DocumentCompletionSummary
 * Summary of document completion for a board member
 */
export interface DocumentCompletionSummary {
  /** Board Member Id */
  board_member_id: number;
  /** Total Required */
  total_required: number;
  /** Submitted */
  submitted: number;
  /**
   * Total Remaining
   * @default 0
   */
  total_remaining?: number;
  /** Approved */
  approved: number;
  /** Rejected */
  rejected: number;
  /** Pending Review */
  pending_review: number;
  /** Completion Percentage */
  completion_percentage: number;
  /** Missing Critical Documents */
  missing_critical_documents?: string[];
}

/**
 * DocumentCompliance
 * Document compliance status for a board member
 */
export interface DocumentCompliance {
  /** Total Required */
  total_required: number;
  /** Uploaded */
  uploaded: number;
  /** Approved */
  approved: number;
  /** Missing */
  missing: number;
  /** Pending Review */
  pending_review: number;
  /** Compliance Percentage */
  compliance_percentage: number;
}

/** DocumentInReview */
export interface DocumentInReview {
  /** Document Id */
  document_id: number;
  /** Board Member Id */
  board_member_id: number;
  /** Board Member Name */
  board_member_name: string;
  /** Board Member Email */
  board_member_email: string;
  /** Requirement Id */
  requirement_id: number;
  /** Requirement Name */
  requirement_name: string;
  /** File Name */
  file_name: string;
  /** File Url */
  file_url: string;
  /** File Size Kb */
  file_size_kb: number;
  /**
   * Submitted At
   * @format date-time
   */
  submitted_at: string;
  /** Resubmission Count */
  resubmission_count: number;
  /** Status */
  status: string;
}

/** DocumentListResponse */
export interface DocumentListResponse {
  /** Documents */
  documents: AppApisDataRoomAdminDocumentResponse[];
  /** Total */
  total: number;
}

/** DocumentRequestResponse */
export interface DocumentRequestResponse {
  /** Id */
  id: number;
  /** Request Number */
  request_number: string;
  /** Board Member Id */
  board_member_id: string;
  /** Board Member Name */
  board_member_name: string;
  /** Board Member Email */
  board_member_email: string;
  /** Document Type */
  document_type: string;
  /** Reason */
  reason: string | null;
  /** Deadline */
  deadline: string | null;
  /** Is Urgent */
  is_urgent: boolean;
  /** Status */
  status: string;
  /** Requested By */
  requested_by: string;
  /** Requested By Name */
  requested_by_name: string;
  /** Completed At */
  completed_at: string | null;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
}

/** DocumentStatsResponse */
export interface DocumentStatsResponse {
  /** Stats */
  stats: AppApisDataRoomAuditDocumentStats[];
  /** Total Documents */
  total_documents: number;
}

/**
 * DocumentStatus
 * Document submission status
 */
export enum DocumentStatus {
  NotSubmitted = "not_submitted",
  Submitted = "submitted",
  UnderReview = "under_review",
  Approved = "approved",
  Rejected = "rejected",
  ResubmissionRequired = "resubmission_required",
  Expired = "expired",
}

/**
 * DocumentStatusSummary
 * Summary of document submission status
 */
export interface DocumentStatusSummary {
  /** Total Required */
  total_required: number;
  /** Submitted */
  submitted: number;
  /** Approved */
  approved: number;
  /** Rejected */
  rejected: number;
  /** Pending Review */
  pending_review: number;
  /** Needs Action */
  needs_action: number;
  /** Completion Percentage */
  completion_percentage: number;
  /** Critical Missing */
  critical_missing: string[];
  /** Expiring Soon */
  expiring_soon: Record<string, any>[];
}

/** DocumentType */
export enum DocumentType {
  Minutes = "minutes",
  Agenda = "agenda",
  ResolutionAttachment = "resolution_attachment",
  SupportingDoc = "supporting_doc",
  Presentation = "presentation",
}

/** DocumentUpdate */
export interface DocumentUpdate {
  /** Document Name */
  document_name?: string | null;
  /** Category Id */
  category_id?: number | null;
  /** Description */
  description?: string | null;
  /** Status */
  status?: string | null;
  /** Is Required For License */
  is_required_for_license?: boolean | null;
  /** Version */
  version?: string | null;
}

/** DocumentUploadResponse */
export interface DocumentUploadResponse {
  /** Id */
  id: number;
  /** Document Name */
  document_name: string;
  /** File Url */
  file_url: string;
  /** Category Id */
  category_id: number | null;
  /** Uploaded At */
  uploaded_at: string;
}

/** EmailHistoryResponse */
export interface EmailHistoryResponse {
  /** Id */
  id: number;
  /** Email Id */
  email_id: string;
  /** Template Name */
  template_name: string;
  /** Recipient Email */
  recipient_email: string;
  /** Recipient Name */
  recipient_name: string;
  /** Subject */
  subject: string;
  /** Status */
  status: string;
  /** Sent At */
  sent_at: string | null;
  /** Sent By */
  sent_by: string;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
}

/**
 * EmailQueueListResponse
 * Response for listing queued emails
 */
export interface EmailQueueListResponse {
  /** Emails */
  emails: QueuedEmail[];
  /** Email queue statistics */
  stats: EmailQueueStats;
}

/**
 * EmailQueueStats
 * Email queue statistics
 */
export interface EmailQueueStats {
  /** Pending Count */
  pending_count: number;
  /** Sending Count */
  sending_count: number;
  /** Sent Count */
  sent_count: number;
  /** Failed Count */
  failed_count: number;
  /** Total Count */
  total_count: number;
}

/** EmailTemplateResponse */
export interface EmailTemplateResponse {
  /** Id */
  id: number;
  /** Template Name */
  template_name: string;
  /** Category */
  category: string;
  /** Subject */
  subject: string;
  /** Body Html */
  body_html: string;
  /** Variables */
  variables: string[];
  /** Status */
  status: string;
  /** Usage Count */
  usage_count: number;
  /** Created By */
  created_by: string;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /**
   * Updated At
   * @format date-time
   */
  updated_at: string;
}

/**
 * ExtractedData
 * Extracted lead data from conversation.
 */
export interface ExtractedData {
  /** Full Name */
  full_name?: string | null;
  /** Email */
  email?: string | null;
  /** Phone */
  phone?: string | null;
  /** Company */
  company?: string | null;
  /** Investment Interest */
  investment_interest?: string | null;
  /** Investment Amount */
  investment_amount?: string | null;
  /** Assignee Name */
  assignee_name?: string | null;
  /** Assignee Email */
  assignee_email?: string | null;
  /** Next Contact Date */
  next_contact_date?: string | null;
  /** Notes */
  notes?: string | null;
}

/**
 * FetchResponse
 * Response from manual fetch operation.
 */
export interface FetchResponse {
  /** Success */
  success: boolean;
  /** Message */
  message: string;
  /** Currencies Updated */
  currencies_updated: number;
  /** Source */
  source: string;
}

/**
 * FetchStatusResponse
 * Status of exchange rate fetching.
 */
export interface FetchStatusResponse {
  /** Last Fetch Date */
  last_fetch_date: string | null;
  /** Last Fetch Status */
  last_fetch_status: string | null;
  /** Currencies Count */
  currencies_count: number;
  /** Rates Age Hours */
  rates_age_hours: number | null;
  /** Is Outdated */
  is_outdated: boolean;
}

/**
 * FollowUpResponse
 * Follow-up details.
 */
export interface FollowUpResponse {
  /** Id */
  id: number;
  /** Lead Id */
  lead_id: number;
  /** Lead Name */
  lead_name: string;
  /** Lead Email */
  lead_email: string;
  /** Lead Company */
  lead_company?: string | null;
  /**
   * Next Contact Date
   * @format date-time
   */
  next_contact_date: string;
  /** Follow Up Frequency */
  follow_up_frequency: string;
  /** Notes */
  notes?: string | null;
  /** Status */
  status: string;
  /** Last Reminder Sent At */
  last_reminder_sent_at?: string | null;
  /** Days Since Creation */
  days_since_creation: number;
  /** Assignee Name */
  assignee_name?: string | null;
  /** Assignee Email */
  assignee_email?: string | null;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /**
   * Updated At
   * @format date-time
   */
  updated_at: string;
}

/**
 * GenerateBioResponse
 * Response for bio generation
 */
export interface GenerateBioResponse {
  /** Success */
  success: boolean;
  /** Bio */
  bio: string;
  /** Message */
  message: string;
}

/** GenerateCodeRequest */
export interface GenerateCodeRequest {
  /** Token */
  token: string;
  /**
   * Admin Override
   * @default false
   */
  admin_override?: boolean;
}

/** GeolocationResponse */
export interface GeolocationResponse {
  /** Ip */
  ip: string;
  /** Country Code */
  country_code: string | null;
  /** Country Name */
  country_name: string | null;
  /** Currency Code */
  currency_code: string | null;
  /** Currency Name */
  currency_name: string | null;
}

/**
 * GoogleDriveConfigResponse
 * Google Drive configuration response.
 */
export interface GoogleDriveConfigResponse {
  /** Is Connected */
  is_connected: boolean;
  /** Dump Folder Id */
  dump_folder_id: string | null;
  /** Dataroom Folder Id */
  dataroom_folder_id: string | null;
  /** Ai Model */
  ai_model: string;
  /** Confidence Threshold */
  confidence_threshold: number;
  /** Auto Process Enabled */
  auto_process_enabled: boolean;
  /** Last Processed At */
  last_processed_at: string | null;
  /** Environment */
  environment: string;
}

/**
 * GovernanceSessionEmailPreview
 * Preview of governance session notification email
 */
export interface GovernanceSessionEmailPreview {
  /** Recipient Name */
  recipient_name: string;
  /** Subject */
  subject: string;
  /** Html Body */
  html_body: string;
}

/** HTTPValidationError */
export interface HTTPValidationError {
  /** Detail */
  detail?: ValidationError[];
}

/** HealthResponse */
export interface HealthResponse {
  /** Status */
  status: string;
}

/** ImageSearchResponse */
export interface ImageSearchResponse {
  /** Total */
  total: number;
  /** Images */
  images: UnsplashImage[];
}

/** ImageUploadResponse */
export interface ImageUploadResponse {
  /** Url */
  url: string;
  /** Filename */
  filename: string;
}

/** IndividualDocumentRequest */
export interface IndividualDocumentRequest {
  /** Board Member Id */
  board_member_id: number;
  /** Requirement Ids */
  requirement_ids: number[];
  /** Message */
  message?: string | null;
  /**
   * Severity
   * @default "normal"
   */
  severity?: string;
  /** Deadline */
  deadline?: string | null;
}

/** IndividualDocumentRequestResponse */
export interface IndividualDocumentRequestResponse {
  /** Success */
  success: boolean;
  /** Board Member Name */
  board_member_name: string;
  /** Documents Requested */
  documents_requested: number;
}

/**
 * InvestmentRecommendation
 * AI-based investment recommendation.
 */
export interface InvestmentRecommendation {
  /** Recommendation Type */
  recommendation_type: string;
  /** Title */
  title: string;
  /** Description */
  description: string;
  /** Rationale */
  rationale: string;
  /** Priority */
  priority: string;
  /** Action Items */
  action_items: string[];
}

/** InvestmentRequest */
export interface InvestmentRequest {
  /** Num Shares */
  num_shares: number;
  /** Share Class */
  share_class: string;
  /** Payment Method */
  payment_method: string;
  /** Installment Months */
  installment_months?: number | null;
}

/**
 * InvestmentStatus
 * Investment status for a board member
 */
export interface InvestmentStatus {
  /** Meets Requirement */
  meets_requirement: boolean;
  /** Total Shares */
  total_shares: number;
  /** Required Shares */
  required_shares: number;
  /** Shares Needed */
  shares_needed: number;
  /** Investment Needed */
  investment_needed: number;
}

/**
 * InvestmentSummary
 * Summary of a single investment.
 */
export interface InvestmentSummary {
  /** Subscription Id */
  subscription_id: string;
  /** Share Class */
  share_class: string;
  /** Num Shares */
  num_shares: number;
  /** Price Per Share */
  price_per_share: number;
  /** Total Invested */
  total_invested: number;
  /** Current Value */
  current_value: number;
  /** Percentage Of Portfolio */
  percentage_of_portfolio: number;
  /** Status */
  status: string;
}

/**
 * InvestorData
 * Investor specific data
 */
export interface InvestorData {
  /** Total Invested Lsl */
  total_invested_lsl: number;
  /** Total Invested Zar */
  total_invested_zar: number;
  /** Active Subscriptions Count */
  active_subscriptions_count: number;
  /** Total Subscriptions Count */
  total_subscriptions_count: number;
  /** Subscriptions Paid */
  subscriptions_paid: number;
  /** Subscriptions Pending */
  subscriptions_pending: number;
  /** Total Shares */
  total_shares: number;
  /** Portfolio Value Lsl */
  portfolio_value_lsl: number;
  /** Portfolio Value Zar */
  portfolio_value_zar: number;
}

/**
 * InvitationPermission
 * Invitation permission configuration for a role.
 */
export interface InvitationPermission {
  /** Id */
  id: number;
  /** Role Name */
  role_name: string;
  /** Can Invite Roles */
  can_invite_roles: string[];
  /** Created At */
  created_at: string;
  /** Updated At */
  updated_at: string;
  /** Created By */
  created_by: string | null;
}

/**
 * InvitationPermissionResponse
 * Response for invitation permission operations.
 */
export interface InvitationPermissionResponse {
  /** Success */
  success: boolean;
  /** Message */
  message: string;
  permission?: InvitationPermission | null;
}

/** InvitationStats */
export interface InvitationStats {
  /** Pending */
  pending: number;
  /** Total */
  total: number;
}

/** InvitationValidationResponse */
export interface InvitationValidationResponse {
  /** Valid */
  valid: boolean;
  /** Email */
  email?: string | null;
  /** Role */
  role?: string | null;
  /** Position */
  position?: string | null;
  /** Invited By Name */
  invited_by_name?: string | null;
  /** Expires At */
  expires_at?: string | null;
  /** Already Accepted */
  already_accepted?: boolean | null;
  /** Message */
  message?: string | null;
}

/** InviteeMemberRequest */
export interface InviteeMemberRequest {
  /**
   * Board Member Ids
   * @minItems 1
   */
  board_member_ids: string[];
  /**
   * Send Email
   * @default true
   */
  send_email?: boolean;
}

/** InviteeResponse */
export interface InviteeResponse {
  /** Id */
  id: string;
  /** Meeting Id */
  meeting_id: string;
  /** Board Member Id */
  board_member_id: string;
  /** Email */
  email: string;
  /** Invited By */
  invited_by: string;
  /** Invitation Sent At */
  invitation_sent_at: string | null;
  /** Rsvp Status */
  rsvp_status: string;
  /** Rsvp At */
  rsvp_at: string | null;
  /** Created At */
  created_at: string;
}

/** IssueCertificateRequest */
export interface IssueCertificateRequest {
  /**
   * Subscription Id
   * Subscription ID to issue certificate for
   */
  subscription_id: string;
}

/** IssueCertificateResponse */
export interface IssueCertificateResponse {
  /** Success */
  success: boolean;
  /** Certificate Number */
  certificate_number: string;
  /** Verification Code */
  verification_code: string;
  /** Certificate Url */
  certificate_url: string;
  /** Message */
  message: string;
}

/** JurisdictionReadiness */
export interface JurisdictionReadiness {
  /** Jurisdiction */
  jurisdiction: string;
  /** Total Board Members */
  total_board_members: number;
  /** Fully Compliant Members */
  fully_compliant_members: number;
  /** Compliance Percentage */
  compliance_percentage: number;
  /** Critical Missing Documents */
  critical_missing_documents: string[];
  /** Total Documents Required */
  total_documents_required: number;
  /** Total Documents Submitted */
  total_documents_submitted: number;
  /** Total Documents Approved */
  total_documents_approved: number;
}

/** LOIAgreementRequest */
export interface LOIAgreementRequest {
  /** Agreement Version */
  agreement_version: string;
  /** Digital Signature */
  digital_signature: string;
  /** Investor Name */
  investor_name?: string | null;
  /** Entity Name */
  entity_name?: string | null;
  /** Entity Type */
  entity_type?: string | null;
  /** Registration Number */
  registration_number?: string | null;
  /** Investment Amount */
  investment_amount?: string | null;
  /** Investment Currency */
  investment_currency?: string | null;
  /** Contact Email */
  contact_email?: string | null;
  /** Contact Phone */
  contact_phone?: string | null;
  /** Investment Purpose */
  investment_purpose?: string | null;
}

/** LOIListResponse */
export interface LOIListResponse {
  /** Submissions */
  submissions: LOISubmission[];
  /** Total */
  total: number;
}

/** LOIReviewRequest */
export interface LOIReviewRequest {
  /** Status */
  status: string;
  /** Notes */
  notes?: string | null;
}

/** LOISubmission */
export interface LOISubmission {
  /** Id */
  id: number;
  /** User Id */
  user_id: string;
  /** File Url */
  file_url: string | null;
  /** Submitted At */
  submitted_at: string;
  /** Status */
  status: string;
  /** Reviewed By */
  reviewed_by: string | null;
  /** Reviewed At */
  reviewed_at: string | null;
  /** Notes */
  notes: string | null;
}

/** LeadResponse */
export interface LeadResponse {
  /** Id */
  id: number;
  /** Full Name */
  full_name: string;
  /** Email */
  email: string;
  /** Phone */
  phone: string | null;
  /** Company */
  company: string | null;
  /** Country */
  country: string;
  /** Lead Source */
  lead_source: string;
  /** Investment Interest Amount */
  investment_interest_amount: string | null;
  /** Preferred Share Class */
  preferred_share_class: string | null;
  /** Status */
  status: string;
  /** Notes */
  notes: string | null;
  /** Assigned To */
  assigned_to: string | null;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /**
   * Updated At
   * @format date-time
   */
  updated_at: string;
  /** Created By */
  created_by: string;
  /** Latest Activity */
  latest_activity?: string | null;
  /**
   * Invitation Count
   * @default 0
   */
  invitation_count?: number;
}

/**
 * LeadStoryResponse
 * Lead story with conversation context.
 */
export interface LeadStoryResponse {
  /** Story Id */
  story_id: number;
  /** Lead Id */
  lead_id: number;
  /** Full Transcript */
  full_transcript: Record<string, any>[];
  /** Ai Summary */
  ai_summary?: string | null;
  /** Key Points */
  key_points: string[];
  /** Assignee */
  assignee?: Record<string, any> | null;
  /** Follow Up */
  follow_up?: Record<string, any> | null;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /**
   * Updated At
   * @format date-time
   */
  updated_at: string;
}

/**
 * LinkDocumentRequest
 * Link/move document to a different session
 */
export interface LinkDocumentRequest {
  /** Document Id */
  document_id: number;
  /** Target Session Id */
  target_session_id: number;
}

/**
 * ListSentEmailsRequest
 * Request model for listing sent emails with filters.
 */
export interface ListSentEmailsRequest {
  /** Status */
  status?: string | null;
  /** Search */
  search?: string | null;
  /**
   * Limit
   * @default 100
   */
  limit?: number;
}

/**
 * ListSentEmailsResponse
 * Response model for listing sent emails.
 */
export interface ListSentEmailsResponse {
  /** Emails */
  emails: SentEmailItem[];
  /** Total Count */
  total_count: number;
}

/**
 * Loan
 * Loan model
 */
export interface Loan {
  /** Id */
  id: number;
  /** Loan Number */
  loan_number: string;
  /** User Id */
  user_id: string;
  /** Loan Type */
  loan_type: "personal" | "business" | "mortgage" | "vehicle" | "education";
  /** Principal Amount */
  principal_amount: string;
  /** Interest Rate */
  interest_rate: string;
  /** Term Months */
  term_months: number;
  /** Monthly Payment */
  monthly_payment: string;
  /** Balance */
  balance: string;
  /** Amount Paid */
  amount_paid: string;
  /**
   * Next Payment Date
   * @format date
   */
  next_payment_date: string;
  /** Last Payment Date */
  last_payment_date?: string | null;
  /** Status */
  status: "pending" | "active" | "paid_off" | "defaulted" | "closed";
  /** Disbursed Date */
  disbursed_date?: string | null;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /**
   * Updated At
   * @format date-time
   */
  updated_at: string;
}

/**
 * LoanCalculatorRequest
 * Loan calculator request
 */
export interface LoanCalculatorRequest {
  /** Loan Type */
  loan_type: "personal" | "business" | "mortgage" | "vehicle" | "education";
  /** Amount */
  amount: number | string;
  /** Term Months */
  term_months: number;
}

/**
 * LoanCalculatorResponse
 * Loan calculator response
 */
export interface LoanCalculatorResponse {
  /** Monthly Payment */
  monthly_payment: string;
  /** Total Payment */
  total_payment: string;
  /** Total Interest */
  total_interest: string;
  /** Interest Rate */
  interest_rate: string;
}

/** LoginHistoryItem */
export interface LoginHistoryItem {
  /** Id */
  id: number;
  /**
   * Login Timestamp
   * @format date-time
   */
  login_timestamp: string;
  /** Ip Address */
  ip_address: string | null;
  /** User Agent */
  user_agent: string | null;
  /** Location Country */
  location_country: string | null;
  /** Location City */
  location_city: string | null;
  /** Success */
  success: boolean;
  /** Failure Reason */
  failure_reason: string | null;
}

/** LoginHistoryResponse */
export interface LoginHistoryResponse {
  /** User Id */
  user_id: string;
  /** Total Logins */
  total_logins: number;
  /** Successful Logins */
  successful_logins: number;
  /** Failed Logins */
  failed_logins: number;
  /** Last Login */
  last_login: string | null;
  /** Login Events */
  login_events: LoginHistoryItem[];
}

/**
 * ManualMappingRequest
 * Request to manually map a board member to a user
 */
export interface ManualMappingRequest {
  /** Board Member Id */
  board_member_id: number;
  /** User Id */
  user_id: string;
}

/**
 * MapUserRequest
 * Request to map a registered user to a pending board member
 */
export interface MapUserRequest {
  /** Pending User Id */
  pending_user_id: string;
  /** Registered User Id */
  registered_user_id: string;
}

/**
 * MappingResult
 * Result of a mapping operation
 */
export interface MappingResult {
  /** Success */
  success: boolean;
  /** Board Member Id */
  board_member_id: number;
  /** User Id */
  user_id: string;
  /** Email */
  email: string;
  /** Message */
  message: string;
}

/** MarkReadRequest */
export interface MarkReadRequest {
  /** Notification Ids */
  notification_ids: number[];
}

/** MediaReleaseListItem */
export interface MediaReleaseListItem {
  /** Id */
  id: number;
  /** Title */
  title: string;
  /** Slug */
  slug: string;
  /** Excerpt */
  excerpt: string | null;
  /** Featured Image Url */
  featured_image_url: string | null;
  /** Status */
  status: string;
  /** Published At */
  published_at: string | null;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /** Email Sent */
  email_sent: boolean;
  /** View Count */
  view_count: number;
}

/** MediaReleaseResponse */
export interface MediaReleaseResponse {
  /** Id */
  id: number;
  /** Title */
  title: string;
  /** Slug */
  slug: string;
  /** Excerpt */
  excerpt: string | null;
  /** Content */
  content: string;
  /** Featured Image Url */
  featured_image_url: string | null;
  /** Author Id */
  author_id: string | null;
  /** Author Name */
  author_name: string | null;
  /** Status */
  status: string;
  /** Published At */
  published_at: string | null;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /**
   * Updated At
   * @format date-time
   */
  updated_at: string;
  /** Email Sent */
  email_sent: boolean;
  /** Email Sent At */
  email_sent_at: string | null;
  /** View Count */
  view_count: number;
}

/** MeetingListResponse */
export interface MeetingListResponse {
  /** Meetings */
  meetings: MeetingResponse[];
  /** Total Count */
  total_count: number;
}

/** MeetingResponse */
export interface MeetingResponse {
  /** Id */
  id: string;
  /** Title */
  title: string;
  /** Meeting Type */
  meeting_type: string;
  /** Meeting Date */
  meeting_date: string;
  /** Meeting Time */
  meeting_time: string;
  /** Location */
  location: string | null;
  /** Virtual Link */
  virtual_link: string | null;
  /** Description */
  description: string | null;
  /** Status */
  status: string;
  /** Created By */
  created_by: string;
  /** Created At */
  created_at: string;
  /** Updated At */
  updated_at: string;
  /** Agenda Count */
  agenda_count: number;
  /** Attendance Count */
  attendance_count: number;
  /** Has Minutes */
  has_minutes: boolean;
}

/** MintShortLinkRequest */
export interface MintShortLinkRequest {
  /** User Id */
  user_id: string;
  /** Purpose */
  purpose: string;
  /** Target Path */
  target_path: string;
  /**
   * Metadata
   * @default {}
   */
  metadata?: Record<string, any>;
  /**
   * Expires In Days
   * @default 7
   */
  expires_in_days?: number;
  /** Max Uses */
  max_uses?: number | null;
}

/** MintShortLinkResponse */
export interface MintShortLinkResponse {
  /** Token */
  token: string;
  /** Short Url */
  short_url: string;
  /** Expires At */
  expires_at: string;
  /** Target */
  target: string;
}

/** MinutesRequest */
export interface MinutesRequest {
  /**
   * Content
   * @minLength 1
   */
  content: string;
}

/** MinutesResponse */
export interface MinutesResponse {
  /** Id */
  id: string;
  /** Meeting Id */
  meeting_id: string;
  /** Content */
  content: string;
  /** Recorded By */
  recorded_by: string;
  /** Approved */
  approved: boolean;
  /** Approved By */
  approved_by: string | null;
  /** Approved At */
  approved_at: string | null;
  /** Version */
  version: number;
  /** Created At */
  created_at: string;
  /** Updated At */
  updated_at: string;
}

/**
 * MonitoringRunResult
 * Result from monitoring job execution.
 */
export interface MonitoringRunResult {
  /** Success */
  success: boolean;
  /**
   * Run Date
   * @format date
   */
  run_date: string;
  /** Total Leads Scanned */
  total_leads_scanned: number;
  /** At Risk Identified */
  at_risk_identified: number;
  /** Alerts Sent */
  alerts_sent: number;
  /** Alerts Failed */
  alerts_failed: number;
  /** Errors */
  errors: string[];
  /** Execution Time Seconds */
  execution_time_seconds: number;
}

/** MyAgreementsResponse */
export interface MyAgreementsResponse {
  /** Ncnda Signed */
  ncnda_signed: boolean;
  /** Ncnda Signed At */
  ncnda_signed_at: string | null;
  /** Terms Signed */
  terms_signed: boolean;
  /** Terms Signed At */
  terms_signed_at: string | null;
  /** Loi Agreed */
  loi_agreed: boolean;
  /** Loi Agreed At */
  loi_agreed_at: string | null;
  /** Loi File Url */
  loi_file_url: string | null;
  /** Loi Status */
  loi_status: string | null;
}

/** MyRequestsResponse */
export interface MyRequestsResponse {
  /** Requests */
  requests: CertificateRequest[];
  /** Total Count */
  total_count: number;
}

/** MyStatusResponse */
export interface MyStatusResponse {
  /** Summary of document completion for a board member */
  summary: DocumentCompletionSummary;
  /** Missing Requirements */
  missing_requirements?: Record<string, any>[] | null;
}

/** NCNDAResponse */
export interface NCNDAResponse {
  /** Version */
  version: string;
  /** Content */
  content: string;
  /** Effective Date */
  effective_date: string;
}

/**
 * NextMeeting
 * Details of the next scheduled meeting
 */
export interface NextMeeting {
  /** Id */
  id: string;
  /** Title */
  title: string;
  /** Meeting Type */
  meeting_type: string;
  /** Meeting Date */
  meeting_date: string;
  /** Meeting Time */
  meeting_time: string;
  /** Location */
  location: string | null;
  /** Virtual Link */
  virtual_link: string | null;
}

/** NotificationPreferences */
export interface NotificationPreferencesInput {
  /**
   * Dnd Enabled
   * @default false
   */
  dnd_enabled?: boolean;
  /**
   * Dnd Start Hour
   * @default 20
   */
  dnd_start_hour?: number;
  /**
   * Dnd End Hour
   * @default 8
   */
  dnd_end_hour?: number;
  /**
   * Max Popups Per Day
   * @default 3
   */
  max_popups_per_day?: number;
  /**
   * Max Critical Popups Per Day
   * @default 10
   */
  max_critical_popups_per_day?: number;
  /**
   * Email Enabled
   * @default true
   */
  email_enabled?: boolean;
  /**
   * Popup Enabled
   * @default true
   */
  popup_enabled?: boolean;
  /**
   * Banner Enabled
   * @default true
   */
  banner_enabled?: boolean;
  /**
   * Category Preferences
   * @default {}
   */
  category_preferences?: Record<string, any>;
}

/**
 * OnboardingEventRequest
 * Event payload for logging board onboarding interactions
 */
export interface OnboardingEventRequest {
  /** Event Name */
  event_name:
    | "modal_opened"
    | "step_viewed"
    | "step_next"
    | "step_prev"
    | "autosave_success"
    | "autosave_error"
    | "upload_success"
    | "upload_error"
    | "flow_completed";
  /**
   * Step Key
   * Which step this event relates to
   */
  step_key?: string | null;
  /**
   * Extra
   * Optional JSON metadata
   */
  extra?: Record<string, any> | null;
}

/** OnboardingEventResponse */
export interface OnboardingEventResponse {
  /** Success */
  success: boolean;
  /** Message */
  message: string;
}

/**
 * OnboardingReminderResponse
 * Response from onboarding reminder run.
 */
export interface OnboardingReminderResponse {
  /** Total Eligible */
  total_eligible: number;
  /** Reminders Sent */
  reminders_sent: number;
  /** Results By Channel */
  results_by_channel: ReminderChannelResult[];
  /** Errors */
  errors: string[];
}

/**
 * OnboardingStatusData
 * Onboarding progress information
 */
export interface OnboardingStatusData {
  /** Board Member Id */
  board_member_id: number;
  /** Overall Complete */
  overall_complete: boolean;
  /** Completion Percentage */
  completion_percentage: number;
  /** Steps */
  steps: OnboardingStepStatus[];
}

/**
 * OnboardingStepStatus
 * Status of individual onboarding step
 */
export interface OnboardingStepStatus {
  /** Step */
  step: string;
  /** Completed */
  completed: boolean;
  /** Completed At */
  completed_at: string | null;
}

/** OnboardingSummaryResponse */
export interface OnboardingSummaryResponse {
  /** Total Events */
  total_events: number;
  /** By Event */
  by_event: Record<string, number>;
  /** Last 30D */
  last_30d: Record<string, number>;
}

/**
 * OverrideDocumentRequest
 * Request to manually override document categorization.
 */
export interface OverrideDocumentRequest {
  /** Category Id */
  category_id: number;
  /** File Name */
  file_name?: string | null;
  /** Reason */
  reason?: string | null;
}

/**
 * OverviewStats
 * High-level overview statistics.
 */
export interface OverviewStats {
  /** Total Sent */
  total_sent: number;
  /** Total Delivered */
  total_delivered: number;
  /** Total Failed */
  total_failed: number;
  /** Overall Success Rate */
  overall_success_rate: number;
  /** By Channel */
  by_channel: Record<string, any>[];
  /** By Type */
  by_type: Record<string, any>[];
  /** Recent Activity */
  recent_activity: Record<string, any>[];
}

/**
 * PDFFieldMapping
 * PDF form field names
 */
export interface PDFFieldMapping {
  /** Field Names */
  field_names: string[];
}

/**
 * PaymentRecord
 * Record a payment for a subscription
 */
export interface PaymentRecord {
  /** Subscription Id */
  subscription_id: string;
  /** Amount */
  amount: number | string;
  /** Payment Reference */
  payment_reference: string;
  /** Payment Date */
  payment_date?: string | null;
}

/**
 * PaymentResponse
 * Response after recording payment
 */
export interface PaymentResponse {
  /** Subscription Id */
  subscription_id: string;
  /** Amount Paid */
  amount_paid: string;
  /** Total Paid */
  total_paid: string;
  /** Amount Remaining */
  amount_remaining: string;
  /** Status */
  status: string;
  /**
   * Updated At
   * @format date-time
   */
  updated_at: string;
  /**
   * Documents Generated
   * @default []
   */
  documents_generated?: string[];
}

/** PendingAgreementsResponse */
export interface PendingAgreementsResponse {
  /** Pending Users */
  pending_users: PendingUser[];
  /** Total */
  total: number;
}

/**
 * PendingApproval
 * Pending board member approval
 */
export interface PendingApproval {
  /** Board Member Id */
  board_member_id: number;
  /** Full Name */
  full_name: string;
  /** Position */
  position: string;
  /** Appointed Date */
  appointed_date: string;
  /** Email */
  email: string;
  /** Status */
  status: string;
}

/**
 * PendingFollowUpsResponse
 * List of pending follow-ups.
 */
export interface PendingFollowUpsResponse {
  /** Total */
  total: number;
  /** Overdue */
  overdue: number;
  /** Due Today */
  due_today: number;
  /** Upcoming */
  upcoming: number;
  /** Follow Ups */
  follow_ups: FollowUpResponse[];
}

/** PendingRequestsResponse */
export interface PendingRequestsResponse {
  /** Requests */
  requests: CertificateRequestWithDetails[];
  /** Total Count */
  total_count: number;
}

/** PendingUser */
export interface PendingUser {
  /** User Id */
  user_id: string;
  /** Missing Agreements */
  missing_agreements: string[];
  /** Has Subscriptions */
  has_subscriptions: boolean;
  /** Has Board Investments */
  has_board_investments: boolean;
}

/**
 * PipelineHealthReport
 * Overall pipeline health metrics.
 */
export interface PipelineHealthReport {
  /** Total Active Leads */
  total_active_leads: number;
  /** At Risk Count */
  at_risk_count: number;
  /** Overdue Followups */
  overdue_followups: number;
  /** Avg Days In Status */
  avg_days_in_status: number;
  /** Conversion Rate 7D */
  conversion_rate_7d: number;
  /** Leads By Status */
  leads_by_status: Record<string, number>;
  /** Recent Alerts */
  recent_alerts: number;
  /** Health Score */
  health_score: number;
}

/**
 * PortfolioDashboard
 * Complete portfolio dashboard data.
 */
export interface PortfolioDashboard {
  /** User Id */
  user_id: string;
  /** Key portfolio performance metrics. */
  metrics: PortfolioMetrics;
  /** Investments */
  investments: InvestmentSummary[];
  /** Asset Allocation */
  asset_allocation: AssetAllocation[];
  /** Dividend-related metrics. */
  dividend_metrics: DividendMetrics;
  /** Performance History */
  performance_history: PortfolioPerformance[];
  /**
   * Last Updated
   * @format date-time
   */
  last_updated: string;
}

/**
 * PortfolioMetrics
 * Key portfolio performance metrics.
 */
export interface PortfolioMetrics {
  /** Total Value */
  total_value: number;
  /** Total Invested */
  total_invested: number;
  /** Total Return */
  total_return: number;
  /** Return Percentage */
  return_percentage: number;
  /** Total Shares */
  total_shares: number;
  /** Active Investments */
  active_investments: number;
}

/**
 * PortfolioPerformance
 * Historical performance data.
 */
export interface PortfolioPerformance {
  /** Month */
  month: string;
  /** Portfolio Value */
  portfolio_value: number;
  /** Dividends Received */
  dividends_received: number;
}

/**
 * PositionHistoryEntry
 * Single position history entry
 */
export interface PositionHistoryEntry {
  /** Id */
  id: number;
  /** Board Member Id */
  board_member_id: number;
  /** Board Member Name */
  board_member_name: string;
  /** Position Name */
  position_name: string;
  /** Position Level */
  position_level: number;
  /**
   * Appointed At
   * @format date-time
   */
  appointed_at: string;
  /** Ended At */
  ended_at?: string | null;
  /** Removed At */
  removed_at?: string | null;
  /** Term End Date */
  term_end_date?: string | null;
  /** Appointed By */
  appointed_by: string;
  /** Appointed By Name */
  appointed_by_name?: string | null;
  /** Is Current */
  is_current: boolean;
  /** Notes */
  notes?: string | null;
}

/**
 * PositionHistoryResponse
 * Response for position history
 */
export interface PositionHistoryResponse {
  /** History */
  history: PositionHistoryEntry[];
  /** Total */
  total: number;
}

/** PreviewTemplateRequest */
export interface PreviewTemplateRequest {
  /** Template Id */
  template_id: number;
  /**
   * Sample Data
   * @default {}
   */
  sample_data?: Record<string, any> | null;
}

/**
 * ProcessingLog
 * Processing log model.
 */
export interface ProcessingLog {
  /** Id */
  id: number;
  /** Drive File Id */
  drive_file_id: string;
  /** Original File Name */
  original_file_name: string;
  /** Suggested File Name */
  suggested_file_name: string | null;
  /** Category Name */
  category_name: string | null;
  /** Suggested Category */
  suggested_category: string | null;
  /** Confidence Score */
  confidence_score: number | null;
  /** Document Type */
  document_type: string | null;
  /** Description */
  description: string | null;
  /** Status */
  status: string;
  /** Error Message */
  error_message: string | null;
  /** Processed By */
  processed_by: string | null;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
}

/**
 * ProcessingLogsResponse
 * Processing logs response.
 */
export interface ProcessingLogsResponse {
  /** Logs */
  logs: ProcessingLog[];
  /** Total Count */
  total_count: number;
}

/**
 * ProcessingStatsResponse
 * Processing statistics response.
 */
export interface ProcessingStatsResponse {
  /** Total Processed */
  total_processed: number;
  /** Auto Categorized */
  auto_categorized: number;
  /** Needs Review */
  needs_review: number;
  /** Failed */
  failed: number;
  /** Average Confidence */
  average_confidence: number;
  /** Documents By Category */
  documents_by_category: Record<string, any>[];
  /** Recent Activity */
  recent_activity: Record<string, any>[];
}

/**
 * ProcessingTriggerResponse
 * Processing trigger response.
 */
export interface ProcessingTriggerResponse {
  /** Success */
  success: boolean;
  /** Message */
  message: string;
  /** Scan Result */
  scan_result?: Record<string, any> | null;
  /** Process Result */
  process_result?: Record<string, any> | null;
}

/** ProxyScope */
export enum ProxyScope {
  AllVotes = "all_votes",
  SpecificSession = "specific_session",
  DateRange = "date_range",
}

/** PublishMediaReleaseResponse */
export interface PublishMediaReleaseResponse {
  /** Success */
  success: boolean;
  /** Message */
  message: string;
  /** Emails Sent */
  emails_sent: number;
  /** Notifications Created */
  notifications_created: number;
  /** Sms Sent */
  sms_sent: number;
}

/**
 * PushwooshConfig
 * Public Pushwoosh configuration for frontend SDK
 */
export interface PushwooshConfig {
  /** Application Code */
  application_code: string;
  /** Safari Website Push Id */
  safari_website_push_id?: string | null;
}

/**
 * QueueItem
 * Queue item model.
 */
export interface QueueItem {
  /** Id */
  id: number;
  /** Drive File Id */
  drive_file_id: string;
  /** File Name */
  file_name: string;
  /** File Url */
  file_url: string;
  /** File Size */
  file_size: number;
  /** File Type */
  file_type: string;
  /** Status */
  status: string;
  /** Priority */
  priority: number;
  /**
   * Added At
   * @format date-time
   */
  added_at: string;
  /** Processed At */
  processed_at: string | null;
  /** Error Message */
  error_message: string | null;
  /** Retry Count */
  retry_count: number;
}

/**
 * QueueListResponse
 * Queue list response.
 */
export interface QueueListResponse {
  /** Items */
  items: QueueItem[];
  /** Total Count */
  total_count: number;
}

/**
 * QueuedEmail
 * Queued email details
 */
export interface QueuedEmail {
  /** Id */
  id: number;
  /** Session Id */
  session_id: number;
  /** Recipient User Id */
  recipient_user_id: string;
  /** Recipient Email */
  recipient_email: string;
  /** Recipient Name */
  recipient_name: string;
  /** Subject */
  subject: string;
  /** Status */
  status: string;
  /**
   * Scheduled At
   * @format date-time
   */
  scheduled_at: string;
  /** Sent At */
  sent_at?: string | null;
  /** Error Message */
  error_message?: string | null;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
}

/** ReadinessReportResponse */
export interface ReadinessReportResponse {
  /** Jurisdictions */
  jurisdictions: JurisdictionReadiness[];
  /** Overall Compliance */
  overall_compliance: number;
}

/**
 * RecentActivitiesResponse
 * Recent activities for a user.
 */
export interface RecentActivitiesResponse {
  /** Activities */
  activities: UserActivity[];
  /** Total Count */
  total_count: number;
}

/**
 * RecommendationsResponse
 * Investment recommendations based on portfolio.
 */
export interface RecommendationsResponse {
  /** User Id */
  user_id: string;
  /** Risk Tolerance */
  risk_tolerance: string;
  /** Recommendations */
  recommendations: InvestmentRecommendation[];
  /**
   * Generated At
   * @format date-time
   */
  generated_at: string;
}

/**
 * RecordPaymentRequest
 * Request model for recording a payment.
 */
export interface RecordPaymentRequest {
  /** Amount */
  amount: number;
  /** Payment Reference */
  payment_reference?: string | null;
  /** Payment Date */
  payment_date?: string | null;
  /** Notes */
  notes?: string | null;
}

/**
 * RegisteredUser
 * Registered user in the system
 */
export interface RegisteredUser {
  /** User Id */
  user_id: string;
  /** Email */
  email: string;
  /** Full Name */
  full_name: string;
  /** Account Type */
  account_type: string;
}

/**
 * ReinvestmentSettings
 * User preferences for dividend reinvestment.
 */
export interface ReinvestmentSettings {
  /** Auto Reinvest */
  auto_reinvest: boolean;
  /**
   * Risk Tolerance
   * @pattern ^(conservative|moderate|aggressive)$
   */
  risk_tolerance: string;
  /** Investment Goals */
  investment_goals?: string | null;
  /** Notification Preferences */
  notification_preferences?: Record<string, any> | null;
}

/**
 * ReinvestmentSettingsResponse
 * Response for reinvestment settings.
 */
export interface ReinvestmentSettingsResponse {
  /** User Id */
  user_id: string;
  /** Auto Reinvest */
  auto_reinvest: boolean;
  /** Risk Tolerance */
  risk_tolerance: string;
  /** Investment Goals */
  investment_goals?: string | null;
  /** Notification Preferences */
  notification_preferences: Record<string, any>;
  /**
   * Updated At
   * @format date-time
   */
  updated_at: string;
}

/**
 * ReminderChannelResult
 * Result for a single channel delivery attempt.
 */
export interface ReminderChannelResult {
  /** Channel */
  channel: string;
  /** Success */
  success: boolean;
  /** Count */
  count: number;
  /** Error */
  error?: string | null;
}

/**
 * ReminderProcessingSummary
 * Summary of reminder processing job.
 */
export interface ReminderProcessingSummary {
  /** Periodic Reminders Sent */
  periodic_reminders_sent: number;
  /** Expiry Warnings Sent */
  expiry_warnings_sent: number;
  /** Escalations Created */
  escalations_created: number;
  /** Total Board Members Processed */
  total_board_members_processed: number;
  /** Errors */
  errors: string[];
  /** Processing Time Seconds */
  processing_time_seconds: number;
}

/**
 * ReminderStats
 * Statistics about reminders.
 */
export interface ReminderStats {
  /** Total Reminders Sent */
  total_reminders_sent: number;
  /** Reminders Sent This Week */
  reminders_sent_this_week: number;
  /** Active Escalations */
  active_escalations: number;
  /** Documents Expiring Soon */
  documents_expiring_soon: number;
}

/**
 * RemoveRoleRequest
 * Request to remove a role from a user
 */
export interface RemoveRoleRequest {
  /** User Id */
  user_id: string;
  /** Role Name */
  role_name: string;
}

/** RequestCertificateRequest */
export interface RequestCertificateRequest {
  /** Subscription Id */
  subscription_id: string;
}

/** RequirementCreate */
export interface RequirementCreate {
  /** Name */
  name: string;
  /** Description */
  description?: string | null;
  /** Jurisdictions */
  jurisdictions?: string[];
  /** File Formats Accepted */
  file_formats_accepted?: string[];
  /**
   * Max File Size Mb
   * @default 10
   */
  max_file_size_mb?: number;
  /**
   * Is Required
   * @default true
   */
  is_required?: boolean;
  /**
   * Requires Template
   * @default false
   */
  requires_template?: boolean;
  /** Validity Period Days */
  validity_period_days?: number | null;
  /**
   * Display Order
   * @default 0
   */
  display_order?: number;
}

/** RequirementSettings */
export interface RequirementSettings {
  /** Requirement Id */
  requirement_id: number;
  /** Requirement Name */
  requirement_name: string;
  /** Default Severity */
  default_severity: string;
  /** Notification Popup Behavior */
  notification_popup_behavior: string;
  /** Auto Reminder Interval Days */
  auto_reminder_interval_days: number | null;
  /** Escalation Enabled */
  escalation_enabled: boolean;
}

/** RequirementUpdate */
export interface RequirementUpdate {
  /** Name */
  name?: string | null;
  /** Description */
  description?: string | null;
  /** Jurisdictions */
  jurisdictions?: string[] | null;
  /** File Formats Accepted */
  file_formats_accepted?: string[] | null;
  /** Max File Size Mb */
  max_file_size_mb?: number | null;
  /** Is Required */
  is_required?: boolean | null;
  /** Requires Template */
  requires_template?: boolean | null;
  /** Validity Period Days */
  validity_period_days?: number | null;
  /** Display Order */
  display_order?: number | null;
  /** Is Active */
  is_active?: boolean | null;
}

/** ResendInvitationsRequest */
export interface ResendInvitationsRequest {
  /**
   * Invitee Ids
   * List of invitee IDs to resend invitations to
   * @minItems 1
   */
  invitee_ids: string[];
}

/** ResendInvitationsResponse */
export interface ResendInvitationsResponse {
  /** Success */
  success: boolean;
  /** Resent Count */
  resent_count: number;
  /** Failed Count */
  failed_count: number;
  /** Errors */
  errors?: string[];
}

/** ReviewDocumentRequest */
export interface ReviewDocumentRequest {
  /** Action */
  action: string;
  /** Rejection Reason */
  rejection_reason?: string | null;
  /** Review Notes */
  review_notes?: string | null;
}

/** ReviewDocumentResponse */
export interface ReviewDocumentResponse {
  /** Success */
  success: boolean;
  /** Tracks document submission for a board member */
  document: BoardMemberDocument;
}

/**
 * RiskAssessment
 * Portfolio risk profile analysis.
 */
export interface RiskAssessment {
  /** User Id */
  user_id: string;
  /** Risk Score */
  risk_score: number;
  /** Risk Level */
  risk_level: string;
  /** Diversification Score */
  diversification_score: number;
  /** Concentration Risk */
  concentration_risk: boolean;
  /** Factors */
  factors: Record<string, string>[];
  /** Suggestions */
  suggestions: string[];
}

/** RoleHistoryItem */
export interface RoleHistoryItem {
  /** Id */
  id: number;
  /** Role Name */
  role_name: string;
  /** Action */
  action: string;
  /** Performed By User Id */
  performed_by_user_id: string | null;
  /** Performed By Name */
  performed_by_name: string | null;
  /** Reason */
  reason: string | null;
  /**
   * Changed At
   * @format date-time
   */
  changed_at: string;
}

/** RoleHistoryResponse */
export interface RoleHistoryResponse {
  /** User Id */
  user_id: string;
  /** Total Changes */
  total_changes: number;
  /** Current Roles */
  current_roles: string[];
  /** Role Events */
  role_events: RoleHistoryItem[];
}

/**
 * RoleInfo
 * Information about a role
 */
export interface RoleInfo {
  /** Id */
  id: number;
  /** Role Name */
  role_name: string;
  /** Description */
  description: string | null;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
}

/**
 * RoleMetadata
 * Metadata about a user's role
 */
export interface RoleMetadata {
  /** Role Name */
  role_name: string;
  /** Assigned At */
  assigned_at?: string | null;
  /** Assigned By */
  assigned_by?: string | null;
  /** Assigned By Name */
  assigned_by_name?: string | null;
}

/** SchedulerResponse */
export interface SchedulerResponse {
  /** Success */
  success: boolean;
  /** Job Name */
  job_name: string;
  /** Timestamp */
  timestamp: string;
  /** Results */
  results: Record<string, any>;
  /** Message */
  message: string;
}

/**
 * SecurityInfo
 * User security and verification info
 */
export interface SecurityInfo {
  /** Email Verified */
  email_verified: boolean;
  /** Phone Verified */
  phone_verified: boolean;
  /** Is Suspended */
  is_suspended: boolean;
  /** Suspension Reason */
  suspension_reason?: string | null;
  /** Suspended At */
  suspended_at?: string | null;
  /** Suspended By */
  suspended_by?: string | null;
  /** Suspension Count */
  suspension_count: number;
}

/** SeedResponse */
export interface SeedResponse {
  /** Success */
  success: boolean;
  /** Message */
  message: string;
  /** Users Created */
  users_created: Record<string, any>[];
}

/** SendEmailModel */
export interface SendEmailModel {
  /** Template Id */
  template_id: number;
  /** Recipient Ids */
  recipient_ids: string[];
  /**
   * Custom Variables
   * @default {}
   */
  custom_variables?: Record<string, any> | null;
}

/**
 * SendGovernanceNotificationRequest
 * Request to send governance session notifications
 */
export interface SendGovernanceNotificationRequest {
  /**
   * Member Ids
   * List of board member user IDs to notify
   */
  member_ids: string[];
}

/**
 * SendGovernanceNotificationResponse
 * Response after queueing governance notifications
 */
export interface SendGovernanceNotificationResponse {
  /** Success */
  success: boolean;
  /** Queued Count */
  queued_count: number;
  /** Message */
  message: string;
  /** First Send Time */
  first_send_time?: string | null;
  /** Last Send Time */
  last_send_time?: string | null;
}

/** SendInvitationRequest */
export interface SendInvitationRequest {
  /** Lead Id */
  lead_id: number;
  /** Share Class */
  share_class: string;
  /** Minimum Investment */
  minimum_investment: number;
  /** Special Terms */
  special_terms?: string | null;
  /** Personalized Message */
  personalized_message?: string | null;
  /**
   * Contact Person
   * @default "Investor Relations Team"
   */
  contact_person?: string | null;
  /**
   * Contact Email
   * @default "invest@citizenhub.co.za"
   */
  contact_email?: string | null;
  /**
   * Contact Phone
   * @default "+266 2231 2345"
   */
  contact_phone?: string | null;
}

/**
 * SendOTPRequest
 * Request to send OTP code
 */
export interface SendOTPRequest {
  /**
   * Contact Type
   * Type: 'email' or 'mobile'
   */
  contact_type: string;
  /**
   * Contact Value
   * Email address or phone number
   */
  contact_value: string;
}

/**
 * SendOTPResponse
 * Response after sending OTP
 */
export interface SendOTPResponse {
  /** Success */
  success: boolean;
  /** Message */
  message: string;
  /**
   * Expires In Minutes
   * @default 5
   */
  expires_in_minutes?: number;
  /** Rate Limit Remaining */
  rate_limit_remaining: number;
}

/**
 * SentEmailItem
 * Individual sent email item.
 */
export interface SentEmailItem {
  /** Id */
  id: number;
  /** Email Id */
  email_id: string;
  /** Queue Id */
  queue_id: string;
  /** Recipient Email */
  recipient_email: string;
  /** Recipient Name */
  recipient_name: string;
  /** Subject */
  subject: string;
  /** Body Html */
  body_html: string;
  /** Template Name */
  template_name: string | null;
  /** Status */
  status: string;
  /** Sent At */
  sent_at: string | null;
  /** Sent By */
  sent_by: string;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /** Last Error */
  last_error: string | null;
  /** Retry Count */
  retry_count: number;
}

/** SessionStatus */
export enum SessionStatus {
  Draft = "draft",
  Active = "active",
  Closed = "closed",
  Finalized = "finalized",
  Cancelled = "cancelled",
}

/** SessionType */
export enum SessionType {
  AgmVote = "agm_vote",
  BoardResolution = "board_resolution",
  BoardMeeting = "board_meeting",
}

/** SetupAdminRequest */
export interface SetupAdminRequest {
  /**
   * Email
   * @format email
   */
  email: string;
  /** Full Name */
  full_name: string;
  /** Phone */
  phone: string;
  /** Id Number */
  id_number: string;
  /** Setup Token */
  setup_token: string;
  /** User Id */
  user_id?: string | null;
}

/** SetupAdminResponse */
export interface SetupAdminResponse {
  /** Success */
  success: boolean;
  /** Message */
  message: string;
  /** User Id */
  user_id: string;
  /** Email */
  email: string;
  /** Role */
  role: string;
}

/**
 * ShareAvailability
 * Current share availability information
 */
export interface ShareAvailability {
  /** Total Authorized */
  total_authorized: number;
  /** Total Issued */
  total_issued: number;
  /** Available For Subscription */
  available_for_subscription: number;
  /** Offered For Public */
  offered_for_public: number;
  /** Subscribed */
  subscribed: number;
  /** Remaining */
  remaining: number;
  /** Price Per Share */
  price_per_share: string;
  /** Min Subscription */
  min_subscription: number;
  /** Max Subscription */
  max_subscription: number;
  /** Fundraising Target */
  fundraising_target: string;
  /** Amount Raised */
  amount_raised: string;
  /** Subscription Percentage */
  subscription_percentage: number;
}

/**
 * ShareCertificate
 * Share certificate model
 */
export interface ShareCertificate {
  /** Id */
  id: number;
  /** Certificate Number */
  certificate_number: string;
  /** Subscription Id */
  subscription_id: number | null;
  /** User Id */
  user_id: string;
  /** Full Name */
  full_name: string;
  /** Shares Count */
  shares_count: number;
  /** Share Class */
  share_class: string;
  /**
   * Issue Date
   * @format date
   */
  issue_date: string;
  /** Certificate Url */
  certificate_url: string;
  /** Verification Code */
  verification_code: string;
  /** Issued By */
  issued_by: string;
  /** Status */
  status: string;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
}

/**
 * ShareClassDetailResponse
 * Detailed share class information for admin management.
 */
export interface ShareClassDetailResponse {
  /** Id */
  id: number;
  /** Class Name */
  class_name: string;
  /** Display Name */
  display_name: string;
  /** Description */
  description: string;
  /** Price Per Share */
  price_per_share: number;
  /** Currency */
  currency: string;
  /** Min Shares */
  min_shares: number;
  /** Max Shares */
  max_shares: number;
  /** Shares On Offer */
  shares_on_offer: number;
  /** Shares Issued */
  shares_issued: number;
  /** Available Shares */
  available_shares: number;
  /** Is Default */
  is_default: boolean;
  /** Is Active */
  is_active: boolean;
  /** Created At */
  created_at: string;
  /** Updated At */
  updated_at: string;
}

/**
 * ShareClassInfo
 * Information about a share class.
 */
export interface ShareClassInfo {
  /** Name */
  name: string;
  /** Description */
  description: string;
  /** Price Per Share */
  price_per_share: number;
  /** Min Shares */
  min_shares: number;
  /** Max Shares */
  max_shares: number;
  /** Currency */
  currency: string;
  /** Shares On Offer */
  shares_on_offer: number;
  /** Shares Issued */
  shares_issued: number;
  /** Available Shares */
  available_shares: number;
}

/**
 * ShareConfigResponse
 * Share configuration data.
 */
export interface ShareConfigResponse {
  /** Price Per Share */
  price_per_share: number;
  /** Min Subscription */
  min_subscription: number;
  /** Max Subscription */
  max_subscription: number;
  /** Total Authorized */
  total_authorized: number;
  /** Total Issued */
  total_issued: number;
  /** Offered For Public */
  offered_for_public: number;
  /** Available Shares */
  available_shares: number;
  /** Is Active */
  is_active: boolean;
}

/** SignAgreementRequest */
export interface SignAgreementRequest {
  /** Agreement Version */
  agreement_version: string;
  /** Digital Signature */
  digital_signature: string;
}

/** SignAgreementResponse */
export interface SignAgreementResponse {
  /** Success */
  success: boolean;
  /** Agreement Type */
  agreement_type: string;
  /** Signed At */
  signed_at: string;
}

/** SignCertificateRequest */
export interface SignCertificateRequest {
  /**
   * Signature Image
   * Base64 encoded signature image
   */
  signature_image: string;
  /**
   * Signer Name
   * Name of person signing
   */
  signer_name: string;
  /**
   * Signer Role
   * Role: company_secretary, chairman, director, authorized_official
   */
  signer_role: string;
}

/** SignCertificateResponse */
export interface SignCertificateResponse {
  /** Success */
  success: boolean;
  /** Certificate Number */
  certificate_number: string;
  /** Signed At */
  signed_at: string;
  /** Signer Name */
  signer_name: string;
  /** Signer Role */
  signer_role: string;
  /** Certificate Url */
  certificate_url: string;
}

/**
 * SnoozeFollowUpRequest
 * Request to snooze a follow-up.
 */
export interface SnoozeFollowUpRequest {
  /** Days */
  days: number;
  /** Reason */
  reason?: string | null;
}

/**
 * StallCriteria
 * Criteria that caused a lead to be flagged as at-risk.
 */
export interface StallCriteria {
  /**
   * Status Stagnant
   * @default false
   */
  status_stagnant?: boolean;
  /**
   * No Activity
   * @default false
   */
  no_activity?: boolean;
  /**
   * Interested No Action
   * @default false
   */
  interested_no_action?: boolean;
  /**
   * Overdue Followup
   * @default false
   */
  overdue_followup?: boolean;
  /** Days Status Unchanged */
  days_status_unchanged?: number | null;
  /** Days Since Activity */
  days_since_activity?: number | null;
  /** Days Overdue */
  days_overdue?: number | null;
}

/**
 * StartConversationResponse
 * Response when starting a conversation.
 */
export interface StartConversationResponse {
  /** Conversation Id */
  conversation_id: number;
  /** Initial Message */
  initial_message: string;
}

/**
 * SubscriptionAnalyticsResponse
 * Analytics response for subscription statistics
 */
export interface SubscriptionAnalyticsResponse {
  /** Total Subscriptions */
  total_subscriptions: number;
  /** Status Breakdown */
  status_breakdown: Record<string, number>;
  /** Total Shares Subscribed */
  total_shares_subscribed: number;
  /** Total Revenue */
  total_revenue: number;
  /** Outstanding Payments */
  outstanding_payments: number;
  /** Certificates Issued */
  certificates_issued: number;
}

/**
 * SubscriptionConfig
 * Subscription system configuration
 */
export interface SubscriptionConfig {
  /** Price Per Share */
  price_per_share: string;
  /** Min Shares */
  min_shares: number;
  /** Max Shares */
  max_shares: number;
  /** Total Shares Available */
  total_shares_available: number;
  /** Total Shares Issued */
  total_shares_issued: number;
  /** Offering Status */
  offering_status: string;
  /** Offering Start Date */
  offering_start_date: string | null;
  /** Offering End Date */
  offering_end_date: string | null;
  /** Auto Issue Certificate */
  auto_issue_certificate: boolean;
  /** Payment Methods */
  payment_methods: string[];
  /** Bank Account Details */
  bank_account_details: Record<string, any> | null;
}

/**
 * SubscriptionCreatedResponse
 * Response after successfully creating subscription.
 */
export interface SubscriptionCreatedResponse {
  /** Subscription Id */
  subscription_id: string;
  /** User Existed */
  user_existed: boolean;
  /** Invitation Created */
  invitation_created: boolean;
  /** Invitation Id */
  invitation_id?: number | null;
  /** Status */
  status: string;
  /** Message */
  message: string;
}

/**
 * SubscriptionListItem
 * Individual subscription item for list view
 */
export interface SubscriptionListItem {
  /** Subscription Id */
  subscription_id: string;
  /** Full Name */
  full_name: string;
  /** Email */
  email: string;
  /** Num Shares */
  num_shares: number;
  /** Total Amount */
  total_amount: number;
  /** Amount Paid */
  amount_paid: number;
  /** Payment Method */
  payment_method: string;
  /** Status */
  status: string;
  /** Payment Status */
  payment_status: string;
  /** Created At */
  created_at: string;
  /** Payment Proof Path */
  payment_proof_path: string | null;
  /** Payment Proof Verified */
  payment_proof_verified: boolean | null;
  /** Payment Proof Verified At */
  payment_proof_verified_at: string | null;
  /** Payment Proof Verified By */
  payment_proof_verified_by: string | null;
  /** Payment Proof Uploaded At */
  payment_proof_uploaded_at: string | null;
}

/**
 * SubscriptionListResponse
 * Response for list all subscriptions
 */
export interface SubscriptionListResponse {
  /** Total Subscriptions */
  total_subscriptions: number;
  /** Subscriptions */
  subscriptions: SubscriptionListItem[];
}

/**
 * SubscriptionRequest
 * Request to subscribe for shares
 */
export interface SubscriptionRequest {
  /** Full Name */
  full_name: string;
  /**
   * Email
   * @format email
   */
  email: string;
  /** Phone */
  phone: string;
  /** Id Number */
  id_number: string;
  /** Num Shares */
  num_shares: number;
  /** Payment Method */
  payment_method: "one-time" | "installment";
  /** Installment Plan */
  installment_plan?: "3-months" | "6-months" | "12-months" | null;
  /**
   * Purchase Currency
   * @default "LSL"
   */
  purchase_currency?: string | null;
  /** Tracking Token */
  tracking_token?: string | null;
}

/**
 * SubscriptionResponse
 * Response after subscription
 */
export interface SubscriptionResponse {
  /** Subscription Id */
  subscription_id: string;
  /** Full Name */
  full_name: string;
  /** Num Shares */
  num_shares: number;
  /** Total Amount */
  total_amount: string;
  /** Payment Method */
  payment_method: string;
  /** Installment Plan */
  installment_plan: string | null;
  /** Monthly Payment */
  monthly_payment: string | null;
  /** Status */
  status: string;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
}

/** SubscriptionStats */
export interface SubscriptionStats {
  /** Active */
  active: number;
  /** Total Invested */
  total_invested: number;
  /** Total */
  total: number;
}

/**
 * SubscriptionStatus
 * Current status of a subscription
 */
export interface SubscriptionStatus {
  /** Subscription Id */
  subscription_id: string;
  /** Full Name */
  full_name: string;
  /** Email */
  email: string;
  /** Num Shares */
  num_shares: number;
  /** Total Amount */
  total_amount: string;
  /** Amount Paid */
  amount_paid: string;
  /** Amount Remaining */
  amount_remaining: string;
  /** Payment Method */
  payment_method: string;
  /** Installment Plan */
  installment_plan: string | null;
  /** Status */
  status: string;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /**
   * Updated At
   * @format date-time
   */
  updated_at: string;
}

/**
 * SuspendUserRequest
 * Request to suspend a user
 */
export interface SuspendUserRequest {
  /** Reason */
  reason: string;
}

/** SuspensionHistoryItem */
export interface SuspensionHistoryItem {
  /** Id */
  id: number;
  /** Action */
  action: string;
  /** Reason */
  reason: string | null;
  /** Suspended By User Id */
  suspended_by_user_id: string | null;
  /** Suspended By Name */
  suspended_by_name: string | null;
  /**
   * Suspended At
   * @format date-time
   */
  suspended_at: string;
  /** Reactivated At */
  reactivated_at: string | null;
}

/** SuspensionHistoryResponse */
export interface SuspensionHistoryResponse {
  /** User Id */
  user_id: string;
  /** Total Suspensions */
  total_suspensions: number;
  /** Current Status */
  current_status: string;
  /** Suspension Events */
  suspension_events: SuspensionHistoryItem[];
}

/**
 * TemplateListItem
 * Template list item (without full HTML)
 */
export interface TemplateListItem {
  /** Id */
  id: number;
  /** Template Name */
  template_name: string;
  /** Is Active */
  is_active: boolean;
  /** Created By */
  created_by: string;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /** Version */
  version: number;
  /** Description */
  description?: string | null;
  /**
   * Template Type
   * @default "pdf"
   */
  template_type?: string;
  /** Share Class */
  share_class?: string | null;
}

/** TemplateRegistryResponse */
export interface TemplateRegistryResponse {
  /** Id */
  id: number;
  /** Template Name */
  template_name: string;
  /** Category */
  category: string;
  /** Subject */
  subject: string;
  /** Template Type */
  template_type: string;
  /** Function Name */
  function_name: string | null;
  /** Module Path */
  module_path: string | null;
  /** Trigger Points */
  trigger_points: Record<string, any>[];
  /** Process Flow */
  process_flow: string | null;
  /** Parameters */
  parameters: Record<string, any>;
  /** Can Edit */
  can_edit: boolean;
  /** Is Active */
  is_active: boolean;
  /** Usage Count */
  usage_count: number;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /**
   * Updated At
   * @format date-time
   */
  updated_at: string;
}

/** TestPaymentEmailRequest */
export interface TestPaymentEmailRequest {
  /** Recipient Email */
  recipient_email: string;
  /** Recipient Name */
  recipient_name: string;
  /** Currency */
  currency: string;
  /** Amount */
  amount: number;
  /** Num Shares */
  num_shares: number;
}

/** TestTemplateRequest */
export interface TestTemplateRequest {
  /** Template Id */
  template_id: number;
  /** Recipient Email */
  recipient_email: string;
  /**
   * Override Data
   * @default {}
   */
  override_data?: Record<string, any> | null;
}

/** TimelineCommentCreate */
export interface TimelineCommentCreate {
  /** Timeline Id */
  timeline_id: number;
  /**
   * Comment Text
   * @maxLength 128
   */
  comment_text: string;
}

/** TimelineCommentResponse */
export interface TimelineCommentResponse {
  /** Id */
  id: number;
  /** Timeline Id */
  timeline_id: number;
  /** User Id */
  user_id: string | null;
  /** User Name */
  user_name: string | null;
  /** User Email */
  user_email: string | null;
  /** Comment Text */
  comment_text: string;
  /** Created At */
  created_at: string;
  /** Is Approved */
  is_approved: boolean;
}

/** TimelineItemCreate */
export interface TimelineItemCreate {
  /**
   * Title
   * @maxLength 255
   */
  title: string;
  /** Short Story */
  short_story: string;
  /** Achievement Date */
  achievement_date: string;
  /** Image Url */
  image_url?: string | null;
  /**
   * Status
   * @default "upcoming"
   */
  status?: string;
  /**
   * Display Order
   * @default 0
   */
  display_order?: number;
  /**
   * Is Published
   * @default false
   */
  is_published?: boolean;
}

/** TimelineItemResponse */
export interface TimelineItemResponse {
  /** Id */
  id: number;
  /** Title */
  title: string;
  /** Short Story */
  short_story: string;
  /** Achievement Date */
  achievement_date: string;
  /** Image Url */
  image_url: string | null;
  /** Status */
  status: string;
  /** Display Order */
  display_order: number;
  /** Is Published */
  is_published: boolean;
  /** Created By */
  created_by: string | null;
  /** Created At */
  created_at: string;
  /** Updated At */
  updated_at: string;
  /**
   * Comment Count
   * @default 0
   */
  comment_count?: number;
}

/** TimelineItemUpdate */
export interface TimelineItemUpdate {
  /** Title */
  title?: string | null;
  /** Short Story */
  short_story?: string | null;
  /** Achievement Date */
  achievement_date?: string | null;
  /** Image Url */
  image_url?: string | null;
  /** Status */
  status?: string | null;
  /** Display Order */
  display_order?: number | null;
  /** Is Published */
  is_published?: boolean | null;
}

/**
 * TimelineResponse
 * Public timeline response
 */
export interface TimelineResponse {
  /** Achievements */
  achievements: Achievement[];
  /** Total */
  total: number;
}

/**
 * Transaction
 * Transaction model
 */
export interface Transaction {
  /** Id */
  id: number;
  /** Transaction Id */
  transaction_id: string;
  /** Account Id */
  account_id: number;
  /** Transaction Type */
  transaction_type:
    | "deposit"
    | "withdrawal"
    | "transfer_in"
    | "transfer_out"
    | "bill_payment"
    | "loan_payment"
    | "card_payment"
    | "interest"
    | "fee"
    | "reversal";
  /** Amount */
  amount: string;
  /** Balance After */
  balance_after: string;
  /** Description */
  description: string;
  /** Reference */
  reference?: string | null;
  /** Related Account */
  related_account?: string | null;
  /** Beneficiary Name */
  beneficiary_name?: string | null;
  /** Status */
  status: "pending" | "completed" | "failed" | "reversed";
  /**
   * Transaction Date
   * @format date-time
   */
  transaction_date: string;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
}

/**
 * TransactionFilters
 * Transaction filter parameters
 */
export interface TransactionFilters {
  /** Account Id */
  account_id?: number | null;
  /** Transaction Type */
  transaction_type?: string | null;
  /** Start Date */
  start_date?: string | null;
  /** End Date */
  end_date?: string | null;
  /**
   * Limit
   * @max 200
   * @default 50
   */
  limit?: number;
}

/** TransferClassRequest */
export interface TransferClassRequest {
  /** Target Share Class */
  target_share_class: string;
  /** Num Shares */
  num_shares: number;
}

/** TransferMemberRequest */
export interface TransferMemberRequest {
  /** Target User Id */
  target_user_id: string;
  /** Num Shares */
  num_shares: number;
}

/**
 * TransferRequest
 * Transfer request
 */
export interface TransferRequest {
  /** From Account Id */
  from_account_id: number;
  /** Transfer Type */
  transfer_type: "internal" | "external" | "international";
  /** To Account Number */
  to_account_number: string;
  /** Beneficiary Name */
  beneficiary_name: string;
  /** Amount */
  amount: number | string;
  /** Description */
  description: string;
  /** Reference */
  reference?: string | null;
  /**
   * Save Beneficiary
   * @default false
   */
  save_beneficiary?: boolean;
}

/** TransferSharesRequest */
export interface TransferSharesRequest {
  /**
   * From Subscription Id
   * Source subscription ID
   */
  from_subscription_id: string;
  /**
   * To User Id
   * Recipient user ID
   */
  to_user_id: string;
  /**
   * Num Shares
   * Number of shares to transfer
   * @exclusiveMin 0
   */
  num_shares: number;
  /**
   * Transfer Reason
   * Reason for transfer
   */
  transfer_reason: string;
  /**
   * Transfer Date
   * Transfer date (ISO format)
   */
  transfer_date?: string | null;
  /**
   * Notes
   * Additional notes
   */
  notes?: string | null;
}

/** TransferSharesResponse */
export interface TransferSharesResponse {
  /** Success */
  success: boolean;
  /** Transfer Id */
  transfer_id: number;
  /** From Subscription Id */
  from_subscription_id: string;
  /** To Subscription Id */
  to_subscription_id: string;
  /** Shares Transferred */
  shares_transferred: number;
  /** Message */
  message: string;
}

/**
 * UnmappedBoardMember
 * Board member without a user_id mapping
 */
export interface UnmappedBoardMember {
  /** Board Member Id */
  board_member_id: number;
  /** Email */
  email: string;
  /** Full Name */
  full_name: string;
  /** Position */
  position: string;
  /** Appointed Date */
  appointed_date: string;
  /** Status */
  status: string;
}

/**
 * UnmappedMembersResponse
 * Response with unmapped board members
 */
export interface UnmappedMembersResponse {
  /** Unmapped Members */
  unmapped_members: UnmappedBoardMember[];
  /** Total Count */
  total_count: number;
}

/** UnsplashImage */
export interface UnsplashImage {
  /** Id */
  id: string;
  /** Url */
  url: string;
  /** Thumb Url */
  thumb_url: string;
  /** Description */
  description: string | null;
  /** Photographer */
  photographer: string;
  /** Photographer Url */
  photographer_url: string;
  /** Download Location */
  download_location: string;
}

/**
 * UpdateAchievementRequest
 * Request to update an achievement
 */
export interface UpdateAchievementRequest {
  /** Title */
  title?: string | null;
  /** Description */
  description?: string | null;
  /** Achievement Date */
  achievement_date?: string | null;
  /** Category */
  category?: string | null;
  /** Image Url */
  image_url?: string | null;
  /** Display Order */
  display_order?: number | null;
  /** Is Published */
  is_published?: boolean | null;
}

/** UpdateActionItemRequest */
export interface UpdateActionItemRequest {
  /** Title */
  title?: string | null;
  /** Description */
  description?: string | null;
  /** Status */
  status?: string | null;
  /** Due Date */
  due_date?: string | null;
  /** Priority */
  priority?: string | null;
}

/**
 * UpdateBankAccountRequest
 * Request to update a bank account.
 */
export interface UpdateBankAccountRequest {
  /** Account Name */
  account_name?: string | null;
  /** Bank Name */
  bank_name?: string | null;
  /** Account Number */
  account_number?: string | null;
  /** Branch Code */
  branch_code?: string | null;
  /** Branch Name */
  branch_name?: string | null;
  /** Swift Code */
  swift_code?: string | null;
  /** Currency */
  currency?: string | null;
  /** Is Active */
  is_active?: boolean | null;
  /** Is Default */
  is_default?: boolean | null;
  /** Description */
  description?: string | null;
}

/** UpdateBoardMemberRequest */
export interface UpdateBoardMemberRequest {
  /** Position */
  position?: string | null;
  /** Term End Date */
  term_end_date?: string | null;
  /** Status */
  status?: string | null;
}

/**
 * UpdateCardLimitsRequest
 * Update card limits request
 */
export interface UpdateCardLimitsRequest {
  /** Card Id */
  card_id: number;
  /** Daily Limit */
  daily_limit?: number | string | null;
  /** Monthly Limit */
  monthly_limit?: number | string | null;
}

/**
 * UpdateCertificateStatusRequest
 * Request to update certificate status
 */
export interface UpdateCertificateStatusRequest {
  /**
   * Status
   * Certificate status: 'active', 'revoked'
   */
  status: string;
  /**
   * Reason
   * Reason for status change
   */
  reason?: string | null;
}

/**
 * UpdateConfigRequest
 * Request to update Google Drive configuration.
 */
export interface UpdateConfigRequest {
  /** Dump Folder Id */
  dump_folder_id?: string | null;
  /** Dataroom Folder Id */
  dataroom_folder_id?: string | null;
  /** Ai Model */
  ai_model?: string | null;
  /** Confidence Threshold */
  confidence_threshold?: number | null;
  /** Auto Process Enabled */
  auto_process_enabled?: boolean | null;
}

/** UpdateEmailTemplateModel */
export interface UpdateEmailTemplateModel {
  /** Template Name */
  template_name?: string | null;
  /** Category */
  category?: string | null;
  /** Subject */
  subject?: string | null;
  /** Body Html */
  body_html?: string | null;
  /** Variables */
  variables?: string[] | null;
  /** Status */
  status?: string | null;
}

/**
 * UpdateFollowUpRequest
 * Request to update follow-up details.
 */
export interface UpdateFollowUpRequest {
  /** Next Contact Date */
  next_contact_date?: string | null;
  /** Notes */
  notes?: string | null;
  /** Status */
  status?: string | null;
}

/**
 * UpdateInvitationPermissionRequest
 * Request to update invitation permissions for a role.
 */
export interface UpdateInvitationPermissionRequest {
  /** Role Name */
  role_name: string;
  /** Can Invite Roles */
  can_invite_roles: string[];
}

/** UpdateLeadRequest */
export interface UpdateLeadRequest {
  /** Full Name */
  full_name?: string | null;
  /** Email */
  email?: string | null;
  /** Phone */
  phone?: string | null;
  /** Company */
  company?: string | null;
  /** Country */
  country?: string | null;
  /** Lead Source */
  lead_source?: string | null;
  /** Investment Interest Amount */
  investment_interest_amount?: number | string | null;
  /** Preferred Share Class */
  preferred_share_class?: string | null;
  /** Status */
  status?: string | null;
  /** Notes */
  notes?: string | null;
  /** Assigned To */
  assigned_to?: string | null;
}

/** UpdateMediaReleaseRequest */
export interface UpdateMediaReleaseRequest {
  /** Title */
  title?: string | null;
  /** Excerpt */
  excerpt?: string | null;
  /** Content */
  content?: string | null;
  /** Featured Image Url */
  featured_image_url?: string | null;
  /** Status */
  status?: string | null;
  /** Published At */
  published_at?: string | null;
}

/** UpdateMeetingRequest */
export interface UpdateMeetingRequest {
  /** Title */
  title?: string | null;
  /** Meeting Type */
  meeting_type?: string | null;
  /** Meeting Date */
  meeting_date?: string | null;
  /** Meeting Time */
  meeting_time?: string | null;
  /** Location */
  location?: string | null;
  /** Virtual Link */
  virtual_link?: string | null;
  /** Description */
  description?: string | null;
  /** Status */
  status?: string | null;
}

/**
 * UpdatePaymentStatusRequest
 * Request model for updating payment status.
 */
export interface UpdatePaymentStatusRequest {
  /** Payment Status */
  payment_status: string;
  /** Notes */
  notes?: string | null;
}

/**
 * UpdatePositionRequest
 * Request to update a board position
 */
export interface UpdatePositionRequest {
  /** Position Name */
  position_name?: string | null;
  /** Position Level */
  position_level?: number | null;
  /** Description */
  description?: string | null;
}

/**
 * UpdatePreferencesRequest
 * Update notification preferences
 */
export interface UpdatePreferencesRequest {
  /** Channel Sms */
  channel_sms?: boolean | null;
  /** Channel Email */
  channel_email?: boolean | null;
  /** Channel Push */
  channel_push?: boolean | null;
  /** Channel Whatsapp */
  channel_whatsapp?: boolean | null;
  /** Phone Number */
  phone_number?: string | null;
  /** Whatsapp Number */
  whatsapp_number?: string | null;
  /** Quiet Hours Start */
  quiet_hours_start?: string | null;
  /** Quiet Hours End */
  quiet_hours_end?: string | null;
  /** Timezone */
  timezone?: string | null;
}

/** UpdateRSVPRequest */
export interface UpdateRSVPRequest {
  /**
   * Rsvp Status
   * @pattern ^(accepted|declined|tentative)$
   */
  rsvp_status: string;
}

/** UpdateRequirementSettingsBody */
export interface UpdateRequirementSettingsBody {
  /** Default Severity */
  default_severity?: string | null;
  /** Notification Popup Behavior */
  notification_popup_behavior?: string | null;
  /** Auto Reminder Interval Days */
  auto_reminder_interval_days?: number | null;
  /** Escalation Enabled */
  escalation_enabled?: boolean | null;
}

/**
 * UpdateSessionRequest
 * Update session details (only allowed in draft status)
 */
export interface UpdateSessionRequest {
  /** Title */
  title?: string | null;
  /** Description */
  description?: string | null;
  /** Opens At */
  opens_at?: string | null;
  /** Closes At */
  closes_at?: string | null;
  /** Meeting Date */
  meeting_date?: string | null;
  /** Meeting Location */
  meeting_location?: string | null;
  /** Meeting Link */
  meeting_link?: string | null;
  /** Requires Quorum */
  requires_quorum?: boolean | null;
  /** Quorum Percentage */
  quorum_percentage?: number | null;
}

/**
 * UpdateSessionStatusRequest
 * Update session status
 */
export interface UpdateSessionStatusRequest {
  status: SessionStatus;
}

/**
 * UpdateShareClassRequest
 * Request to update a share class configuration.
 */
export interface UpdateShareClassRequest {
  /** Price Per Share */
  price_per_share?: number | null;
  /** Min Shares */
  min_shares?: number | null;
  /** Max Shares */
  max_shares?: number | null;
  /** Shares On Offer */
  shares_on_offer?: number | null;
  /** Description */
  description?: string | null;
}

/**
 * UpdateSharePriceRequest
 * Request to update share price.
 */
export interface UpdateSharePriceRequest {
  /** Price Per Share */
  price_per_share: number;
  /** Min Subscription */
  min_subscription?: number | null;
  /** Max Subscription */
  max_subscription?: number | null;
}

/** UpdateSharesRequest */
export interface UpdateSharesRequest {
  /** Num Shares */
  num_shares?: number | null;
  /** Payment Status */
  payment_status?: string | null;
  /** Payment Method */
  payment_method?: string | null;
}

/**
 * UpdateVotingItemsRequest
 * Update voting items for a session (only allowed in draft status)
 */
export interface UpdateVotingItemsRequest {
  /**
   * Items
   * List of voting items with id (if updating), question, description, options
   */
  items: Record<string, any>[];
}

/**
 * UploadDocumentRequest
 * Upload a governance document
 */
export interface UploadDocumentRequest {
  /** Session Id */
  session_id: number;
  document_type: DocumentType;
  /** File Url */
  file_url: string;
  /** File Name */
  file_name: string;
  /** File Size */
  file_size?: number | null;
  /** File Type */
  file_type?: string | null;
  /** Description */
  description?: string | null;
}

/** UploadResponse */
export interface UploadResponse {
  /** Success */
  success: boolean;
  document?: BoardMemberDocument | null;
}

/**
 * UserActionResponse
 * Response for user action
 */
export interface UserActionResponse {
  /** Success */
  success: boolean;
  /** Message */
  message: string;
}

/**
 * UserActivity
 * User activity with timestamp.
 */
export interface UserActivity {
  /** Id */
  id: number;
  /** Activity Type */
  activity_type: string;
  /** Page Path */
  page_path: string | null;
  /** Element Name */
  element_name: string | null;
  /** Element Type */
  element_type: string | null;
  /** Metadata */
  metadata: Record<string, any>;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
}

/**
 * UserDetailsResponse
 * Comprehensive user details
 */
export interface UserDetailsResponse {
  /** User Id */
  user_id: string;
  /** Email */
  email: string;
  /** Full Name */
  full_name?: string | null;
  /** Phone */
  phone?: string | null;
  /** Id Number */
  id_number?: string | null;
  /** Status */
  status: string;
  /** Profile Completion Percentage */
  profile_completion_percentage: number;
  /** Roles */
  roles: RoleMetadata[];
  board_member_data?: BoardMemberData | null;
  investor_data?: InvestorData | null;
  customer_data?: CustomerData | null;
  /** User activity summary */
  activity: ActivitySummary;
  /** User security and verification info */
  security: SecurityInfo;
}

/**
 * UserListItem
 * User item for list view
 */
export interface UserListItem {
  /** User Id */
  user_id: string;
  /** Email */
  email: string;
  /** Full Name */
  full_name: string | null;
  /** Phone */
  phone: string | null;
  /** Status */
  status: string;
  /** Account Type */
  account_type: string;
  /** Created At */
  created_at: string;
  /** Profile Completion Percentage */
  profile_completion_percentage: number;
  /** Last Login */
  last_login?: string | null;
  /**
   * Roles
   * @default []
   */
  roles?: string[];
}

/**
 * UserListResponse
 * Paginated user list response
 */
export interface UserListResponse {
  /** Users */
  users: UserListItem[];
  /** Total */
  total: number;
  /** Page */
  page: number;
  /** Page Size */
  page_size: number;
  /** Total Pages */
  total_pages: number;
}

/**
 * UserProfileResponse
 * User profile data
 */
export interface UserProfileResponse {
  /** User Id */
  user_id: string;
  /** Email */
  email: string;
  /** Full Name */
  full_name: string;
  /** Phone */
  phone: string;
  /** Id Number */
  id_number: string;
  /** Account Type */
  account_type: string;
  /** Status */
  status: string;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /**
   * Version
   * @default 1
   */
  version?: number;
  /** Street Address */
  street_address?: string | null;
  /** City */
  city?: string | null;
  /** State Province */
  state_province?: string | null;
  /** Postal Code */
  postal_code?: string | null;
  /** Country */
  country?: string | null;
  /** Date Of Birth */
  date_of_birth?: string | null;
  /** Gender */
  gender?: string | null;
  /** Nationality */
  nationality?: string | null;
  /** Citizenship Status */
  citizenship_status?: string | null;
  /** Occupation */
  occupation?: string | null;
  /** Employer */
  employer?: string | null;
  /** Linkedin Profile */
  linkedin_profile?: string | null;
  /** Tax Id */
  tax_id?: string | null;
  /** Business Name */
  business_name?: string | null;
  /** Company Registration Number */
  company_registration_number?: string | null;
  /** Email Verified */
  email_verified?: boolean | null;
  /** Mobile Verified */
  mobile_verified?: boolean | null;
  /** Profile Completion Percentage */
  profile_completion_percentage?: number | null;
  /** Source Of Funds */
  source_of_funds?: string | null;
  /** Investor Type */
  investor_type?: string | null;
  /** Investment Purpose */
  investment_purpose?: string | null;
  /** Profile Picture Selfie Url */
  profile_picture_selfie_url?: string | null;
  /** Profile Picture Half Body Url */
  profile_picture_half_body_url?: string | null;
  /** Cv Filename */
  cv_filename?: string | null;
  /** Cv Uploaded At */
  cv_uploaded_at?: string | null;
  /** Cv Share Link */
  cv_share_link?: string | null;
  /** Bio */
  bio?: string | null;
}

/**
 * UserProfileUpdate
 * Update user profile
 */
export interface UserProfileUpdate {
  /** Version */
  version?: number | null;
  /** Full Name */
  full_name?: string | null;
  /** Phone */
  phone?: string | null;
  /** Account Type */
  account_type?: "personal" | "business" | null;
  /** Identity Type */
  identity_type?: string | null;
  /** Id Country Of Issue */
  id_country_of_issue?: string | null;
  /** Id Number */
  id_number?: string | null;
  /** Street Address */
  street_address?: string | null;
  /** City */
  city?: string | null;
  /** State Province */
  state_province?: string | null;
  /** Postal Code */
  postal_code?: string | null;
  /** Country */
  country?: string | null;
  /** Date Of Birth */
  date_of_birth?: string | null;
  /** Nationality */
  nationality?: string | null;
  /** Gender */
  gender?: string | null;
  /** Occupation */
  occupation?: string | null;
  /** Employer */
  employer?: string | null;
  /** Source Of Funds */
  source_of_funds?: string | null;
  /** Investor Type */
  investor_type?: string | null;
  /** Investment Purpose */
  investment_purpose?: string | null;
  /** Linkedin Profile */
  linkedin_profile?: string | null;
  /** Profile Picture Selfie Url */
  profile_picture_selfie_url?: string | null;
  /** Profile Picture Half Body Url */
  profile_picture_half_body_url?: string | null;
  /** Cv Document Url */
  cv_document_url?: string | null;
  /** Cv Uploaded At */
  cv_uploaded_at?: string | null;
  /** Business Name */
  business_name?: string | null;
  /** Company Registration Number */
  company_registration_number?: string | null;
  /** Tax Id */
  tax_id?: string | null;
  /** Citizenship Status */
  citizenship_status?: string | null;
  /** Bio */
  bio?: string | null;
}

/**
 * UserRegistrationRequest
 * Request to register a new user
 */
export interface UserRegistrationRequest {
  /**
   * Email
   * @format email
   */
  email: string;
  /** Password */
  password?: string | null;
  /** Full Name */
  full_name: string;
  /** Phone */
  phone: string;
  /** Id Number */
  id_number: string;
  /** Account Type */
  account_type: "personal" | "business";
  /** Street Address */
  street_address?: string | null;
  /** City */
  city?: string | null;
  /** State Province */
  state_province?: string | null;
  /** Postal Code */
  postal_code?: string | null;
  /**
   * Country
   * @default "Lesotho"
   */
  country?: string;
  /** Date Of Birth */
  date_of_birth?: string | null;
  /**
   * Nationality
   * @default "Lesotho"
   */
  nationality?: string;
  /** Occupation */
  occupation?: string | null;
  /** Employer */
  employer?: string | null;
  /** Linkedin Profile */
  linkedin_profile?: string | null;
  /** Business Name */
  business_name?: string | null;
  /** Company Registration Number */
  company_registration_number?: string | null;
  /** Tax Id */
  tax_id?: string | null;
}

/**
 * UserRolesResponse
 * User's current roles
 */
export interface UserRolesResponse {
  /** User Id */
  user_id: string;
  /** Roles */
  roles: string[];
}

/**
 * UserSearchResponse
 * User search response
 */
export interface UserSearchResponse {
  /** Users */
  users: UserListItem[];
  /** Total */
  total: number;
}

/** ValidationError */
export interface ValidationError {
  /** Location */
  loc: (string | number)[];
  /** Message */
  msg: string;
  /** Error Type */
  type: string;
}

/** VerifyCodeRequest */
export interface VerifyCodeRequest {
  /** Token */
  token: string;
  /** Code */
  code: string;
}

/**
 * VerifyOTPRequest
 * Request to verify OTP code
 */
export interface VerifyOTPRequest {
  /**
   * Contact Type
   * Type: 'email' or 'mobile'
   */
  contact_type: string;
  /**
   * Contact Value
   * Email address or phone number
   */
  contact_value: string;
  /**
   * Otp Code
   * 6-digit OTP code
   * @minLength 6
   * @maxLength 6
   */
  otp_code: string;
}

/**
 * VerifyOTPResponse
 * Response after verifying OTP
 */
export interface VerifyOTPResponse {
  /** Success */
  success: boolean;
  /** Message */
  message: string;
  /** Verified */
  verified: boolean;
}

/**
 * YearlyDividendSummary
 * Yearly breakdown of dividend payments.
 */
export interface YearlyDividendSummary {
  /** Year */
  year: number;
  /** Total Amount */
  total_amount: number;
  /** Tax Withheld */
  tax_withheld: number;
  /** Payment Count */
  payment_count: number;
}

/** DocumentStats */
export interface AppApisBackOfficeBoardDocumentStats {
  /** Pending */
  pending: number;
  /** Total */
  total: number;
}

/**
 * PopupNotification
 * Popup notification
 */
export interface AppApisBoardDashboardPopupNotification {
  /** Id */
  id: number;
  /** Title */
  title: string;
  /** Message */
  message: string;
  /** Severity Level */
  severity_level: string;
  /** Created At */
  created_at: string;
  /** Expires At */
  expires_at: string | null;
}

/** ExchangeRatesResponse */
export interface AppApisCurrencyExchangeExchangeRatesResponse {
  /** Base Code */
  base_code: string;
  /** Rates */
  rates: Record<string, number>;
  /** Time Last Update Utc */
  time_last_update_utc: string;
  /** Time Next Update Utc */
  time_next_update_utc: string;
}

/** DocumentResponse */
export interface AppApisDataRoomAdminDocumentResponse {
  /** Id */
  id: number;
  /** Category Id */
  category_id: number | null;
  /** Category Name */
  category_name: string | null;
  /** Document Name */
  document_name: string;
  /** File Url */
  file_url: string;
  /** File Size */
  file_size: number | null;
  /** Uploaded By */
  uploaded_by: string;
  /** Uploaded At */
  uploaded_at: string;
  /** Version */
  version: string;
  /** Status */
  status: string;
  /** Description */
  description: string | null;
  /** Is Required For License */
  is_required_for_license: boolean;
}

/** DocumentStats */
export interface AppApisDataRoomAuditDocumentStats {
  /** Document Id */
  document_id: number;
  /** Document Name */
  document_name: string;
  /** Category Name */
  category_name: string | null;
  /** Total Accesses */
  total_accesses: number;
  /** Unique Users */
  unique_users: number;
  /** Last Accessed */
  last_accessed: string | null;
}

/** DocumentResponse */
export interface AppApisDataRoomInvestorDocumentResponse {
  /** Id */
  id: number;
  /** Category Id */
  category_id: number | null;
  /** Category Name */
  category_name: string | null;
  /** Document Name */
  document_name: string;
  /** File Size */
  file_size: number | null;
  /** Version */
  version: string;
  /** Description */
  description: string | null;
  /** Is Required For License */
  is_required_for_license: boolean;
}

/**
 * ExchangeRatesResponse
 * Current exchange rates for all tracked currencies.
 */
export interface AppApisExchangeRatesExchangeRatesResponse {
  /** Base Currency */
  base_currency: string;
  /** Rates */
  rates: Record<string, number>;
  /** Date */
  date: string;
  /** Last Updated */
  last_updated: string;
  /** Source */
  source: string;
  /** Age Days */
  age_days: number;
}

/**
 * SendMessageRequest
 * Request to send a message.
 */
export interface AppApisInvestorChatSendMessageRequest {
  /**
   * Conversation Id
   * Existing conversation ID (null to start new)
   */
  conversation_id?: number | null;
  /**
   * Message
   * User's message
   */
  message: string;
}

/**
 * SendMessageResponse
 * Response after sending a message.
 */
export interface AppApisInvestorChatSendMessageResponse {
  /** Conversation Id */
  conversation_id: number;
  /** Chat message. */
  user_message: ChatMessage;
  /** Chat message. */
  ai_response: ChatMessage;
  /**
   * Escalated
   * @default false
   */
  escalated?: boolean;
}

/** InvitationResponse */
export interface AppApisInvestorInvitationsInvitationResponse {
  /** Id */
  id: number;
  /** Lead Id */
  lead_id: number;
  /** Share Class */
  share_class: string;
  /** Minimum Investment */
  minimum_investment: number;
  /** Tracking Token */
  tracking_token: string;
  /**
   * Sent At
   * @format date-time
   */
  sent_at: string;
  /** Opened At */
  opened_at: string | null;
  /** Clicked At */
  clicked_at: string | null;
  /** Responded At */
  responded_at: string | null;
  /** Email Status */
  email_status: string;
}

/**
 * SendMessageRequest
 * Request to send a message.
 */
export interface AppApisLeadChatSendMessageRequest {
  /** Conversation Id */
  conversation_id: number;
  /**
   * Message
   * @minLength 1
   * @maxLength 2000
   */
  message: string;
}

/**
 * SendMessageResponse
 * Response after sending a message.
 */
export interface AppApisLeadChatSendMessageResponse {
  /** Ai Response */
  ai_response: string;
  /** Extracted lead data from conversation. */
  extracted_data: ExtractedData;
  /** Missing Required Fields */
  missing_required_fields: string[];
  /** Ready To Create */
  ready_to_create: boolean;
  /** Confidence */
  confidence: number;
  /** Current Stage */
  current_stage?: string | null;
  /** Completion Percentage */
  completion_percentage?: number | null;
  /** Next Question Hint */
  next_question_hint?: string | null;
}

/**
 * NotificationPreferences
 * User notification preferences
 */
export interface AppApisNotificationPreferencesNotificationPreferences {
  /** User Id */
  user_id: string;
  /**
   * Channel Sms
   * @default true
   */
  channel_sms?: boolean;
  /**
   * Channel Email
   * @default true
   */
  channel_email?: boolean;
  /**
   * Channel Push
   * @default true
   */
  channel_push?: boolean;
  /**
   * Channel Whatsapp
   * @default false
   */
  channel_whatsapp?: boolean;
  /** Phone Number */
  phone_number?: string | null;
  /** Whatsapp Number */
  whatsapp_number?: string | null;
  /** Quiet Hours Start */
  quiet_hours_start?: string | null;
  /** Quiet Hours End */
  quiet_hours_end?: string | null;
  /**
   * Timezone
   * @default "Africa/Johannesburg"
   */
  timezone?: string;
  /** Created At */
  created_at: string;
  /** Updated At */
  updated_at: string;
}

/** NotificationPreferences */
export interface AppApisPopupsNotificationPreferences {
  /**
   * Dnd Enabled
   * @default false
   */
  dnd_enabled?: boolean;
  /**
   * Dnd Start Hour
   * @default 20
   */
  dnd_start_hour?: number;
  /**
   * Dnd End Hour
   * @default 8
   */
  dnd_end_hour?: number;
  /**
   * Max Popups Per Day
   * @default 3
   */
  max_popups_per_day?: number;
  /**
   * Max Critical Popups Per Day
   * @default 10
   */
  max_critical_popups_per_day?: number;
  /**
   * Email Enabled
   * @default true
   */
  email_enabled?: boolean;
  /**
   * Popup Enabled
   * @default true
   */
  popup_enabled?: boolean;
  /**
   * Banner Enabled
   * @default true
   */
  banner_enabled?: boolean;
  /**
   * Category Preferences
   * @default {}
   */
  category_preferences?: Record<string, any>;
}

/** PopupNotification */
export interface AppApisPopupsPopupNotification {
  /** Id */
  id: number;
  /** Email Subject */
  email_subject: string;
  /** Email Content */
  email_content: string;
  /** Email Type */
  email_type: string;
  /** Severity Level */
  severity_level: string;
  /** Popup Is Blocking */
  popup_is_blocking: boolean;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /** Metadata */
  metadata?: Record<string, any> | null;
  /** Related Document Request Id */
  related_document_request_id?: number | null;
}

/** InvitationResponse */
export interface AppApisUserInvitationsInvitationResponse {
  /** Token */
  token: string;
  /** Role */
  role: string;
  /** Invited By Name */
  invited_by_name: string;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /**
   * Expires At
   * @format date-time
   */
  expires_at: string;
  /** Position */
  position?: string | null;
  /** Message */
  message?: string | null;
}

export type CheckHealthData = HealthResponse;

export type AutoEscalateNotificationsData = any;

export type ResetDailyPopupCountersData = any;

export type GetEscalationStatsData = any;

export type GetCurrentRatesData = AppApisExchangeRatesExchangeRatesResponse;

export type GetFetchStatusData = FetchStatusResponse;

export type FetchExchangeRatesData = FetchResponse;

export type RefreshExchangeRatesData = FetchResponse;

export type ConvertCurrencyData = ConversionResponse;

export type ConvertCurrencyError = HTTPValidationError;

export interface GetRateHistoryParams {
  /**
   * From Currency
   * @default "LSL"
   */
  from_currency?: string;
  /**
   * To Currency
   * @default "USD"
   */
  to_currency?: string;
  /** Start Date */
  start_date?: string | null;
  /** End Date */
  end_date?: string | null;
  /**
   * Limit
   * @default 30
   */
  limit?: number;
}

export type GetRateHistoryData = any;

export type GetRateHistoryError = HTTPValidationError;

export interface GetAtRiskLeadsParams {
  /**
   * Include Ai Analysis
   * @default false
   */
  include_ai_analysis?: boolean;
}

/** Response Get At Risk Leads */
export type GetAtRiskLeadsData = AtRiskLead[];

export type GetAtRiskLeadsError = HTTPValidationError;

export type GetPipelineHealthReportData = PipelineHealthReport;

export interface AcknowledgeAlertParams {
  /** Lead Id */
  leadId: number;
}

/** Response Acknowledge Alert */
export type AcknowledgeAlertData = Record<string, any>;

export type AcknowledgeAlertError = HTTPValidationError;

export type ProcessDailyLeadMonitoringData = MonitoringRunResult;

export type ProcessDailyLeadMonitoringError = HTTPValidationError;

export type LeadMonitoringHealthData = any;

export type GetDashboardStatsData = DashboardStatsResponse;

export type CreateInvitationEndpointData = any;

export type CreateInvitationEndpointError = HTTPValidationError;

export interface ListInvitationsParams {
  /**
   * Status
   * Filter by status: pending, accepted, expired
   */
  status?: string | null;
}

export type ListInvitationsData = any;

export type ListInvitationsError = HTTPValidationError;

export interface CancelInvitationParams {
  /** Invitation Id */
  invitationId: number;
}

export type CancelInvitationData = any;

export type CancelInvitationError = HTTPValidationError;

export interface ResendInvitationEmailParams {
  /** Invitation Id */
  invitationId: number;
}

export type ResendInvitationEmailData = any;

export type ResendInvitationEmailError = HTTPValidationError;

export interface ManualResendInvitationParams {
  /** Invitation Id */
  invitationId: number;
}

export type ManualResendInvitationData = any;

export type ManualResendInvitationError = HTTPValidationError;

export type SyncInvitationsWithBoardMembersData = any;

export type AppointBoardMemberEndpointData = any;

export type AppointBoardMemberEndpointError = HTTPValidationError;

export interface ListBoardMembersParams {
  /** Status */
  status?: string | null;
}

export type ListBoardMembersData = any;

export type ListBoardMembersError = HTTPValidationError;

export interface UpdateBoardMemberEndpointParams {
  /** Member User Id */
  memberUserId: string;
}

export type UpdateBoardMemberEndpointData = any;

export type UpdateBoardMemberEndpointError = HTTPValidationError;

export interface RemoveBoardMemberEndpointParams {
  /** Member User Id */
  memberUserId: string;
}

export type RemoveBoardMemberEndpointData = any;

export type RemoveBoardMemberEndpointError = HTTPValidationError;

export type MapRegisteredUserToBoardMemberData = any;

export type MapRegisteredUserToBoardMemberError = HTTPValidationError;

export type ProcessInvitationRemindersData = any;

export type GetAuthUrlData = AuthUrlResponse;

export interface GoogleDriveCallbackParams {
  /** Code */
  code: string;
  /** State */
  state: string;
}

export type GoogleDriveCallbackData = any;

export type GoogleDriveCallbackError = HTTPValidationError;

export type GetConfigData = GoogleDriveConfigResponse;

export type UpdateConfigData = GoogleDriveConfigResponse;

export type UpdateConfigError = HTTPValidationError;

export type DisconnectData = ConnectionStatusResponse;

export type MintShortLinkData = MintShortLinkResponse;

export type MintShortLinkError = HTTPValidationError;

export interface RedirectShortLinkParams {
  /** Token */
  token: string;
}

export type RedirectShortLinkData = any;

export type RedirectShortLinkError = HTTPValidationError;

export interface GetUnmappedBoardMembersParams {
  /**
   * Env
   * @default "dev"
   */
  env?: string;
}

export type GetUnmappedBoardMembersData = UnmappedMembersResponse;

export type GetUnmappedBoardMembersError = HTTPValidationError;

export interface GetAvailableUsersParams {
  /**
   * Env
   * @default "dev"
   */
  env?: string;
}

export type GetAvailableUsersData = AvailableUsersResponse;

export type GetAvailableUsersError = HTTPValidationError;

export interface MapBoardMemberManuallyParams {
  /**
   * Env
   * @default "dev"
   */
  env?: string;
}

export type MapBoardMemberManuallyData = MappingResult;

export type MapBoardMemberManuallyError = HTTPValidationError;

export interface AutoSyncBoardMembersParams {
  /**
   * Env
   * @default "dev"
   */
  env?: string;
}

export type AutoSyncBoardMembersData = AutoSyncResult;

export type AutoSyncBoardMembersError = HTTPValidationError;

export interface MapBoardMemberOnLoginParams {
  /**
   * Env
   * @default "dev"
   */
  env?: string;
}

export type MapBoardMemberOnLoginData = any;

export type MapBoardMemberOnLoginError = HTTPValidationError;

export interface GetMyDividendsParams {
  /** Status */
  status?: string | null;
  /** Year */
  year?: number | null;
}

/** Response Get My Dividends */
export type GetMyDividendsData = DividendPayment[];

export type GetMyDividendsError = HTTPValidationError;

export type GetDividendSummaryData = DividendTaxReport;

export type GetReinvestSettingsData = ReinvestmentSettingsResponse;

export type UpdateReinvestSettingsData = ReinvestmentSettingsResponse;

export type UpdateReinvestSettingsError = HTTPValidationError;

export type GetInvestmentOptionsData = any;

export type CreateBoardInvestmentData = any;

export type CreateBoardInvestmentError = HTTPValidationError;

export type GetMyInvestmentData = any;

export type GetAllBoardInvestmentsData = any;

export type CreateInvestmentOnBehalfData = any;

export type CreateInvestmentOnBehalfError = HTTPValidationError;

export interface UpdateBoardInvestmentParams {
  /** Subscription Id */
  subscriptionId: number;
}

export type UpdateBoardInvestmentData = any;

export type UpdateBoardInvestmentError = HTTPValidationError;

export interface TransferSharesBetweenClassesParams {
  /** Subscription Id */
  subscriptionId: number;
}

export type TransferSharesBetweenClassesData = any;

export type TransferSharesBetweenClassesError = HTTPValidationError;

export interface TransferSharesBetweenMembersParams {
  /** Subscription Id */
  subscriptionId: number;
}

export type TransferSharesBetweenMembersData = any;

export type TransferSharesBetweenMembersError = HTTPValidationError;

export interface CancelBoardInvestmentParams {
  /** Subscription Id */
  subscriptionId: number;
}

export type CancelBoardInvestmentData = any;

export type CancelBoardInvestmentError = HTTPValidationError;

export interface RecordBoardMemberPaymentParams {
  /** Subscription Id */
  subscriptionId: number;
}

export type RecordBoardMemberPaymentData = any;

export type RecordBoardMemberPaymentError = HTTPValidationError;

export interface DownloadReceiptParams {
  /** Subscription Id */
  subscriptionId: number;
}

export type DownloadReceiptData = any;

export type DownloadReceiptError = HTTPValidationError;

export interface ListMessagesParams {
  /**
   * Limit
   * @max 100
   * @default 50
   */
  limit?: number;
  /**
   * Offset
   * @min 0
   * @default 0
   */
  offset?: number;
  /** Status */
  status?: string | null;
}

export type ListMessagesData = any;

export type ListMessagesError = HTTPValidationError;

export type GetPendingCountData = any;

export interface ExecuteMessageCtaParams {
  /** Message Id */
  messageId: number;
}

export type ExecuteMessageCtaData = any;

export type ExecuteMessageCtaError = HTTPValidationError;

export interface DismissMessageParams {
  /** Message Id */
  messageId: number;
}

export type DismissMessageData = any;

export type DismissMessageError = HTTPValidationError;

export type CreateWelcomeMessageData = any;

export type CreateProfileCompletionReminderData = any;

export type CreateBoardWelcomeMessageData = any;

export type GetAllRatesData = AppApisCurrencyExchangeExchangeRatesResponse;

export interface ListCertificatesParams {
  /**
   * Status
   * Filter by status: active, revoked
   */
  status?: string | null;
  /**
   * Share Class
   * Filter by share class
   */
  share_class?: string | null;
  /**
   * Shareholder Name
   * Search by shareholder name
   */
  shareholder_name?: string | null;
  /**
   * Certificate Number
   * Search by certificate number
   */
  certificate_number?: string | null;
  /**
   * Limit
   * Maximum results to return
   * @default 100
   */
  limit?: number;
  /**
   * Offset
   * Offset for pagination
   * @default 0
   */
  offset?: number;
}

export type ListCertificatesData = CertificateListResponse;

export type ListCertificatesError = HTTPValidationError;

export interface GetCertificateParams {
  /** Certificate Id */
  certificateId: number;
}

export type GetCertificateData = ShareCertificate;

export type GetCertificateError = HTTPValidationError;

export interface GetShareholderCertificatesParams {
  /** Shareholder Id */
  shareholderId: string;
}

/** Response Get Shareholder Certificates */
export type GetShareholderCertificatesData = ShareCertificate[];

export type GetShareholderCertificatesError = HTTPValidationError;

export interface UpdateCertificateStatusParams {
  /** Certificate Id */
  certificateId: number;
}

export type UpdateCertificateStatusData = ShareCertificate;

export type UpdateCertificateStatusError = HTTPValidationError;

export interface VerifyCertificateByTokenParams {
  /** Verification Token */
  verificationToken: string;
}

export type VerifyCertificateByTokenData = CertificateVerificationResponse;

export type VerifyCertificateByTokenError = HTTPValidationError;

/** Response Get Certificate Statistics */
export type GetCertificateStatisticsData = Record<string, any>;

export type RequestCertificateData = CertificateRequest;

export type RequestCertificateError = HTTPValidationError;

export type GetMyRequestsData = MyRequestsResponse;

export interface CancelRequestParams {
  /** Request Id */
  requestId: number;
}

export type CancelRequestData = any;

export type CancelRequestError = HTTPValidationError;

export type GetPendingQueueData = PendingRequestsResponse;

export interface GetAccessLogsParams {
  /** User Id */
  user_id?: string | null;
  /** Document Id */
  document_id?: number | null;
  /** Start Date */
  start_date?: string | null;
  /** End Date */
  end_date?: string | null;
  /**
   * Limit
   * @default 100
   */
  limit?: number;
}

export type GetAccessLogsData = AccessLogsListResponse;

export type GetAccessLogsError = HTTPValidationError;

export interface GetAllAgreementsParams {
  /** Agreement Type */
  agreement_type?: string | null;
  /**
   * Limit
   * @default 100
   */
  limit?: number;
}

export type GetAllAgreementsData = AgreementsListResponse;

export type GetAllAgreementsError = HTTPValidationError;

export type GetPendingAgreementsData = PendingAgreementsResponse;

export type GetDocumentStatsData = DocumentStatsResponse;

export interface GetLoiSubmissionsParams {
  /** Status */
  status?: string | null;
}

export type GetLoiSubmissionsData = LOIListResponse;

export type GetLoiSubmissionsError = HTTPValidationError;

export interface ReviewLoiSubmissionParams {
  /** Submission Id */
  submissionId: number;
}

export type ReviewLoiSubmissionData = any;

export type ReviewLoiSubmissionError = HTTPValidationError;

export type AnalyticsGetSubscriptionAnalyticsData = SubscriptionAnalyticsResponse;

export type GetPublicConfigData = AppConfig;

export type PaymentsRecordPaymentData = PaymentResponse;

export type PaymentsRecordPaymentError = HTTPValidationError;

export interface PaymentsUploadPaymentProofParams {
  /** Subscription Id */
  subscription_id: string;
}

export type PaymentsUploadPaymentProofData = any;

export type PaymentsUploadPaymentProofError = HTTPValidationError;

export interface PaymentsVerifyPaymentParams {
  /** Subscription Id */
  subscription_id: string;
  /** Approved */
  approved: boolean;
  /** Notes */
  notes?: string;
}

export type PaymentsVerifyPaymentData = any;

export type PaymentsVerifyPaymentError = HTTPValidationError;

export interface PaymentsGetPaymentHistoryParams {
  /** Subscription Id */
  subscriptionId: string;
}

export type PaymentsGetPaymentHistoryData = any;

export type PaymentsGetPaymentHistoryError = HTTPValidationError;

export type PaymentsProcessPaymentRemindersData = any;

export type SeedTestUsersData = SeedResponse;

/** Response Get Test User Info */
export type GetTestUserInfoData = Record<string, any>;

/** Response Create Profile For Test User */
export type CreateProfileForTestUserData = Record<string, any>;

export interface GetTimelineParams {
  /** Category */
  category?: string | null;
  /**
   * Limit
   * @default 100
   */
  limit?: number;
}

export type GetTimelineData = TimelineResponse;

export type GetTimelineError = HTTPValidationError;

export interface ListAllAchievementsParams {
  /** Category */
  category?: string | null;
  /** Published */
  published?: boolean | null;
}

export type ListAllAchievementsData = AdminListResponse;

export type ListAllAchievementsError = HTTPValidationError;

export type CreateAchievementData = Achievement;

export type CreateAchievementError = HTTPValidationError;

export interface UpdateAchievementParams {
  /** Achievement Id */
  achievementId: number;
}

export type UpdateAchievementData = Achievement;

export type UpdateAchievementError = HTTPValidationError;

export interface DeleteAchievementParams {
  /** Achievement Id */
  achievementId: number;
}

/** Response Delete Achievement */
export type DeleteAchievementData = Record<string, any>;

export type DeleteAchievementError = HTTPValidationError;

export interface UploadAchievementImageParams {
  /** Achievement Id */
  achievementId: number;
}

/** Response Upload Achievement Image */
export type UploadAchievementImageData = Record<string, any>;

export type UploadAchievementImageError = HTTPValidationError;

export interface ApproveDocumentParams {
  /** Log Id */
  logId: number;
}

export type ApproveDocumentData = ConnectionStatusResponse;

export type ApproveDocumentError = HTTPValidationError;

export interface OverrideDocumentParams {
  /** Log Id */
  logId: number;
}

export type OverrideDocumentData = ConnectionStatusResponse;

export type OverrideDocumentError = HTTPValidationError;

export type GetProcessingStatsData = ProcessingStatsResponse;

export type SendInvitationData = AppApisInvestorInvitationsInvitationResponse;

export type SendInvitationError = HTTPValidationError;

export type BulkSendInvitationsData = BulkInvitationResponse;

export type BulkSendInvitationsError = HTTPValidationError;

export interface ListInvestorInvitationsParams {
  /** Lead Id */
  lead_id?: number | null;
  /**
   * Limit
   * @default 100
   */
  limit?: number;
  /**
   * Offset
   * @default 0
   */
  offset?: number;
}

/** Response List Investor Invitations */
export type ListInvestorInvitationsData = AppApisInvestorInvitationsInvitationResponse[];

export type ListInvestorInvitationsError = HTTPValidationError;

export interface TrackInvestorInvitationOpenParams {
  /** Tracking Token */
  trackingToken: string;
}

/** Response Track Investor Invitation Open */
export type TrackInvestorInvitationOpenData = Record<string, any>;

export type TrackInvestorInvitationOpenError = HTTPValidationError;

export interface TrackLinkClickParams {
  /** Tracking Token */
  trackingToken: string;
}

/** Response Track Link Click */
export type TrackLinkClickData = Record<string, any>;

export type TrackLinkClickError = HTTPValidationError;

/** Response Get Invitation Stats */
export type GetInvitationStatsData = Record<string, any>;

export type TriggerProcessingData = ProcessingTriggerResponse;

export interface GetQueueParams {
  /**
   * Status
   * Filter by status
   */
  status?: string | null;
  /**
   * Limit
   * Max items to return
   * @default 50
   */
  limit?: number;
}

export type GetQueueData = QueueListResponse;

export type GetQueueError = HTTPValidationError;

export interface GetProcessingLogsParams {
  /**
   * Status
   * Filter by status
   */
  status?: string | null;
  /**
   * Limit
   * Max logs to return
   * @default 50
   */
  limit?: number;
}

export type GetProcessingLogsData = ProcessingLogsResponse;

export type GetProcessingLogsError = HTTPValidationError;

export type GetDashboardData = DashboardResponse;

/** Response List Accounts */
export type ListAccountsData = Account[];

export interface GetAccountParams {
  /** Account Id */
  accountId: number;
}

export type GetAccountData = Account;

export type GetAccountError = HTTPValidationError;

/** Response Search Transactions */
export type SearchTransactionsData = Transaction[];

export type SearchTransactionsError = HTTPValidationError;

export type CreateTransferData = Transaction;

export type CreateTransferError = HTTPValidationError;

/** Response List Beneficiaries */
export type ListBeneficiariesData = Beneficiary[];

export type AddBeneficiaryData = Beneficiary;

export type AddBeneficiaryError = HTTPValidationError;

export interface DeleteBeneficiaryParams {
  /** Beneficiary Id */
  beneficiaryId: number;
}

export type DeleteBeneficiaryData = any;

export type DeleteBeneficiaryError = HTTPValidationError;

export type CreateBillPaymentData = BillPayment;

export type CreateBillPaymentError = HTTPValidationError;

export interface ListBillPaymentsParams {
  /**
   * Limit
   * @default 50
   */
  limit?: number;
}

/** Response List Bill Payments */
export type ListBillPaymentsData = BillPayment[];

export type ListBillPaymentsError = HTTPValidationError;

/** Response List Loans */
export type ListLoansData = Loan[];

export interface GetLoanParams {
  /** Loan Id */
  loanId: number;
}

export type GetLoanData = Loan;

export type GetLoanError = HTTPValidationError;

export type CalculateLoanData = LoanCalculatorResponse;

export type CalculateLoanError = HTTPValidationError;

/** Response List Cards */
export type ListCardsData = Card[];

export type CardActionData = Card;

export type CardActionError = HTTPValidationError;

export type UpdateCardLimitsData = Card;

export type UpdateCardLimitsError = HTTPValidationError;

export type RunOnboardingRemindersData = OnboardingReminderResponse;

export type RegisterUserData = UserProfileResponse;

export type RegisterUserError = HTTPValidationError;

export type GetUserProfileData = UserProfileResponse;

export type UpdateUserProfileData = UserProfileResponse;

export type UpdateUserProfileError = HTTPValidationError;

export interface GetUserProfileByIdParams {
  /** User Id */
  userId: string;
}

export type GetUserProfileByIdData = UserDetailsResponse;

export type GetUserProfileByIdError = HTTPValidationError;

export type DismissProfileCompletionData = any;

/** Body */
export type CheckProfileCompletenessPayload = Record<string, any>;

export type CheckProfileCompletenessData = any;

export type CheckProfileCompletenessError = HTTPValidationError;

export type UploadCvData = any;

export type UploadCvError = HTTPValidationError;

export type UploadProfilePictureData = any;

export type UploadProfilePictureError = HTTPValidationError;

/** Body */
export type ValidateIdentityPayload = Record<string, any>;

export type ValidateIdentityData = any;

export type ValidateIdentityError = HTTPValidationError;

export interface ListAllUsersParams {
  /**
   * Page
   * Page number (1-indexed)
   * @min 1
   * @default 1
   */
  page?: number;
  /**
   * Page Size
   * Items per page
   * @min 1
   * @max 100
   * @default 50
   */
  page_size?: number;
  /**
   * Status
   * Filter by status (active, suspended, etc.)
   */
  status?: string | null;
}

export type ListAllUsersData = UserListResponse;

export type ListAllUsersError = HTTPValidationError;

export interface SearchUsersParams {
  /**
   * Query
   * @minLength 1
   */
  query: string;
}

export type SearchUsersData = UserSearchResponse;

export type SearchUsersError = HTTPValidationError;

export interface SuspendUserParams {
  /** User Id */
  userId: string;
}

export type SuspendUserData = UserActionResponse;

export type SuspendUserError = HTTPValidationError;

export interface ReactivateUserParams {
  /** User Id */
  userId: string;
}

export type ReactivateUserData = UserActionResponse;

export type ReactivateUserError = HTTPValidationError;

export interface SendProfileCompletionReminderParams {
  /** User Id */
  userId: string;
}

export type SendProfileCompletionReminderData = UserActionResponse;

export type SendProfileCompletionReminderError = HTTPValidationError;

export type GetPortfolioDashboardData = PortfolioDashboard;

export type GetInvestmentRecommendationsData = RecommendationsResponse;

export type GetRiskAssessmentData = RiskAssessment;

export type GetMyRolesData = UserRolesResponse;

/** Response List All Roles */
export type ListAllRolesData = RoleInfo[];

export type AssignRoleData = UserRolesResponse;

export type AssignRoleError = HTTPValidationError;

export type RemoveRoleData = UserRolesResponse;

export type RemoveRoleError = HTTPValidationError;

export interface GetUserRolesByIdParams {
  /** User Id */
  userId: string;
}

export type GetUserRolesByIdData = UserRolesResponse;

export type GetUserRolesByIdError = HTTPValidationError;

/** Response Check And Accept Pending Invitations */
export type CheckAndAcceptPendingInvitationsData = Record<string, any>;

export type LogOnboardingEventData = OnboardingEventResponse;

export type LogOnboardingEventError = HTTPValidationError;

export type GetOnboardingSummaryData = OnboardingSummaryResponse;

export type DailyPaymentRemindersData = SchedulerResponse;

export type DailyPaymentRemindersError = HTTPValidationError;

export type MonthlyDebitOrdersData = SchedulerResponse;

export type MonthlyDebitOrdersError = HTTPValidationError;

export type SchedulerHealthData = any;

export type GenerateBioForUserData = GenerateBioResponse;

export type StartConversationData = StartConversationResponse;

export type SendMessageData = AppApisLeadChatSendMessageResponse;

export type SendMessageError = HTTPValidationError;

export type CompleteConversationAndCreateLeadData = CompleteConversationResponse;

export type CompleteConversationAndCreateLeadError = HTTPValidationError;

export interface GetConversationParams {
  /** Conversation Id */
  conversationId: number;
}

export type GetConversationData = ConversationHistoryResponse;

export type GetConversationError = HTTPValidationError;

export interface GetLeadStoryEndpointParams {
  /** Lead Id */
  leadId: number;
}

export type GetLeadStoryEndpointData = LeadStoryResponse;

export type GetLeadStoryEndpointError = HTTPValidationError;

/** Response List Email Templates */
export type ListEmailTemplatesData = EmailTemplateResponse[];

export type CreateEmailTemplateData = EmailTemplateResponse;

export type CreateEmailTemplateError = HTTPValidationError;

export interface UpdateEmailTemplateParams {
  /** Template Id */
  templateId: number;
}

export type UpdateEmailTemplateData = EmailTemplateResponse;

export type UpdateEmailTemplateError = HTTPValidationError;

export type SendEmailFromTemplateData = any;

export type SendEmailFromTemplateError = HTTPValidationError;

/** Response Get Email History */
export type GetEmailHistoryData = EmailHistoryResponse[];

export type GetEmailQueueStatusData = any;

export type ProcessEmailQueueEndpointData = any;

export interface RetryFailedEmailEndpointParams {
  /** Queue Id */
  queueId: string;
}

export type RetryFailedEmailEndpointData = any;

export type RetryFailedEmailEndpointError = HTTPValidationError;

export type SendTestPaymentEmailData = any;

export type SendTestPaymentEmailError = HTTPValidationError;

/** Response List Template Registry */
export type ListTemplateRegistryData = TemplateRegistryResponse[];

export type TestTemplateFromRegistryData = any;

export type TestTemplateFromRegistryError = HTTPValidationError;

export type PreviewTemplateFromRegistryData = any;

export type PreviewTemplateFromRegistryError = HTTPValidationError;

export interface ToggleTemplateActiveStatusParams {
  /** Template Id */
  templateId: number;
}

export type ToggleTemplateActiveStatusData = any;

export type ToggleTemplateActiveStatusError = HTTPValidationError;

export interface GetTemplateUsageStatsParams {
  /** Template Id */
  templateId: number;
}

export type GetTemplateUsageStatsData = any;

export type GetTemplateUsageStatsError = HTTPValidationError;

export type ListSentEmailsData = ListSentEmailsResponse;

export type ListSentEmailsError = HTTPValidationError;

export type GenerateVerificationCodeData = any;

export type GenerateVerificationCodeError = HTTPValidationError;

export type VerifyCodeAndAcceptData = any;

export type VerifyCodeAndAcceptError = HTTPValidationError;

export type CheckAccessData = AccessStatusResponse;

/** Response List Investor Documents */
export type ListInvestorDocumentsData = AppApisDataRoomInvestorDocumentResponse[];

export interface AccessDocumentParams {
  /** Document Id */
  documentId: number;
}

export type AccessDocumentData = DocumentAccessResponse;

export type AccessDocumentError = HTTPValidationError;

export type GetCurrentNcndaData = NCNDAResponse;

export type SignNcndaData = SignAgreementResponse;

export type SignNcndaError = HTTPValidationError;

export type SignTermsData = SignAgreementResponse;

export type SignTermsError = HTTPValidationError;

export type AgreeToLoiData = SignAgreementResponse;

export type AgreeToLoiError = HTTPValidationError;

export type GetMyAgreementStatusData = MyAgreementsResponse;

export type SendOtpData = SendOTPResponse;

export type SendOtpError = HTTPValidationError;

export type VerifyOtpData = VerifyOTPResponse;

export type VerifyOtpError = HTTPValidationError;

export type SetupDebitOrderData = DebitOrderResponse;

export type SetupDebitOrderError = HTTPValidationError;

export type GetMyDebitOrdersData = DebitOrderListResponse;

export interface PauseDebitOrderParams {
  /** Debit Order Id */
  debitOrderId: string;
}

export type PauseDebitOrderData = any;

export type PauseDebitOrderError = HTTPValidationError;

export interface ResumeDebitOrderParams {
  /** Debit Order Id */
  debitOrderId: string;
}

export type ResumeDebitOrderData = any;

export type ResumeDebitOrderError = HTTPValidationError;

export interface CancelDebitOrderParams {
  /** Reason */
  reason?: string | null;
  /** Debit Order Id */
  debitOrderId: string;
}

export type CancelDebitOrderData = any;

export type CancelDebitOrderError = HTTPValidationError;

export interface GetDebitOrderTransactionsParams {
  /** Debit Order Id */
  debitOrderId: string;
}

/** Response Get Debit Order Transactions */
export type GetDebitOrderTransactionsData = DebitOrderTransactionResponse[];

export type GetDebitOrderTransactionsError = HTTPValidationError;

export type GetMyPreferencesData = AppApisNotificationPreferencesNotificationPreferences;

export type UpdateMyPreferencesData = AppApisNotificationPreferencesNotificationPreferences;

export type UpdateMyPreferencesError = HTTPValidationError;

export type RegisterDeviceData = DeviceInfo;

export type RegisterDeviceError = HTTPValidationError;

/** Response Get My Devices */
export type GetMyDevicesData = DeviceInfo[];

export interface RemoveDeviceParams {
  /** Device Id */
  deviceId: number;
}

/** Response Remove Device */
export type RemoveDeviceData = Record<string, any>;

export type RemoveDeviceError = HTTPValidationError;

/** User Ids */
export type GetBatchPreferencesPayload = string[];

/** Response Get Batch Preferences */
export type GetBatchPreferencesData = Record<string, AppApisNotificationPreferencesNotificationPreferences>;

export type GetBatchPreferencesError = HTTPValidationError;

export interface GetAnalyticsOverviewParams {
  /**
   * Days
   * @default 7
   */
  days?: number;
}

export type GetAnalyticsOverviewData = OverviewStats;

export type GetAnalyticsOverviewError = HTTPValidationError;

export interface GetDeliveryLogsParams {
  /**
   * Page
   * @default 1
   */
  page?: number;
  /**
   * Page Size
   * @default 50
   */
  page_size?: number;
  /** Notification Type */
  notification_type?: string | null;
  /** User Identifier */
  user_identifier?: string | null;
  /** Status */
  status?: string | null;
  /**
   * Days
   * @default 30
   */
  days?: number;
}

export type GetDeliveryLogsData = DeliveryLogsResponse;

export type GetDeliveryLogsError = HTTPValidationError;

export interface GetChannelStatsParams {
  /**
   * Days
   * @default 30
   */
  days?: number;
  /** Channel */
  channel?: string | null;
  /** Notification Type */
  notification_type?: string | null;
}

export type GetChannelStatsData = ChannelStatsResponse;

export type GetChannelStatsError = HTTPValidationError;

/** Response Get Notification Types */
export type GetNotificationTypesData = string[];

/** Response List Invitation Permissions */
export type ListInvitationPermissionsData = InvitationPermission[];

export type UpdateInvitationPermissionData = InvitationPermissionResponse;

export type UpdateInvitationPermissionError = HTTPValidationError;

export interface GetInvitationPermissionParams {
  /** Role Name */
  roleName: string;
}

export type GetInvitationPermissionData = InvitationPermission;

export type GetInvitationPermissionError = HTTPValidationError;

export interface CheckCanInviteRoleParams {
  /** Target Role */
  targetRole: string;
}

/** Response Check Can Invite Role */
export type CheckCanInviteRoleData = Record<string, any>;

export type CheckCanInviteRoleError = HTTPValidationError;

export type GetAutomationRulesData = any;

export interface UpdateAutomationRuleParams {
  /** Rule Id */
  ruleId: number;
}

export type UpdateAutomationRuleData = any;

export type UpdateAutomationRuleError = HTTPValidationError;

export type ExecuteAutomationActionData = any;

export type ExecuteAutomationActionError = HTTPValidationError;

export type GetAutomationStatsData = any;

export interface GetUserLoginHistoryParams {
  /** User Id */
  userId: string;
}

export type GetUserLoginHistoryData = LoginHistoryResponse;

export type GetUserLoginHistoryError = HTTPValidationError;

export interface GetUserSuspensionHistoryParams {
  /** User Id */
  userId: string;
}

export type GetUserSuspensionHistoryData = SuspensionHistoryResponse;

export type GetUserSuspensionHistoryError = HTTPValidationError;

export interface GetUserRoleHistoryParams {
  /** User Id */
  userId: string;
}

export type GetUserRoleHistoryData = RoleHistoryResponse;

export type GetUserRoleHistoryError = HTTPValidationError;

export type CreateMeetingData = MeetingResponse;

export type CreateMeetingError = HTTPValidationError;

export interface ListMeetingsParams {
  /** Status */
  status?: string | null;
  /**
   * Limit
   * @default 50
   */
  limit?: number;
}

export type ListMeetingsData = MeetingListResponse;

export type ListMeetingsError = HTTPValidationError;

export interface GetMeetingParams {
  /** Meeting Id */
  meetingId: string;
}

export type GetMeetingData = MeetingResponse;

export type GetMeetingError = HTTPValidationError;

export interface UpdateMeetingParams {
  /** Meeting Id */
  meetingId: string;
}

export type UpdateMeetingData = MeetingResponse;

export type UpdateMeetingError = HTTPValidationError;

export interface DeleteMeetingParams {
  /** Meeting Id */
  meetingId: string;
}

/** Response Delete Meeting */
export type DeleteMeetingData = Record<string, any>;

export type DeleteMeetingError = HTTPValidationError;

export interface AddAgendaItemParams {
  /** Meeting Id */
  meetingId: string;
}

export type AddAgendaItemData = AgendaItemResponse;

export type AddAgendaItemError = HTTPValidationError;

export interface GetAgendaParams {
  /** Meeting Id */
  meetingId: string;
}

/** Response Get Agenda */
export type GetAgendaData = AgendaItemResponse[];

export type GetAgendaError = HTTPValidationError;

export interface RecordMinutesParams {
  /** Meeting Id */
  meetingId: string;
}

export type RecordMinutesData = MinutesResponse;

export type RecordMinutesError = HTTPValidationError;

export interface GetMinutesParams {
  /** Meeting Id */
  meetingId: string;
}

export type GetMinutesData = MinutesResponse;

export type GetMinutesError = HTTPValidationError;

export interface ApproveMinutesParams {
  /** Meeting Id */
  meetingId: string;
}

export type ApproveMinutesData = MinutesResponse;

export type ApproveMinutesError = HTTPValidationError;

export interface MarkAttendanceParams {
  /** Meeting Id */
  meetingId: string;
}

export type MarkAttendanceData = AttendanceResponse;

export type MarkAttendanceError = HTTPValidationError;

export interface GetAttendanceParams {
  /** Meeting Id */
  meetingId: string;
}

/** Response Get Attendance */
export type GetAttendanceData = AttendanceResponse[];

export type GetAttendanceError = HTTPValidationError;

export interface CreateActionItemParams {
  /** Meeting Id */
  meetingId: string;
}

export type CreateActionItemData = ActionItemResponse;

export type CreateActionItemError = HTTPValidationError;

export interface ListMeetingActionItemsParams {
  /** Meeting Id */
  meetingId: string;
}

/** Response List Meeting Action Items */
export type ListMeetingActionItemsData = ActionItemResponse[];

export type ListMeetingActionItemsError = HTTPValidationError;

export interface ListAllActionItemsParams {
  /** Status */
  status?: string | null;
}

/** Response List All Action Items */
export type ListAllActionItemsData = ActionItemResponse[];

export type ListAllActionItemsError = HTTPValidationError;

export interface UpdateActionItemParams {
  /** Action Item Id */
  actionItemId: string;
}

export type UpdateActionItemData = ActionItemResponse;

export type UpdateActionItemError = HTTPValidationError;

export interface InviteMembersParams {
  /** Meeting Id */
  meetingId: string;
}

/** Response Invite Members */
export type InviteMembersData = Record<string, any>;

export type InviteMembersError = HTTPValidationError;

export interface GetMeetingInviteesParams {
  /** Meeting Id */
  meetingId: string;
}

/** Response Get Meeting Invitees */
export type GetMeetingInviteesData = InviteeResponse[];

export type GetMeetingInviteesError = HTTPValidationError;

export interface UpdateRsvpParams {
  /** Meeting Id */
  meetingId: string;
}

export type UpdateRsvpData = InviteeResponse;

export type UpdateRsvpError = HTTPValidationError;

/** Response Send Meeting Reminders */
export type SendMeetingRemindersData = Record<string, any>;

export interface ResendMeetingInvitationsParams {
  /** Meeting Id */
  meetingId: string;
}

export type ResendMeetingInvitationsData = ResendInvitationsResponse;

export type ResendMeetingInvitationsError = HTTPValidationError;

/** Response Get Board Members For Invitation */
export type GetBoardMembersForInvitationData = BoardMemberOption[];

export type UploadImageData = ImageUploadResponse;

export type UploadImageError = HTTPValidationError;

export interface ServeImageParams {
  /** File Path */
  filePath: string;
}

export type ServeImageData = any;

export type ServeImageError = HTTPValidationError;

export interface ServeProfilePictureParams {
  /** Storage Key */
  storageKey: string;
}

export type ServeProfilePictureData = any;

export type ServeProfilePictureError = HTTPValidationError;

export interface SearchImagesParams {
  /** Query */
  query: string;
  /**
   * Page
   * @default 1
   */
  page?: number;
  /**
   * Per Page
   * @default 12
   */
  per_page?: number;
}

export type SearchImagesData = ImageSearchResponse;

export type SearchImagesError = HTTPValidationError;

export interface TrackUnsplashDownloadParams {
  /** Photo Id */
  photoId: string;
}

/** Response Track Unsplash Download */
export type TrackUnsplashDownloadData = Record<string, any>;

export type TrackUnsplashDownloadError = HTTPValidationError;

export type ProcessRemindersData = ReminderProcessingSummary;

export type GetReminderStatsData = ReminderStats;

/** Response List Categories */
export type ListCategoriesData = CategoryResponse[];

export type CreateCategoryData = CategoryResponse;

export type CreateCategoryError = HTTPValidationError;

export interface UpdateCategoryParams {
  /** Category Id */
  categoryId: number;
}

export type UpdateCategoryData = CategoryResponse;

export type UpdateCategoryError = HTTPValidationError;

export interface DeleteCategoryParams {
  /** Category Id */
  categoryId: number;
}

export type DeleteCategoryData = any;

export type DeleteCategoryError = HTTPValidationError;

export type UploadDataRoomDocumentData = DocumentUploadResponse;

export type UploadDataRoomDocumentError = HTTPValidationError;

export interface ListDocumentsParams {
  /** Category Id */
  category_id?: number | null;
  /**
   * Status
   * @default "active"
   */
  status?: string;
}

export type ListDocumentsData = DocumentListResponse;

export type ListDocumentsError = HTTPValidationError;

export interface UpdateDocumentParams {
  /** Document Id */
  documentId: number;
}

export type UpdateDocumentData = AppApisDataRoomAdminDocumentResponse;

export type UpdateDocumentError = HTTPValidationError;

export interface DeleteDataRoomDocumentParams {
  /** Document Id */
  documentId: number;
}

export type DeleteDataRoomDocumentData = any;

export type DeleteDataRoomDocumentError = HTTPValidationError;

export type TrackLoginData = any;

export type CreateSubscriptionOnBehalfData = SubscriptionCreatedResponse;

export type CreateSubscriptionOnBehalfError = HTTPValidationError;

export interface UploadAdminPaymentProofParams {
  /** Subscription Id */
  subscriptionId: string;
}

export type UploadAdminPaymentProofData = any;

export type UploadAdminPaymentProofError = HTTPValidationError;

export type GetMyCreatedSubscriptionsData = any;

export interface UpdatePaymentStatusParams {
  /** Subscription Id */
  subscriptionId: string;
}

export type UpdatePaymentStatusData = any;

export type UpdatePaymentStatusError = HTTPValidationError;

export interface RecordPaymentParams {
  /** Subscription Id */
  subscriptionId: string;
}

export type RecordPaymentData = any;

export type RecordPaymentError = HTTPValidationError;

export interface AddPaymentNotesParams {
  /** Notes */
  notes: string;
  /** Subscription Id */
  subscriptionId: string;
}

export type AddPaymentNotesData = any;

export type AddPaymentNotesError = HTTPValidationError;

export type GetShareConfigData = ShareConfigResponse;

export type GetAllShareClassesData = AllShareClassesResponse;

/** Response Get Share Classes Admin */
export type GetShareClassesAdminData = ShareClassDetailResponse[];

export interface UpdateShareClassParams {
  /** Class Name */
  className: string;
}

export type UpdateShareClassData = ShareClassDetailResponse;

export type UpdateShareClassError = HTTPValidationError;

export type UpdateSharePriceData = ShareConfigResponse;

export type UpdateSharePriceError = HTTPValidationError;

export type TransfersTransferSharesData = TransferSharesResponse;

export type TransfersTransferSharesError = HTTPValidationError;

export type TransfersConvertShareClassData = ConvertShareClassResponse;

export type TransfersConvertShareClassError = HTTPValidationError;

export interface TransfersGetHistoryParams {
  /** Subscription Id */
  subscriptionId: string;
}

export type TransfersGetHistoryData = any;

export type TransfersGetHistoryError = HTTPValidationError;

export type TransfersFixMappingsData = any;

export type LinkPendingNotificationsData = any;

export interface ListNotificationsParams {
  /**
   * Limit
   * @max 100
   * @default 50
   */
  limit?: number;
  /**
   * Offset
   * @min 0
   * @default 0
   */
  offset?: number;
  /**
   * Unread Only
   * @default false
   */
  unread_only?: boolean;
}

export type ListNotificationsData = any;

export type ListNotificationsError = HTTPValidationError;

export type GetUnreadCountData = any;

export type MarkNotificationsReadData = any;

export type MarkNotificationsReadError = HTTPValidationError;

export type MarkAllNotificationsReadData = any;

export interface DeleteNotificationParams {
  /** Notification Id */
  notificationId: number;
}

export type DeleteNotificationData = any;

export type DeleteNotificationError = HTTPValidationError;

export interface LookupIpParams {
  /**
   * Ip Address
   * The IP address to look up. Leave empty to auto-detect.
   * @default ""
   */
  ip_address?: string;
}

export type LookupIpData = GeolocationResponse;

export type LookupIpError = HTTPValidationError;

export type CreateSessionData = any;

export type CreateSessionError = HTTPValidationError;

export interface ListSessionsParams {
  /** Status */
  status?: string | null;
  /** Session Type */
  session_type?: string | null;
}

export type ListSessionsData = any;

export type ListSessionsError = HTTPValidationError;

export interface AddVotingItemsParams {
  /** Session Id */
  sessionId: number;
}

export type AddVotingItemsData = any;

export type AddVotingItemsError = HTTPValidationError;

export interface UpdateVotingItemsParams {
  /** Session Id */
  sessionId: number;
}

export type UpdateVotingItemsData = any;

export type UpdateVotingItemsError = HTTPValidationError;

export type ListSessionsForSelectionData = any;

export interface GetSessionDetailsParams {
  /** Session Id */
  sessionId: number;
}

export type GetSessionDetailsData = any;

export type GetSessionDetailsError = HTTPValidationError;

export interface UpdateSessionParams {
  /** Session Id */
  sessionId: number;
}

export type UpdateSessionData = any;

export type UpdateSessionError = HTTPValidationError;

export interface DeleteSessionParams {
  /** Session Id */
  sessionId: number;
}

export type DeleteSessionData = any;

export type DeleteSessionError = HTTPValidationError;

export type CastVoteData = any;

export type CastVoteError = HTTPValidationError;

export interface GetVoteResultsParams {
  /** Session Id */
  sessionId: number;
}

export type GetVoteResultsData = any;

export type GetVoteResultsError = HTTPValidationError;

export interface UpdateSessionStatusParams {
  /** Session Id */
  sessionId: number;
}

export type UpdateSessionStatusData = any;

export type UpdateSessionStatusError = HTTPValidationError;

export type UploadGovernanceDocumentData = any;

export type UploadGovernanceDocumentError = HTTPValidationError;

export type ApproveItemData = any;

export type ApproveItemError = HTTPValidationError;

export type CreateProxyAssignmentData = any;

export type CreateProxyAssignmentError = HTTPValidationError;

export interface RevokeProxyParams {
  /** Proxy Id */
  proxyId: number;
}

export type RevokeProxyData = any;

export type RevokeProxyError = HTTPValidationError;

export type GetMyProxyAssignmentsData = any;

export type GetPendingActionsData = any;

export interface GetVotingHistoryParams {
  /**
   * Limit
   * @default 50
   */
  limit?: number;
}

export type GetVotingHistoryData = any;

export type GetVotingHistoryError = HTTPValidationError;

export type LinkDocumentToSessionData = any;

export type LinkDocumentToSessionError = HTTPValidationError;

export type GetUnlinkedDocumentsData = any;

export interface DeleteDocumentParams {
  /** Document Id */
  documentId: number;
}

export type DeleteDocumentData = any;

export type DeleteDocumentError = HTTPValidationError;

export interface GetBoardMembersForNotificationParams {
  /** Session Id */
  sessionId: number;
}

/** Response Get Board Members For Notification */
export type GetBoardMembersForNotificationData = BoardMemberForNotification[];

export type GetBoardMembersForNotificationError = HTTPValidationError;

export interface PreviewGovernanceSessionEmailParams {
  /** Recipient User Id */
  recipient_user_id: string;
  /** Session Id */
  sessionId: number;
}

export type PreviewGovernanceSessionEmailData = GovernanceSessionEmailPreview;

export type PreviewGovernanceSessionEmailError = HTTPValidationError;

export interface SendGovernanceSessionNotificationParams {
  /** Session Id */
  sessionId: number;
}

export type SendGovernanceSessionNotificationData = SendGovernanceNotificationResponse;

export type SendGovernanceSessionNotificationError = HTTPValidationError;

export interface ListEmailQueueParams {
  /** Session Id */
  session_id?: number | null;
  /** Status */
  status?: string | null;
}

export type ListEmailQueueData = EmailQueueListResponse;

export type ListEmailQueueError = HTTPValidationError;

export interface CancelQueuedEmailParams {
  /** Email Id */
  emailId: number;
}

/** Response Cancel Queued Email */
export type CancelQueuedEmailData = Record<string, any>;

export type CancelQueuedEmailError = HTTPValidationError;

/** Response Process Email Queue */
export type ProcessEmailQueueData = Record<string, any>;

export interface ViewCertificatePublicParams {
  /** Cert Number */
  certNumber: string;
  /** Verification Code */
  verificationCode: string;
}

export type ViewCertificatePublicData = any;

export type ViewCertificatePublicError = HTTPValidationError;

export interface ViewLatestCertificatePublicParams {
  /** Cert Number */
  certNumber: string;
}

export type ViewLatestCertificatePublicData = any;

export type ViewLatestCertificatePublicError = HTTPValidationError;

/** Response Process Profile Completion Reminders */
export type ProcessProfileCompletionRemindersData = Record<string, any>;

/** Response Get Reminder Stats */
export type GetReminderStats2Data = Record<string, any>;

export type CreateDocumentRequestData = DocumentRequestResponse;

export type CreateDocumentRequestError = HTTPValidationError;

/** Response Get My Document Requests */
export type GetMyDocumentRequestsData = DocumentRequestResponse[];

/** Response Get All Document Requests */
export type GetAllDocumentRequestsData = DocumentRequestResponse[];

export type CompleteDocumentRequestData = any;

export type CompleteDocumentRequestError = HTTPValidationError;

export type ResendWebhookData = any;

export type ResendWebhookError = HTTPValidationError;

export type TestResendWebhookData = any;

/** Response List Public Timeline Items */
export type ListPublicTimelineItemsData = TimelineItemResponse[];

/** Response List All Timeline Items */
export type ListAllTimelineItemsData = TimelineItemResponse[];

export type CreateTimelineItemData = TimelineItemResponse;

export type CreateTimelineItemError = HTTPValidationError;

export interface UpdateTimelineItemParams {
  /** Item Id */
  itemId: number;
}

export type UpdateTimelineItemData = TimelineItemResponse;

export type UpdateTimelineItemError = HTTPValidationError;

export interface DeleteTimelineItemParams {
  /** Item Id */
  itemId: number;
}

export type DeleteTimelineItemData = any;

export type DeleteTimelineItemError = HTTPValidationError;

export interface GetTimelineCommentsParams {
  /** Item Id */
  itemId: number;
}

/** Response Get Timeline Comments */
export type GetTimelineCommentsData = TimelineCommentResponse[];

export type GetTimelineCommentsError = HTTPValidationError;

export type AddTimelineCommentData = TimelineCommentResponse;

export type AddTimelineCommentError = HTTPValidationError;

export interface DeleteCommentParams {
  /** Comment Id */
  commentId: number;
}

export type DeleteCommentData = any;

export type DeleteCommentError = HTTPValidationError;

/** Response List Requirements */
export type ListRequirementsData = BoardDocumentRequirement[];

export type CreateRequirementData = BoardDocumentRequirement;

export type CreateRequirementError = HTTPValidationError;

export interface UpdateRequirementParams {
  /** Requirement Id */
  requirementId: number;
}

export type UpdateRequirementData = BoardDocumentRequirement;

export type UpdateRequirementError = HTTPValidationError;

export interface DeleteRequirementParams {
  /** Requirement Id */
  requirementId: number;
}

export type DeleteRequirementData = any;

export type DeleteRequirementError = HTTPValidationError;

export interface UploadTemplateParams {
  /** Requirement Id */
  requirementId: number;
}

/** Response Upload Template */
export type UploadTemplateData = Record<string, any>;

export type UploadTemplateError = HTTPValidationError;

export interface UpdateTemplateDescriptionParams {
  /**
   * Description
   * Template description/instructions
   */
  description: string;
  /** Requirement Id */
  requirementId: number;
}

/** Response Update Template Description */
export type UpdateTemplateDescriptionData = Record<string, any>;

export type UpdateTemplateDescriptionError = HTTPValidationError;

export interface DeleteTemplateParams {
  /** Requirement Id */
  requirementId: number;
}

/** Response Delete Template */
export type DeleteTemplateData = Record<string, any>;

export type DeleteTemplateError = HTTPValidationError;

export interface DownloadTemplateParams {
  /** Requirement Id */
  requirementId: number;
}

export type DownloadTemplateData = any;

export type DownloadTemplateError = HTTPValidationError;

export interface DownloadDocumentParams {
  /** Document Id */
  documentId: number;
}

export type DownloadDocumentData = any;

export type DownloadDocumentError = HTTPValidationError;

export interface GetChecklistParams {
  /** Jurisdiction */
  jurisdiction?: string | null;
}

export type GetChecklistData = ChecklistResponse;

export type GetChecklistError = HTTPValidationError;

export type GetMyStatusData = MyStatusResponse;

/** Response Get My Document Status */
export type GetMyDocumentStatusData = Record<string, any>;

export interface UploadDocumentParams {
  /** Requirement Id */
  requirement_id: number;
}

export type UploadDocumentData = UploadResponse;

export type UploadDocumentError = HTTPValidationError;

export interface ResubmitDocumentParams {
  /** Document Id */
  documentId: number;
}

export type ResubmitDocumentData = UploadResponse;

export type ResubmitDocumentError = HTTPValidationError;

export interface ReviewDocumentParams {
  /** Document Id */
  documentId: number;
}

export type ReviewDocumentData = ReviewDocumentResponse;

export type ReviewDocumentError = HTTPValidationError;

/** Response Get All Members Status */
export type GetAllMembersStatusData = BoardMemberStatusOverview[];

/** Response Get Review Queue */
export type GetReviewQueueData = DocumentInReview[];

export type GetReadinessReportData = ReadinessReportResponse;

export type BroadcastDocumentRequestData = BroadcastDocumentRequestResponse;

export type BroadcastDocumentRequestError = HTTPValidationError;

/** Response List Requirement Settings */
export type ListRequirementSettingsData = RequirementSettings[];

export interface UpdateRequirementSettingsParams {
  /** Requirement Id */
  requirementId: number;
}

export type UpdateRequirementSettingsData = RequirementSettings;

export type UpdateRequirementSettingsError = HTTPValidationError;

export type SendIndividualDocumentRequestData = IndividualDocumentRequestResponse;

export type SendIndividualDocumentRequestError = HTTPValidationError;

export type CreateMediaReleaseData = MediaReleaseResponse;

export type CreateMediaReleaseError = HTTPValidationError;

export interface ListMediaReleasesParams {
  /** Status */
  status?: string | null;
  /**
   * Limit
   * @default 50
   */
  limit?: number;
}

/** Response List Media Releases */
export type ListMediaReleasesData = MediaReleaseListItem[];

export type ListMediaReleasesError = HTTPValidationError;

export interface ListPublishedReleasesParams {
  /**
   * Limit
   * @default 20
   */
  limit?: number;
}

/** Response List Published Releases */
export type ListPublishedReleasesData = MediaReleaseListItem[];

export type ListPublishedReleasesError = HTTPValidationError;

export interface GetMediaReleaseBySlugParams {
  /** Slug */
  slug: string;
}

export type GetMediaReleaseBySlugData = MediaReleaseResponse;

export type GetMediaReleaseBySlugError = HTTPValidationError;

export interface GetMediaReleaseParams {
  /** Release Id */
  releaseId: number;
}

export type GetMediaReleaseData = MediaReleaseResponse;

export type GetMediaReleaseError = HTTPValidationError;

export interface UpdateMediaReleaseParams {
  /** Release Id */
  releaseId: number;
}

export type UpdateMediaReleaseData = MediaReleaseResponse;

export type UpdateMediaReleaseError = HTTPValidationError;

export interface DeleteMediaReleaseParams {
  /** Release Id */
  releaseId: number;
}

/** Response Delete Media Release */
export type DeleteMediaReleaseData = Record<string, any>;

export type DeleteMediaReleaseError = HTTPValidationError;

export interface PublishMediaReleaseParams {
  /** Release Id */
  releaseId: number;
}

export type PublishMediaReleaseData = PublishMediaReleaseResponse;

export type PublishMediaReleaseError = HTTPValidationError;

export interface DocumentsGenerateWelcomeLetterParams {
  /** Subscription Id */
  subscriptionId: string;
}

export type DocumentsGenerateWelcomeLetterData = any;

export type DocumentsGenerateWelcomeLetterError = HTTPValidationError;

export interface DocumentsSubscriptionSummaryParams {
  /** Subscription Id */
  subscriptionId: string;
}

export type DocumentsSubscriptionSummaryData = any;

export type DocumentsSubscriptionSummaryError = HTTPValidationError;

export interface DocumentsPaymentReceiptParams {
  /** Subscription Id */
  subscriptionId: string;
}

export type DocumentsPaymentReceiptData = any;

export type DocumentsPaymentReceiptError = HTTPValidationError;

export interface DocumentsSendWelcomePackageParams {
  /** Subscription Id */
  subscriptionId: string;
}

export type DocumentsSendWelcomePackageData = any;

export type DocumentsSendWelcomePackageError = HTTPValidationError;

/** Response List Bank Accounts */
export type ListBankAccountsData = BankAccount[];

export interface GetDefaultBankAccountParams {
  /**
   * Currency
   * @default "ZAR"
   */
  currency?: string;
}

export type GetDefaultBankAccountData = BankAccount;

export type GetDefaultBankAccountError = HTTPValidationError;

export type CreateBankAccountData = BankAccount;

export type CreateBankAccountError = HTTPValidationError;

export interface UpdateBankAccountParams {
  /** Account Id */
  accountId: number;
}

export type UpdateBankAccountData = BankAccount;

export type UpdateBankAccountError = HTTPValidationError;

export interface DeleteBankAccountParams {
  /** Account Id */
  accountId: number;
}

/** Response Delete Bank Account */
export type DeleteBankAccountData = Record<string, any>;

export type DeleteBankAccountError = HTTPValidationError;

export type SeedBankAccountData = any;

export type CertificatesIssueCertificateData = IssueCertificateResponse;

export type CertificatesIssueCertificateError = HTTPValidationError;

export interface CertificatesViewCertificateParams {
  /** Cert Number */
  certNumber: string;
  /** Verification Code */
  verificationCode: string;
}

export type CertificatesViewCertificateData = any;

export type CertificatesViewCertificateError = HTTPValidationError;

export interface CertificatesDownloadCertificateParams {
  /** Verification Code */
  verification_code?: string;
  /** Cert Number */
  certNumber: string;
}

export type CertificatesDownloadCertificateData = any;

export type CertificatesDownloadCertificateError = HTTPValidationError;

export type CertificatesGetMyCertificatesData = any;

export interface CertificatesRevokeCertificateParams {
  /** Reason */
  reason: string;
  /** Cert Id */
  certId: number;
}

export type CertificatesRevokeCertificateData = any;

export type CertificatesRevokeCertificateError = HTTPValidationError;

export interface CertificatesRegenerateCertificateParams {
  /** Cert Id */
  certId: number;
}

export type CertificatesRegenerateCertificateData = any;

export type CertificatesRegenerateCertificateError = HTTPValidationError;

export interface CertificatesSignCertificateParams {
  /** Cert Id */
  certId: number;
}

export type CertificatesSignCertificateData = SignCertificateResponse;

export type CertificatesSignCertificateError = HTTPValidationError;

export interface CertificatesResendEmailParams {
  /** Cert Id */
  certId: number;
}

export type CertificatesResendEmailData = any;

export type CertificatesResendEmailError = HTTPValidationError;

export type CertificatesBulkIssueData = any;

export interface CertificatesPreviewCertificateParams {
  /** Subscription Id */
  subscriptionId: string;
}

export type CertificatesPreviewCertificateData = any;

export type CertificatesPreviewCertificateError = HTTPValidationError;

export interface CertificatesResendQrParams {
  /** Cert Number */
  certNumber: string;
}

export type CertificatesResendQrData = any;

export type CertificatesResendQrError = HTTPValidationError;

export type InitializeSuperAdminData = SetupAdminResponse;

export type InitializeSuperAdminError = HTTPValidationError;

export type CreateAdminData = CreateAdminResponse;

export type CreateAdminError = HTTPValidationError;

export type CheckSetupStatusData = any;

export type LogActivityData = ActivityLogResponse;

export type LogActivityError = HTTPValidationError;

export interface GetRecentActivitiesParams {
  /**
   * Limit
   * @default 5
   */
  limit?: number;
}

export type GetRecentActivitiesData = RecentActivitiesResponse;

export type GetRecentActivitiesError = HTTPValidationError;

export interface GetActivitiesForUserParams {
  /**
   * Limit
   * @default 5
   */
  limit?: number;
  /** User Id */
  userId: string;
}

export type GetActivitiesForUserData = RecentActivitiesResponse;

export type GetActivitiesForUserError = HTTPValidationError;

export type GetBoardDashboardData = BoardDashboardResponse;

export interface ValidateInvitationParams {
  /** Token */
  token: string;
}

export type ValidateInvitationData = InvitationValidationResponse;

export type ValidateInvitationError = HTTPValidationError;

export type CheckPendingPopupsData = CheckPopupsResponse;

export interface DismissPopupParams {
  /** Notification Id */
  notificationId: number;
}

export type DismissPopupData = any;

export type DismissPopupError = HTTPValidationError;

export type GetNotificationPreferencesData = AppApisPopupsNotificationPreferences;

export type UpdateNotificationPreferencesData = any;

export type UpdateNotificationPreferencesError = HTTPValidationError;

/** Response Get Current User Pending Invitations */
export type GetCurrentUserPendingInvitationsData = AppApisUserInvitationsInvitationResponse[];

export type AcceptMyInvitationData = AcceptInvitationResponse;

export type AcceptMyInvitationError = HTTPValidationError;

export type ListBoardPositionsData = BoardPositionListResponse;

export type CreateBoardPositionData = BoardPosition;

export type CreateBoardPositionError = HTTPValidationError;

export interface UpdateBoardPositionParams {
  /** Position Id */
  positionId: number;
}

export type UpdateBoardPositionData = BoardPosition;

export type UpdateBoardPositionError = HTTPValidationError;

export interface AppointBoardMemberParams {
  /** Member Id */
  memberId: number;
}

export type AppointBoardMemberData = AssignPositionResponse;

export type AppointBoardMemberError = HTTPValidationError;

export type GetCurrentBoardCompositionData = CurrentBoardResponse;

export interface GetPositionHistoryParams {
  /** Member Id */
  member_id?: number | null;
  /** User Id */
  user_id?: string | null;
  /** Position Id */
  position_id?: number | null;
  /**
   * Limit
   * @default 100
   */
  limit?: number;
}

export type GetPositionHistoryData = PositionHistoryResponse;

export type GetPositionHistoryError = HTTPValidationError;

export type GetBoardMembersWithInvestmentStatusData = BoardMembersInvestmentResponse;

export type CoreGetShareAvailabilityData = ShareAvailability;

export type CoreCreateSubscriptionData = SubscriptionResponse;

export type CoreCreateSubscriptionError = HTTPValidationError;

export interface CoreGetSubscriptionStatusParams {
  /** Subscription Id */
  subscriptionId: string;
}

export type CoreGetSubscriptionStatusData = SubscriptionStatus;

export type CoreGetSubscriptionStatusError = HTTPValidationError;

export type CoreListAllSubscriptionsData = SubscriptionListResponse;

export type CoreGetMyPublicSubscriptionsData = any;

export type CoreGetMySubscriptionsData = any;

export interface CoreGetSubscriptionDetailsParams {
  /** Subscription Id */
  subscriptionId: string;
}

/** Response Core Get Subscription Details */
export type CoreGetSubscriptionDetailsData = Record<string, any>;

export type CoreGetSubscriptionDetailsError = HTTPValidationError;

export type CoreGetSubscriptionConfigData = SubscriptionConfig;

export type SendInvestorMessageData = AppApisInvestorChatSendMessageResponse;

export type SendInvestorMessageError = HTTPValidationError;

export interface GetInvestorConversationParams {
  /** Conversation Id */
  conversationId: number;
}

export type GetInvestorConversationData = ConversationResponse;

export type GetInvestorConversationError = HTTPValidationError;

export type ListMyConversationsData = any;

export interface UpdateFollowUpParams {
  /** Follow Up Id */
  followUpId: number;
}

/** Response Update Follow Up */
export type UpdateFollowUpData = Record<string, any>;

export type UpdateFollowUpError = HTTPValidationError;

export interface SnoozeFollowUpParams {
  /** Follow Up Id */
  followUpId: number;
}

/** Response Snooze Follow Up */
export type SnoozeFollowUpData = Record<string, any>;

export type SnoozeFollowUpError = HTTPValidationError;

export interface CompleteFollowUpParams {
  /** Follow Up Id */
  followUpId: number;
}

/** Response Complete Follow Up */
export type CompleteFollowUpData = Record<string, any>;

export type CompleteFollowUpError = HTTPValidationError;

export type GetMyPendingFollowUpsData = PendingFollowUpsResponse;

export type ProcessDailyFollowUpRemindersData = DailyReminderResult;

export type ProcessDailyFollowUpRemindersError = HTTPValidationError;

export interface ListLeadsParams {
  /** Status */
  status?: string | null;
  /** Lead Source */
  lead_source?: string | null;
  /** Assigned To */
  assigned_to?: string | null;
  /** Search */
  search?: string | null;
  /**
   * Limit
   * @default 100
   */
  limit?: number;
  /**
   * Offset
   * @default 0
   */
  offset?: number;
}

/** Response List Leads */
export type ListLeadsData = LeadResponse[];

export type ListLeadsError = HTTPValidationError;

export type CreateLeadData = LeadResponse;

export type CreateLeadError = HTTPValidationError;

export interface GetLeadDetailsParams {
  /** Lead Id */
  leadId: number;
}

export type GetLeadDetailsData = LeadResponse;

export type GetLeadDetailsError = HTTPValidationError;

export interface UpdateLeadParams {
  /** Lead Id */
  leadId: number;
}

export type UpdateLeadData = LeadResponse;

export type UpdateLeadError = HTTPValidationError;

export interface DeleteLeadParams {
  /** Lead Id */
  leadId: number;
}

/** Response Delete Lead */
export type DeleteLeadData = Record<string, any>;

export type DeleteLeadError = HTTPValidationError;

export interface AddNoteToLeadParams {
  /** Lead Id */
  leadId: number;
}

/** Response Add Note To Lead */
export type AddNoteToLeadData = Record<string, any>;

export type AddNoteToLeadError = HTTPValidationError;

export interface GetLeadActivityParams {
  /** Lead Id */
  leadId: number;
}

/** Response Get Lead Activity */
export type GetLeadActivityData = ActivityResponse[];

export type GetLeadActivityError = HTTPValidationError;

export type BulkImportLeadsData = BulkImportSummary;

export type BulkImportLeadsError = HTTPValidationError;

export type GetAnalyticsData = AnalyticsResponse;

/** Response List Templates */
export type ListTemplatesData = TemplateListItem[];

export interface GetTemplateParams {
  /** Template Id */
  templateId: number;
}

export type GetTemplateData = CertificateTemplate;

export type GetTemplateError = HTTPValidationError;

export interface DeleteCertificateTemplateParams {
  /** Template Id */
  templateId: number;
}

/** Response Delete Certificate Template */
export type DeleteCertificateTemplateData = Record<string, any>;

export type DeleteCertificateTemplateError = HTTPValidationError;

export type GetActiveTemplateData = CertificateTemplate;

export type UploadPdfTemplateData = CertificateTemplate;

export type UploadPdfTemplateError = HTTPValidationError;

export interface GetPdfFieldsParams {
  /** Template Id */
  templateId: number;
}

export type GetPdfFieldsData = PDFFieldMapping;

export type GetPdfFieldsError = HTTPValidationError;

export interface DownloadCertificateTemplateParams {
  /** Template Id */
  templateId: number;
}

export type DownloadCertificateTemplateData = any;

export type DownloadCertificateTemplateError = HTTPValidationError;

export interface ActivateTemplateParams {
  /** Template Id */
  templateId: number;
}

/** Response Activate Template */
export type ActivateTemplateData = Record<string, any>;

export type ActivateTemplateError = HTTPValidationError;

export type ListCryptoWalletsData = any;

export type CreateOrUpdateWalletData = any;

export type CreateOrUpdateWalletError = HTTPValidationError;

export interface DeleteWalletParams {
  /** Crypto Type */
  cryptoType: string;
}

export type DeleteWalletData = any;

export type DeleteWalletError = HTTPValidationError;

export type GetAvailableWalletsData = any;

export interface GetWalletDetailsParams {
  /** Crypto Type */
  cryptoType: string;
}

export type GetWalletDetailsData = any;

export type GetWalletDetailsError = HTTPValidationError;
