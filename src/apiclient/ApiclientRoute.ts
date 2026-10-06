import {
  AcceptInvitationRequest,
  AcceptMyInvitationData,
  AccessDocumentData,
  AcknowledgeAlertData,
  ActionItemRequest,
  ActivateTemplateData,
  ActivityLog,
  AddAgendaItemData,
  AddBeneficiaryData,
  AddNoteRequest,
  AddNoteToLeadData,
  AddPaymentNotesData,
  AddTimelineCommentData,
  AddVotingItemsData,
  AgendaItemRequest,
  AgreeToLoiData,
  AlertAcknowledgment,
  AnalyticsGetSubscriptionAnalyticsData,
  AppApisInvestorChatSendMessageRequest,
  AppApisLeadChatSendMessageRequest,
  AppointBoardMemberData,
  AppointBoardMemberEndpointData,
  AppointBoardMemberRequest,
  ApproveDocumentData,
  ApproveDocumentRequest,
  ApproveItemData,
  ApproveItemRequest,
  ApproveMinutesData,
  AssignPositionRequest,
  AssignRoleData,
  AssignRoleRequest,
  AttendanceRequest,
  AutoEscalateNotificationsData,
  AutoSyncBoardMembersData,
  AutomationActionRequest,
  AutomationRuleConfig,
  BeneficiaryRequest,
  BillPaymentRequest,
  BodyBulkImportLeads,
  BodyPaymentsUploadPaymentProof,
  BodyRecordBoardMemberPayment,
  BodyResubmitDocument,
  BodyUploadAchievementImage,
  BodyUploadAdminPaymentProof,
  BodyUploadCv,
  BodyUploadDataRoomDocument,
  BodyUploadDocument,
  BodyUploadImage,
  BodyUploadPdfTemplate,
  BodyUploadProfilePicture,
  BodyUploadTemplate,
  BroadcastDocumentRequestBody,
  BroadcastDocumentRequestData,
  BulkImportLeadsData,
  BulkSendInvitationRequest,
  BulkSendInvitationsData,
  CalculateLoanData,
  CancelBoardInvestmentData,
  CancelDebitOrderData,
  CancelInvitationData,
  CancelQueuedEmailData,
  CancelRequestData,
  CardActionData,
  CardActionRequest,
  CastVoteData,
  CastVoteRequest,
  CategoryCreate,
  CategoryUpdate,
  CertificatesBulkIssueData,
  CertificatesDownloadCertificateData,
  CertificatesGetMyCertificatesData,
  CertificatesIssueCertificateData,
  CertificatesPreviewCertificateData,
  CertificatesRegenerateCertificateData,
  CertificatesResendEmailData,
  CertificatesResendQrData,
  CertificatesRevokeCertificateData,
  CertificatesSignCertificateData,
  CertificatesViewCertificateData,
  CheckAccessData,
  CheckAndAcceptPendingInvitationsData,
  CheckCanInviteRoleData,
  CheckHealthData,
  CheckPendingPopupsData,
  CheckProfileCompletenessData,
  CheckProfileCompletenessPayload,
  CheckSetupStatusData,
  CompleteConversationAndCreateLeadData,
  CompleteConversationRequest,
  CompleteDocumentRequestData,
  CompleteFollowUpData,
  CompleteFollowUpRequest,
  CompleteRequestModel,
  ConversionRequest,
  ConvertCurrencyData,
  ConvertShareClassRequest,
  CoreCreateSubscriptionData,
  CoreGetMyPublicSubscriptionsData,
  CoreGetMySubscriptionsData,
  CoreGetShareAvailabilityData,
  CoreGetSubscriptionConfigData,
  CoreGetSubscriptionDetailsData,
  CoreGetSubscriptionStatusData,
  CoreListAllSubscriptionsData,
  CreateAchievementData,
  CreateAchievementRequest,
  CreateActionItemData,
  CreateAdminData,
  CreateAdminRequest,
  CreateBankAccountData,
  CreateBankAccountRequest,
  CreateBillPaymentData,
  CreateBoardInvestmentData,
  CreateBoardPositionData,
  CreateBoardWelcomeMessageData,
  CreateCategoryData,
  CreateDocumentRequestData,
  CreateDocumentRequestModel,
  CreateEmailTemplateData,
  CreateEmailTemplateModel,
  CreateInvestmentOnBehalfData,
  CreateInvitationEndpointData,
  CreateInvitationRequest,
  CreateLeadData,
  CreateLeadRequest,
  CreateMediaReleaseData,
  CreateMediaReleaseRequest,
  CreateMeetingData,
  CreateMeetingRequest,
  CreateOnBehalfRequest,
  CreateOrUpdateWalletData,
  CreatePositionRequest,
  CreateProfileCompletionReminderData,
  CreateProfileForTestUserData,
  CreateProxyAssignmentData,
  CreateProxyRequest,
  CreateRequirementData,
  CreateSessionData,
  CreateSessionRequest,
  CreateSubscriptionOnBehalfData,
  CreateSubscriptionRequest,
  CreateTimelineItemData,
  CreateTransferData,
  CreateVotingItemRequest,
  CreateWalletRequest,
  CreateWelcomeMessageData,
  DailyPaymentRemindersData,
  DebitOrderSetupRequest,
  DeleteAchievementData,
  DeleteBankAccountData,
  DeleteBeneficiaryData,
  DeleteCategoryData,
  DeleteCertificateTemplateData,
  DeleteCommentData,
  DeleteDataRoomDocumentData,
  DeleteDocumentData,
  DeleteLeadData,
  DeleteMediaReleaseData,
  DeleteMeetingData,
  DeleteNotificationData,
  DeleteRequirementData,
  DeleteSessionData,
  DeleteTemplateData,
  DeleteTimelineItemData,
  DeleteWalletData,
  DeviceRegistration,
  DisconnectData,
  DismissMessageData,
  DismissPopupData,
  DismissPopupRequest,
  DismissProfileCompletionData,
  DocumentAccessRequest,
  DocumentUpdate,
  DocumentsGenerateWelcomeLetterData,
  DocumentsPaymentReceiptData,
  DocumentsSendWelcomePackageData,
  DocumentsSubscriptionSummaryData,
  DownloadCertificateTemplateData,
  DownloadDocumentData,
  DownloadReceiptData,
  DownloadTemplateData,
  ExecuteAutomationActionData,
  ExecuteMessageCtaData,
  FetchExchangeRatesData,
  GenerateBioForUserData,
  GenerateCodeRequest,
  GenerateVerificationCodeData,
  GetAccessLogsData,
  GetAccountData,
  GetActiveTemplateData,
  GetActivitiesForUserData,
  GetAgendaData,
  GetAllAgreementsData,
  GetAllBoardInvestmentsData,
  GetAllDocumentRequestsData,
  GetAllMembersStatusData,
  GetAllRatesData,
  GetAllShareClassesData,
  GetAnalyticsData,
  GetAnalyticsOverviewData,
  GetAtRiskLeadsData,
  GetAttendanceData,
  GetAuthUrlData,
  GetAutomationRulesData,
  GetAutomationStatsData,
  GetAvailableUsersData,
  GetAvailableWalletsData,
  GetBatchPreferencesData,
  GetBatchPreferencesPayload,
  GetBoardDashboardData,
  GetBoardMembersForInvitationData,
  GetBoardMembersForNotificationData,
  GetBoardMembersWithInvestmentStatusData,
  GetCertificateData,
  GetCertificateStatisticsData,
  GetChannelStatsData,
  GetChecklistData,
  GetConfigData,
  GetConversationData,
  GetCurrentBoardCompositionData,
  GetCurrentNcndaData,
  GetCurrentRatesData,
  GetCurrentUserPendingInvitationsData,
  GetDashboardData,
  GetDashboardStatsData,
  GetDebitOrderTransactionsData,
  GetDefaultBankAccountData,
  GetDeliveryLogsData,
  GetDividendSummaryData,
  GetDocumentStatsData,
  GetEmailHistoryData,
  GetEmailQueueStatusData,
  GetEscalationStatsData,
  GetFetchStatusData,
  GetInvestmentOptionsData,
  GetInvestmentRecommendationsData,
  GetInvestorConversationData,
  GetInvitationPermissionData,
  GetInvitationStatsData,
  GetLeadActivityData,
  GetLeadDetailsData,
  GetLeadStoryEndpointData,
  GetLoanData,
  GetLoiSubmissionsData,
  GetMediaReleaseBySlugData,
  GetMediaReleaseData,
  GetMeetingData,
  GetMeetingInviteesData,
  GetMinutesData,
  GetMyAgreementStatusData,
  GetMyCreatedSubscriptionsData,
  GetMyDebitOrdersData,
  GetMyDevicesData,
  GetMyDividendsData,
  GetMyDocumentRequestsData,
  GetMyDocumentStatusData,
  GetMyInvestmentData,
  GetMyPendingFollowUpsData,
  GetMyPreferencesData,
  GetMyProxyAssignmentsData,
  GetMyRequestsData,
  GetMyRolesData,
  GetMyStatusData,
  GetNotificationPreferencesData,
  GetNotificationTypesData,
  GetOnboardingSummaryData,
  GetPdfFieldsData,
  GetPendingActionsData,
  GetPendingAgreementsData,
  GetPendingCountData,
  GetPendingQueueData,
  GetPipelineHealthReportData,
  GetPortfolioDashboardData,
  GetPositionHistoryData,
  GetProcessingLogsData,
  GetProcessingStatsData,
  GetPublicConfigData,
  GetQueueData,
  GetRateHistoryData,
  GetReadinessReportData,
  GetRecentActivitiesData,
  GetReinvestSettingsData,
  GetReminderStats2Data,
  GetReminderStatsData,
  GetReviewQueueData,
  GetRiskAssessmentData,
  GetSessionDetailsData,
  GetShareClassesAdminData,
  GetShareConfigData,
  GetShareholderCertificatesData,
  GetTemplateData,
  GetTemplateUsageStatsData,
  GetTestUserInfoData,
  GetTimelineCommentsData,
  GetTimelineData,
  GetUnlinkedDocumentsData,
  GetUnmappedBoardMembersData,
  GetUnreadCountData,
  GetUserLoginHistoryData,
  GetUserProfileByIdData,
  GetUserProfileData,
  GetUserRoleHistoryData,
  GetUserRolesByIdData,
  GetUserSuspensionHistoryData,
  GetVoteResultsData,
  GetVotingHistoryData,
  GetWalletDetailsData,
  GoogleDriveCallbackData,
  IndividualDocumentRequest,
  InitializeSuperAdminData,
  InvestmentRequest,
  InviteMembersData,
  InviteeMemberRequest,
  IssueCertificateRequest,
  LOIAgreementRequest,
  LOIReviewRequest,
  LeadMonitoringHealthData,
  LinkDocumentRequest,
  LinkDocumentToSessionData,
  LinkPendingNotificationsData,
  ListAccountsData,
  ListAllAchievementsData,
  ListAllActionItemsData,
  ListAllRolesData,
  ListAllTimelineItemsData,
  ListAllUsersData,
  ListBankAccountsData,
  ListBeneficiariesData,
  ListBillPaymentsData,
  ListBoardMembersData,
  ListBoardPositionsData,
  ListCardsData,
  ListCategoriesData,
  ListCertificatesData,
  ListCryptoWalletsData,
  ListDocumentsData,
  ListEmailQueueData,
  ListEmailTemplatesData,
  ListInvestorDocumentsData,
  ListInvestorInvitationsData,
  ListInvitationPermissionsData,
  ListInvitationsData,
  ListLeadsData,
  ListLoansData,
  ListMediaReleasesData,
  ListMeetingActionItemsData,
  ListMeetingsData,
  ListMessagesData,
  ListMyConversationsData,
  ListNotificationsData,
  ListPublicTimelineItemsData,
  ListPublishedReleasesData,
  ListRequirementSettingsData,
  ListRequirementsData,
  ListSentEmailsData,
  ListSentEmailsRequest,
  ListSessionsData,
  ListSessionsForSelectionData,
  ListTemplateRegistryData,
  ListTemplatesData,
  LoanCalculatorRequest,
  LogActivityData,
  LogOnboardingEventData,
  LookupIpData,
  ManualMappingRequest,
  ManualResendInvitationData,
  MapBoardMemberManuallyData,
  MapBoardMemberOnLoginData,
  MapRegisteredUserToBoardMemberData,
  MapUserRequest,
  MarkAllNotificationsReadData,
  MarkAttendanceData,
  MarkNotificationsReadData,
  MarkReadRequest,
  MintShortLinkData,
  MintShortLinkRequest,
  MinutesRequest,
  MonthlyDebitOrdersData,
  NotificationPreferencesInput,
  OnboardingEventRequest,
  OverrideDocumentData,
  OverrideDocumentRequest,
  PauseDebitOrderData,
  PaymentRecord,
  PaymentsGetPaymentHistoryData,
  PaymentsProcessPaymentRemindersData,
  PaymentsRecordPaymentData,
  PaymentsUploadPaymentProofData,
  PaymentsVerifyPaymentData,
  PreviewGovernanceSessionEmailData,
  PreviewTemplateFromRegistryData,
  PreviewTemplateRequest,
  ProcessDailyFollowUpRemindersData,
  ProcessDailyLeadMonitoringData,
  ProcessEmailQueueData,
  ProcessEmailQueueEndpointData,
  ProcessInvitationRemindersData,
  ProcessProfileCompletionRemindersData,
  ProcessRemindersData,
  PublishMediaReleaseData,
  ReactivateUserData,
  RecordBoardMemberPaymentData,
  RecordMinutesData,
  RecordPaymentData,
  RecordPaymentRequest,
  RedirectShortLinkData,
  RefreshExchangeRatesData,
  RegisterDeviceData,
  RegisterUserData,
  ReinvestmentSettings,
  RemoveBoardMemberEndpointData,
  RemoveDeviceData,
  RemoveRoleData,
  RemoveRoleRequest,
  RequestCertificateData,
  RequestCertificateRequest,
  RequirementCreate,
  RequirementUpdate,
  ResendInvitationEmailData,
  ResendInvitationsRequest,
  ResendMeetingInvitationsData,
  ResendWebhookData,
  ResetDailyPopupCountersData,
  ResubmitDocumentData,
  ResumeDebitOrderData,
  RetryFailedEmailEndpointData,
  ReviewDocumentData,
  ReviewDocumentRequest,
  ReviewLoiSubmissionData,
  RevokeProxyData,
  RunOnboardingRemindersData,
  SchedulerHealthData,
  SearchImagesData,
  SearchTransactionsData,
  SearchUsersData,
  SeedBankAccountData,
  SeedTestUsersData,
  SendEmailFromTemplateData,
  SendEmailModel,
  SendGovernanceNotificationRequest,
  SendGovernanceSessionNotificationData,
  SendIndividualDocumentRequestData,
  SendInvestorMessageData,
  SendInvitationData,
  SendInvitationRequest,
  SendMeetingRemindersData,
  SendMessageData,
  SendOTPRequest,
  SendOtpData,
  SendProfileCompletionReminderData,
  SendTestPaymentEmailData,
  ServeImageData,
  ServeProfilePictureData,
  SetupAdminRequest,
  SetupDebitOrderData,
  SignAgreementRequest,
  SignCertificateRequest,
  SignNcndaData,
  SignTermsData,
  SnoozeFollowUpData,
  SnoozeFollowUpRequest,
  StartConversationData,
  SubscriptionRequest,
  SuspendUserData,
  SuspendUserRequest,
  SyncInvitationsWithBoardMembersData,
  TestPaymentEmailRequest,
  TestResendWebhookData,
  TestTemplateFromRegistryData,
  TestTemplateRequest,
  TimelineCommentCreate,
  TimelineItemCreate,
  TimelineItemUpdate,
  ToggleTemplateActiveStatusData,
  TrackInvestorInvitationOpenData,
  TrackLinkClickData,
  TrackLoginData,
  TrackUnsplashDownloadData,
  TransactionFilters,
  TransferClassRequest,
  TransferMemberRequest,
  TransferRequest,
  TransferSharesBetweenClassesData,
  TransferSharesBetweenMembersData,
  TransferSharesRequest,
  TransfersConvertShareClassData,
  TransfersFixMappingsData,
  TransfersGetHistoryData,
  TransfersTransferSharesData,
  TriggerProcessingData,
  UpdateAchievementData,
  UpdateAchievementRequest,
  UpdateActionItemData,
  UpdateActionItemRequest,
  UpdateAutomationRuleData,
  UpdateBankAccountData,
  UpdateBankAccountRequest,
  UpdateBoardInvestmentData,
  UpdateBoardMemberEndpointData,
  UpdateBoardMemberRequest,
  UpdateBoardPositionData,
  UpdateCardLimitsData,
  UpdateCardLimitsRequest,
  UpdateCategoryData,
  UpdateCertificateStatusData,
  UpdateCertificateStatusRequest,
  UpdateConfigData,
  UpdateConfigRequest,
  UpdateDocumentData,
  UpdateEmailTemplateData,
  UpdateEmailTemplateModel,
  UpdateFollowUpData,
  UpdateFollowUpRequest,
  UpdateInvitationPermissionData,
  UpdateInvitationPermissionRequest,
  UpdateLeadData,
  UpdateLeadRequest,
  UpdateMediaReleaseData,
  UpdateMediaReleaseRequest,
  UpdateMeetingData,
  UpdateMeetingRequest,
  UpdateMyPreferencesData,
  UpdateNotificationPreferencesData,
  UpdatePaymentStatusData,
  UpdatePaymentStatusRequest,
  UpdatePositionRequest,
  UpdatePreferencesRequest,
  UpdateRSVPRequest,
  UpdateReinvestSettingsData,
  UpdateRequirementData,
  UpdateRequirementSettingsBody,
  UpdateRequirementSettingsData,
  UpdateRsvpData,
  UpdateSessionData,
  UpdateSessionRequest,
  UpdateSessionStatusData,
  UpdateSessionStatusRequest,
  UpdateShareClassData,
  UpdateShareClassRequest,
  UpdateSharePriceData,
  UpdateSharePriceRequest,
  UpdateSharesRequest,
  UpdateTemplateDescriptionData,
  UpdateTimelineItemData,
  UpdateUserProfileData,
  UpdateVotingItemsData,
  UpdateVotingItemsRequest,
  UploadAchievementImageData,
  UploadAdminPaymentProofData,
  UploadCvData,
  UploadDataRoomDocumentData,
  UploadDocumentData,
  UploadDocumentRequest,
  UploadGovernanceDocumentData,
  UploadImageData,
  UploadPdfTemplateData,
  UploadProfilePictureData,
  UploadTemplateData,
  UserProfileUpdate,
  UserRegistrationRequest,
  ValidateIdentityData,
  ValidateIdentityPayload,
  ValidateInvitationData,
  VerifyCertificateByTokenData,
  VerifyCodeAndAcceptData,
  VerifyCodeRequest,
  VerifyOTPRequest,
  VerifyOtpData,
  ViewCertificatePublicData,
  ViewLatestCertificatePublicData,
} from "./data-contracts";

export namespace Apiclient {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  export namespace check_health {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CheckHealthData;
  }

  /**
   * @description Scheduled job to auto-escalate notifications based on age. Should be run daily via a cron job or scheduled task. Escalation Rules: - Info (7+ days) → Normal - Normal (3+ days) → Important - Important (4+ days) → Urgent - Urgent (7+ days) → Critical - Critical → No escalation (final level)
   * @name auto_escalate_notifications
   * @summary Auto Escalate Notifications
   * @request POST:/routes/notifications/auto-escalate
   */
  export namespace auto_escalate_notifications {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = AutoEscalateNotificationsData;
  }

  /**
   * @description Scheduled job to reset daily popup dismiss counters. Should be run daily at midnight. This allows users to see popups again the next day if they haven't taken action.
   * @name reset_daily_popup_counters
   * @summary Reset Daily Popup Counters
   * @request POST:/routes/notifications/reset-popup-counters
   */
  export namespace reset_daily_popup_counters {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ResetDailyPopupCountersData;
  }

  /**
   * @description Get statistics about notification escalation. Useful for monitoring and debugging.
   * @name get_escalation_stats
   * @summary Get Escalation Stats
   * @request GET:/routes/notifications/escalation-stats
   */
  export namespace get_escalation_stats {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetEscalationStatsData;
  }

  /**
   * @description Get current exchange rates for all tracked currencies. Returns cached rates from database with intelligent fallback. No external API calls - uses database cache with automatic refresh.
   * @name get_current_rates
   * @summary Get Current Rates
   * @request GET:/routes/exchange-rates/current
   */
  export namespace get_current_rates {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetCurrentRatesData;
  }

  /**
   * @description Get status of exchange rate fetching. Shows when rates were last updated and if they're outdated.
   * @name get_fetch_status
   * @summary Get Fetch Status
   * @request GET:/routes/exchange-rates/status
   */
  export namespace get_fetch_status {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetFetchStatusData;
  }

  /**
   * @description Manually trigger exchange rate fetch from API. Requires authentication (admin only in production).
   * @name fetch_exchange_rates
   * @summary Fetch Exchange Rates
   * @request POST:/routes/exchange-rates/fetch
   */
  export namespace fetch_exchange_rates {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = FetchExchangeRatesData;
  }

  /**
   * @description Manually trigger exchange rate refresh from external APIs. Updates the database cache with latest rates. Requires authentication.
   * @name refresh_exchange_rates
   * @summary Refresh Exchange Rates
   * @request POST:/routes/exchange-rates/refresh
   */
  export namespace refresh_exchange_rates {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RefreshExchangeRatesData;
  }

  /**
   * @description Convert an amount from one currency to another. Uses latest rate if no date specified.
   * @name convert_currency
   * @summary Convert Currency
   * @request POST:/routes/exchange-rates/convert
   */
  export namespace convert_currency {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ConversionRequest;
    export type RequestHeaders = {};
    export type ResponseBody = ConvertCurrencyData;
  }

  /**
   * @description Get historical exchange rates for a currency pair. Useful for charts and analysis.
   * @name get_rate_history
   * @summary Get Rate History
   * @request GET:/routes/exchange-rates/history
   */
  export namespace get_rate_history {
    export type RequestParams = {};
    export type RequestQuery = {
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
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetRateHistoryData;
  }

  /**
   * @description Get all leads currently at risk of stalling. Args: user: Authenticated user include_ai_analysis: Whether to run AI analysis (slower) Returns: List of at-risk leads assigned to the user
   * @name get_at_risk_leads
   * @summary Get At Risk Leads
   * @request GET:/routes/lead-monitoring/at-risk
   */
  export namespace get_at_risk_leads {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Include Ai Analysis
       * @default false
       */
      include_ai_analysis?: boolean;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAtRiskLeadsData;
  }

  /**
   * @description Get overall pipeline health dashboard for assigned leads. Returns: Health metrics and statistics
   * @name get_pipeline_health_report
   * @summary Get Pipeline Health Report
   * @request GET:/routes/lead-monitoring/health-report
   */
  export namespace get_pipeline_health_report {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPipelineHealthReportData;
  }

  /**
   * @description Acknowledge an alert and record action taken. Args: lead_id: ID of the lead the alert is for body: Acknowledgment details user: Authenticated user Returns: Confirmation message
   * @name acknowledge_alert
   * @summary Acknowledge Alert
   * @request POST:/routes/lead-monitoring/acknowledge/{lead_id}
   */
  export namespace acknowledge_alert {
    export type RequestParams = {
      /** Lead Id */
      leadId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = AlertAcknowledgment;
    export type RequestHeaders = {};
    export type ResponseBody = AcknowledgeAlertData;
  }

  /**
   * @description Daily job to monitor lead health and send alerts. Runs at 8 AM daily (before follow-up reminders). Process: 1. Scan all active leads 2. Detect stalled/at-risk leads 3. Run AI analysis for high-priority cases 4. Send alerts to assignees 5. Escalate critical cases to admins Args: authorization: Bearer token for scheduler security Returns: MonitoringRunResult with execution summary
   * @name process_daily_lead_monitoring
   * @summary Process Daily Lead Monitoring
   * @request POST:/routes/lead-monitoring/process-daily-monitoring
   */
  export namespace process_daily_lead_monitoring {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {
      /** Authorization */
      authorization?: string;
    };
    export type ResponseBody = ProcessDailyLeadMonitoringData;
  }

  /**
   * @description Health check for lead monitoring system.
   * @name lead_monitoring_health
   * @summary Lead Monitoring Health
   * @request GET:/routes/lead-monitoring/health
   */
  export namespace lead_monitoring_health {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = LeadMonitoringHealthData;
  }

  /**
   * @description Get Back Office dashboard statistics (super_admin and staff).
   * @name get_dashboard_stats
   * @summary Get Dashboard Stats
   * @request GET:/routes/back-office/dashboard/stats
   */
  export namespace get_dashboard_stats {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetDashboardStatsData;
  }

  /**
   * @description Send an invitation to join as board member or investor.
   * @name create_invitation_endpoint
   * @summary Create Invitation Endpoint
   * @request POST:/routes/back-office/invitations/create
   */
  export namespace create_invitation_endpoint {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateInvitationRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateInvitationEndpointData;
  }

  /**
   * @description List invitations. Super admins see all, others see only invitations they created.
   * @name list_invitations
   * @summary List Invitations
   * @request GET:/routes/back-office/invitations
   */
  export namespace list_invitations {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Status
       * Filter by status: pending, accepted, expired
       */
      status?: string | null;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListInvitationsData;
  }

  /**
   * @description Cancel a pending invitation (super_admin only).
   * @name cancel_invitation
   * @summary Cancel Invitation
   * @request DELETE:/routes/back-office/invitations/{invitation_id}
   */
  export namespace cancel_invitation {
    export type RequestParams = {
      /** Invitation Id */
      invitationId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CancelInvitationData;
  }

  /**
   * @description Resend the invitation email. Requires permission to invite for the role being invited.
   * @name resend_invitation_email
   * @summary Resend Invitation Email
   * @request POST:/routes/back-office/invitations/{invitation_id}/resend-email
   */
  export namespace resend_invitation_email {
    export type RequestParams = {
      /** Invitation Id */
      invitationId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ResendInvitationEmailData;
  }

  /**
   * @description Manually resend an invitation with reminder tracking (super_admin only).
   * @name manual_resend_invitation
   * @summary Manual Resend Invitation
   * @request POST:/routes/back-office/invitations/{invitation_id}/resend
   */
  export namespace manual_resend_invitation {
    export type RequestParams = {
      /** Invitation Id */
      invitationId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ManualResendInvitationData;
  }

  /**
   * @description Sync pending invitations with existing board members by matching emails (super_admin only).
   * @name sync_invitations_with_board_members
   * @summary Sync Invitations With Board Members
   * @request POST:/routes/back-office/invitations/sync-with-board-members
   */
  export namespace sync_invitations_with_board_members {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = SyncInvitationsWithBoardMembersData;
  }

  /**
   * @description Manually appoint a board member or accept invitation and appoint (super_admin only).
   * @name appoint_board_member_endpoint
   * @summary Appoint Board Member Endpoint
   * @request POST:/routes/back-office/board/appoint
   */
  export namespace appoint_board_member_endpoint {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = AppointBoardMemberRequest;
    export type RequestHeaders = {};
    export type ResponseBody = AppointBoardMemberEndpointData;
  }

  /**
   * @description List all board members (super_admin only).
   * @name list_board_members
   * @summary List Board Members
   * @request GET:/routes/back-office/board/members
   */
  export namespace list_board_members {
    export type RequestParams = {};
    export type RequestQuery = {
      /** Status */
      status?: string | null;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListBoardMembersData;
  }

  /**
   * @description Update a board member's details (super_admin only).
   * @name update_board_member_endpoint
   * @summary Update Board Member Endpoint
   * @request PUT:/routes/back-office/board/members/{member_user_id}
   */
  export namespace update_board_member_endpoint {
    export type RequestParams = {
      /** Member User Id */
      memberUserId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateBoardMemberRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateBoardMemberEndpointData;
  }

  /**
   * @description Remove a board member (super_admin only).
   * @name remove_board_member_endpoint
   * @summary Remove Board Member Endpoint
   * @request DELETE:/routes/back-office/board/members/{member_user_id}
   */
  export namespace remove_board_member_endpoint {
    export type RequestParams = {
      /** Member User Id */
      memberUserId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RemoveBoardMemberEndpointData;
  }

  /**
   * @description Map a registered user to a pending board member appointment (super_admin only).
   * @name map_registered_user_to_board_member
   * @summary Map Registered User To Board Member
   * @request POST:/routes/back-office/board/map-user
   */
  export namespace map_registered_user_to_board_member {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = MapUserRequest;
    export type RequestHeaders = {};
    export type ResponseBody = MapRegisteredUserToBoardMemberData;
  }

  /**
   * @description Process pending invitations and send reminders where needed. Sends reminders every 36 hours until invitation is actioned. (super_admin only)
   * @name process_invitation_reminders
   * @summary Process Invitation Reminders
   * @request POST:/routes/back-office/invitations/process-reminders
   */
  export namespace process_invitation_reminders {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ProcessInvitationRemindersData;
  }

  /**
   * @description Initiate Google Drive OAuth flow by generating authorization URL.
   * @name get_auth_url
   * @summary Get Auth Url
   * @request GET:/routes/data-room/admin/google-drive-oauth/auth-url
   */
  export namespace get_auth_url {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAuthUrlData;
  }

  /**
   * @description Handle OAuth callback from Google and exchange code for tokens.
   * @name google_drive_callback
   * @summary Google Drive Callback
   * @request GET:/routes/data-room/admin/google-drive-oauth/callback
   */
  export namespace google_drive_callback {
    export type RequestParams = {};
    export type RequestQuery = {
      /** Code */
      code: string;
      /** State */
      state: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GoogleDriveCallbackData;
  }

  /**
   * @description Get current Google Drive configuration with auto-refresh.
   * @name get_config
   * @summary Get Config
   * @request GET:/routes/data-room/admin/google-drive-oauth/config
   */
  export namespace get_config {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetConfigData;
  }

  /**
   * @description Update Google Drive configuration settings.
   * @name update_config
   * @summary Update Config
   * @request POST:/routes/data-room/admin/google-drive-oauth/config
   */
  export namespace update_config {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = UpdateConfigRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateConfigData;
  }

  /**
   * @description Disconnect Google Drive integration by removing tokens.
   * @name disconnect
   * @summary Disconnect
   * @request DELETE:/routes/data-room/admin/google-drive-oauth/disconnect
   */
  export namespace disconnect {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DisconnectData;
  }

  /**
   * @description Create a new short link for campaigns (email/SMS reminders). The link will redirect to the target path and can be configured with: - Expiry time (default 7 days) - Maximum uses (optional, for single-use links) - Custom metadata for analytics
   * @name mint_short_link
   * @summary Mint Short Link
   * @request POST:/routes/links/mint
   */
  export namespace mint_short_link {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = MintShortLinkRequest;
    export type RequestHeaders = {};
    export type ResponseBody = MintShortLinkData;
  }

  /**
   * @description Redirect handler for short links. Validates token, logs analytics, and redirects to target URL. Enforces expiry and max_uses constraints.
   * @name redirect_short_link
   * @summary Redirect Short Link
   * @request GET:/routes/l/{token}
   */
  export namespace redirect_short_link {
    export type RequestParams = {
      /** Token */
      token: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RedirectShortLinkData;
  }

  /**
   * @description Get all board members who don't have a valid user_id mapping. Only accessible by admin users.
   * @name get_unmapped_board_members
   * @summary Get Unmapped Board Members
   * @request GET:/routes/board-mapping/unmapped-members
   */
  export namespace get_unmapped_board_members {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Env
       * @default "dev"
       */
      env?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetUnmappedBoardMembersData;
  }

  /**
   * @description Get all registered users who could be mapped to board members. Only accessible by admin users.
   * @name get_available_users
   * @summary Get Available Users
   * @request GET:/routes/board-mapping/available-users
   */
  export namespace get_available_users {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Env
       * @default "dev"
       */
      env?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAvailableUsersData;
  }

  /**
   * @description Manually map a board member to a registered user. Only accessible by admin users.
   * @name map_board_member_manually
   * @summary Map Board Member Manually
   * @request POST:/routes/board-mapping/map-manually
   */
  export namespace map_board_member_manually {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Env
       * @default "dev"
       */
      env?: string;
    };
    export type RequestBody = ManualMappingRequest;
    export type RequestHeaders = {};
    export type ResponseBody = MapBoardMemberManuallyData;
  }

  /**
   * @description Automatically sync unmapped board members with registered users by matching email addresses. Can be called manually or scheduled daily. Only accessible by admin users.
   * @name auto_sync_board_members
   * @summary Auto Sync Board Members
   * @request POST:/routes/board-mapping/auto-sync
   */
  export namespace auto_sync_board_members {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Env
       * @default "dev"
       */
      env?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = AutoSyncBoardMembersData;
  }

  /**
   * @description Check if the logged-in user has an unmapped board member record and automatically map it. Called during profile completion flow. This handles the automatic sync for users who were added as board members before they registered in the system.
   * @name map_board_member_on_login
   * @summary Map Board Member On Login
   * @request POST:/routes/board-mapping/map-on-login
   */
  export namespace map_board_member_on_login {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Env
       * @default "dev"
       */
      env?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = MapBoardMemberOnLoginData;
  }

  /**
   * @description Get all dividend payments for the authenticated user. Optionally filter by status (pending, paid, failed, cancelled) or year.
   * @name get_my_dividends
   * @summary Get My Dividends
   * @request GET:/routes/my-dividends
   */
  export namespace get_my_dividends {
    export type RequestParams = {};
    export type RequestQuery = {
      /** Status */
      status?: string | null;
      /** Year */
      year?: number | null;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetMyDividendsData;
  }

  /**
   * @description Get comprehensive dividend summary and tax report for the user. Includes current year totals and yearly breakdown for tax purposes.
   * @name get_dividend_summary
   * @summary Get Dividend Summary
   * @request GET:/routes/summary
   */
  export namespace get_dividend_summary {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetDividendSummaryData;
  }

  /**
   * @description Get user's current dividend reinvestment preferences.
   * @name get_reinvest_settings
   * @summary Get Reinvest Settings
   * @request GET:/routes/reinvest-settings
   */
  export namespace get_reinvest_settings {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetReinvestSettingsData;
  }

  /**
   * @description Update user's dividend reinvestment preferences. Allows users to enable auto-reinvestment, set risk tolerance, and configure notifications.
   * @name update_reinvest_settings
   * @summary Update Reinvest Settings
   * @request POST:/routes/reinvest-settings
   */
  export namespace update_reinvest_settings {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ReinvestmentSettings;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateReinvestSettingsData;
  }

  /**
   * @description Get available investment options for board members or invited board members.
   * @name get_investment_options
   * @summary Get Investment Options
   * @request GET:/routes/board/investment-options
   */
  export namespace get_investment_options {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetInvestmentOptionsData;
  }

  /**
   * @description Create a share subscription for board member or invited board member.
   * @name create_board_investment
   * @summary Create Board Investment
   * @request POST:/routes/board/invest
   */
  export namespace create_board_investment {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = InvestmentRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateBoardInvestmentData;
  }

  /**
   * @description Get logged-in board member's or invited board member's investment details.
   * @name get_my_investment
   * @summary Get My Investment
   * @request GET:/routes/board/my-investment
   */
  export namespace get_my_investment {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetMyInvestmentData;
  }

  /**
   * @description Get all board member investments (super_admin only).
   * @name get_all_board_investments
   * @summary Get All Board Investments
   * @request GET:/routes/back-office/board/investments/all
   */
  export namespace get_all_board_investments {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAllBoardInvestmentsData;
  }

  /**
   * @description Create a share subscription on behalf of a board member (super_admin only).
   * @name create_investment_on_behalf
   * @summary Create Investment On Behalf
   * @request POST:/routes/back-office/board/investments/create
   */
  export namespace create_investment_on_behalf {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateOnBehalfRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateInvestmentOnBehalfData;
  }

  /**
   * @description Update a board member's share subscription (super_admin only).
   * @name update_board_investment
   * @summary Update Board Investment
   * @request PUT:/routes/back-office/board/investments/{subscription_id}/update
   */
  export namespace update_board_investment {
    export type RequestParams = {
      /** Subscription Id */
      subscriptionId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateSharesRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateBoardInvestmentData;
  }

  /**
   * @description Transfer shares from one class to another for a board member (super_admin only).
   * @name transfer_shares_between_classes
   * @summary Transfer Shares Between Classes
   * @request POST:/routes/back-office/board/investments/{subscription_id}/transfer-class
   */
  export namespace transfer_shares_between_classes {
    export type RequestParams = {
      /** Subscription Id */
      subscriptionId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = TransferClassRequest;
    export type RequestHeaders = {};
    export type ResponseBody = TransferSharesBetweenClassesData;
  }

  /**
   * @description Transfer shares from one board member to another (super_admin only).
   * @name transfer_shares_between_members
   * @summary Transfer Shares Between Members
   * @request POST:/routes/back-office/board/investments/{subscription_id}/transfer-member
   */
  export namespace transfer_shares_between_members {
    export type RequestParams = {
      /** Subscription Id */
      subscriptionId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = TransferMemberRequest;
    export type RequestHeaders = {};
    export type ResponseBody = TransferSharesBetweenMembersData;
  }

  /**
   * @description Cancel a board member's subscription and return shares to pool (super_admin only).
   * @name cancel_board_investment
   * @summary Cancel Board Investment
   * @request DELETE:/routes/back-office/board/investments/{subscription_id}/cancel
   */
  export namespace cancel_board_investment {
    export type RequestParams = {
      /** Subscription Id */
      subscriptionId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CancelBoardInvestmentData;
  }

  /**
   * @description Record payment for a board investment and generate receipt (super_admin only).
   * @name record_board_member_payment
   * @summary Record Board Member Payment
   * @request POST:/routes/back-office/board/investments/{subscription_id}/record-payment
   */
  export namespace record_board_member_payment {
    export type RequestParams = {
      /** Subscription Id */
      subscriptionId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = BodyRecordBoardMemberPayment;
    export type RequestHeaders = {};
    export type ResponseBody = RecordBoardMemberPaymentData;
  }

  /**
   * @description Download receipt for a completed board investment (super_admin only).
   * @name download_receipt
   * @summary Download Receipt
   * @request GET:/routes/back-office/board/investments/{subscription_id}/download-receipt
   */
  export namespace download_receipt {
    export type RequestParams = {
      /** Subscription Id */
      subscriptionId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DownloadReceiptData;
  }

  /**
   * @description Get user's messages with pagination and filtering.
   * @name list_messages
   * @summary List Messages
   * @request GET:/routes/messages
   */
  export namespace list_messages {
    export type RequestParams = {};
    export type RequestQuery = {
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
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListMessagesData;
  }

  /**
   * @description Get count of pending messages for user.
   * @name get_pending_count
   * @summary Get Pending Count
   * @request GET:/routes/pending-count
   */
  export namespace get_pending_count {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPendingCountData;
  }

  /**
   * @description Execute the CTA action for a message (e.g., accept invitation, navigate to page).
   * @name execute_message_cta
   * @summary Execute Message Cta
   * @request POST:/routes/execute/{message_id}
   */
  export namespace execute_message_cta {
    export type RequestParams = {
      /** Message Id */
      messageId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ExecuteMessageCtaData;
  }

  /**
   * @description Dismiss/archive a message.
   * @name dismiss_message
   * @summary Dismiss Message
   * @request POST:/routes/dismiss/{message_id}
   */
  export namespace dismiss_message {
    export type RequestParams = {
      /** Message Id */
      messageId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DismissMessageData;
  }

  /**
   * @description Create a welcome message for new users to complete their profile.
   * @name create_welcome_message
   * @summary Create Welcome Message
   * @request POST:/routes/messages/create-welcome
   */
  export namespace create_welcome_message {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CreateWelcomeMessageData;
  }

  /**
   * @description Create or update a profile completion reminder message for user.
   * @name create_profile_completion_reminder
   * @summary Create Profile Completion Reminder
   * @request POST:/routes/messages/create-profile-reminder
   */
  export namespace create_profile_completion_reminder {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CreateProfileCompletionReminderData;
  }

  /**
   * @description Create a comprehensive welcome message for new board members with onboarding guidance.
   * @name create_board_welcome_message
   * @summary Create Board Welcome Message
   * @request POST:/routes/messages/create-board-welcome
   */
  export namespace create_board_welcome_message {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CreateBoardWelcomeMessageData;
  }

  /**
   * @description Provides the latest exchange rates with a 5% markup applied against LSL. The base currency is Lesotho Loti (LSL).
   * @name get_all_rates
   * @summary Get All Rates
   * @request GET:/routes/exchange/rates
   */
  export namespace get_all_rates {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAllRatesData;
  }

  /**
   * @description List all issued certificates with advanced filtering (Back Office). Supports filtering by status, share class, and shareholder name.
   * @name list_certificates
   * @summary List Certificates
   * @request GET:/routes/certificate-management/certificates
   */
  export namespace list_certificates {
    export type RequestParams = {};
    export type RequestQuery = {
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
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListCertificatesData;
  }

  /**
   * @description Get certificate details by ID. Users can view their own certificates, back office can view any.
   * @name get_certificate
   * @summary Get Certificate
   * @request GET:/routes/certificate-management/certificates/{certificate_id}
   */
  export namespace get_certificate {
    export type RequestParams = {
      /** Certificate Id */
      certificateId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetCertificateData;
  }

  /**
   * @description Get all certificates for a specific shareholder. Users can view their own certificates, back office can view any.
   * @name get_shareholder_certificates
   * @summary Get Shareholder Certificates
   * @request GET:/routes/certificate-management/shareholder/{shareholder_id}/certificates
   */
  export namespace get_shareholder_certificates {
    export type RequestParams = {
      /** Shareholder Id */
      shareholderId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetShareholderCertificatesData;
  }

  /**
   * @description Update certificate status (Back Office only). Used for revoking certificates or reactivating them.
   * @name update_certificate_status
   * @summary Update Certificate Status
   * @request PATCH:/routes/certificate-management/certificates/{certificate_id}/status
   */
  export namespace update_certificate_status {
    export type RequestParams = {
      /** Certificate Id */
      certificateId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateCertificateStatusRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateCertificateStatusData;
  }

  /**
   * @description Verify and view certificate by verification token (PUBLIC - no auth required). Used by QR code scanning and public verification.
   * @name verify_certificate_by_token
   * @summary Verify Certificate By Token
   * @request GET:/routes/certificate-management/verify/{verification_token}
   */
  export namespace verify_certificate_by_token {
    export type RequestParams = {
      /** Verification Token */
      verificationToken: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = VerifyCertificateByTokenData;
  }

  /**
   * @description Get certificate statistics for back office dashboard.
   * @name get_certificate_statistics
   * @summary Get Certificate Statistics
   * @request GET:/routes/certificate-management/statistics
   */
  export namespace get_certificate_statistics {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetCertificateStatisticsData;
  }

  /**
   * @description User requests a certificate for their paid subscription. Only works for subscriptions they own and that are fully paid.
   * @name request_certificate
   * @summary Request Certificate
   * @request POST:/routes/certificate-requests/request-certificate
   */
  export namespace request_certificate {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = RequestCertificateRequest;
    export type RequestHeaders = {};
    export type ResponseBody = RequestCertificateData;
  }

  /**
   * @description Get all certificate requests for the current user.
   * @name get_my_requests
   * @summary Get My Requests
   * @request GET:/routes/certificate-requests/my-requests
   */
  export namespace get_my_requests {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetMyRequestsData;
  }

  /**
   * @description Cancel a pending certificate request. Users can only cancel their own pending requests.
   * @name cancel_request
   * @summary Cancel Request
   * @request DELETE:/routes/certificate-requests/cancel-request/{request_id}
   */
  export namespace cancel_request {
    export type RequestParams = {
      /** Request Id */
      requestId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CancelRequestData;
  }

  /**
   * @description Get all pending certificate requests for back office processing. Includes subscription and shareholder details. Admin/back-office only.
   * @name get_pending_queue
   * @summary Get Pending Queue
   * @request GET:/routes/certificate-requests/pending-queue
   */
  export namespace get_pending_queue {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPendingQueueData;
  }

  /**
   * @description View access logs with filters (admin only)
   * @name get_access_logs
   * @summary Get Access Logs
   * @request GET:/routes/data-room/audit/access-logs
   */
  export namespace get_access_logs {
    export type RequestParams = {};
    export type RequestQuery = {
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
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAccessLogsData;
  }

  /**
   * @description View all signed agreements (admin only)
   * @name get_all_agreements
   * @summary Get All Agreements
   * @request GET:/routes/data-room/audit/agreements
   */
  export namespace get_all_agreements {
    export type RequestParams = {};
    export type RequestQuery = {
      /** Agreement Type */
      agreement_type?: string | null;
      /**
       * Limit
       * @default 100
       */
      limit?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAllAgreementsData;
  }

  /**
   * @description Get users who haven't signed all agreements (admin only)
   * @name get_pending_agreements
   * @summary Get Pending Agreements
   * @request GET:/routes/data-room/audit/pending-agreements
   */
  export namespace get_pending_agreements {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPendingAgreementsData;
  }

  /**
   * @description Get document access statistics (admin only)
   * @name get_document_stats
   * @summary Get Document Stats
   * @request GET:/routes/data-room/audit/document-stats
   */
  export namespace get_document_stats {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetDocumentStatsData;
  }

  /**
   * @description Get all Letter of Intent submissions (admin only)
   * @name get_loi_submissions
   * @summary Get Loi Submissions
   * @request GET:/routes/data-room/audit/loi-submissions
   */
  export namespace get_loi_submissions {
    export type RequestParams = {};
    export type RequestQuery = {
      /** Status */
      status?: string | null;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetLoiSubmissionsData;
  }

  /**
   * @description Review and approve/reject LOI submission (admin only)
   * @name review_loi_submission
   * @summary Review Loi Submission
   * @request PUT:/routes/data-room/audit/loi-submissions/{submission_id}/review
   */
  export namespace review_loi_submission {
    export type RequestParams = {
      /** Submission Id */
      submissionId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = LOIReviewRequest;
    export type RequestHeaders = {};
    export type ResponseBody = ReviewLoiSubmissionData;
  }

  /**
   * @description Get subscription analytics (super_admin only)
   * @name analytics_get_subscription_analytics
   * @summary Analytics Get Subscription Analytics
   * @request GET:/routes/subscriptions/analytics/analytics
   */
  export namespace analytics_get_subscription_analytics {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = AnalyticsGetSubscriptionAnalyticsData;
  }

  /**
   * @description Get public app configuration safe to expose to frontend. This endpoint is intentionally OPEN (no auth required) because: - These values are public and visible in the service worker anyway - Frontend needs access before user authentication - No sensitive data is exposed
   * @name get_public_config
   * @summary Get Public Config
   * @request GET:/routes/config/public
   */
  export namespace get_public_config {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPublicConfigData;
  }

  /**
   * @description Record a payment for a subscription. Updates subscription status based on payment progress. Automatically generates receipt and assigns investor role if fully paid.
   * @name payments_record_payment
   * @summary Payments Record Payment
   * @request POST:/routes/subscriptions/payments/record-payment
   */
  export namespace payments_record_payment {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PaymentRecord;
    export type RequestHeaders = {};
    export type ResponseBody = PaymentsRecordPaymentData;
  }

  /**
   * @description Upload payment proof for a subscription. Stores file and marks subscription as awaiting verification.
   * @name payments_upload_payment_proof
   * @summary Payments Upload Payment Proof
   * @request POST:/routes/subscriptions/payments/upload-payment-proof
   */
  export namespace payments_upload_payment_proof {
    export type RequestParams = {};
    export type RequestQuery = {
      /** Subscription Id */
      subscription_id: string;
    };
    export type RequestBody = BodyPaymentsUploadPaymentProof;
    export type RequestHeaders = {};
    export type ResponseBody = PaymentsUploadPaymentProofData;
  }

  /**
   * @description Verify uploaded payment proof (admin/back-office only). Approves or rejects the payment proof.
   * @name payments_verify_payment
   * @summary Payments Verify Payment
   * @request POST:/routes/subscriptions/payments/verify-payment
   */
  export namespace payments_verify_payment {
    export type RequestParams = {};
    export type RequestQuery = {
      /** Subscription Id */
      subscription_id: string;
      /** Approved */
      approved: boolean;
      /** Notes */
      notes?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PaymentsVerifyPaymentData;
  }

  /**
   * @description Get payment history for a subscription. Shows all payments made towards the subscription.
   * @name payments_get_payment_history
   * @summary Payments Get Payment History
   * @request GET:/routes/subscriptions/payments/payment-history/{subscription_id}
   */
  export namespace payments_get_payment_history {
    export type RequestParams = {
      /** Subscription Id */
      subscriptionId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PaymentsGetPaymentHistoryData;
  }

  /**
   * @description Process payment deadline reminders. Sends reminders at: 24h after creation, 7 days before, 3 days before, 1 day before deadline. Includes both email and bell notifications. (super_admin only)
   * @name payments_process_payment_reminders
   * @summary Payments Process Payment Reminders
   * @request POST:/routes/subscriptions/payments/process-payment-reminders
   */
  export namespace payments_process_payment_reminders {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PaymentsProcessPaymentRemindersData;
  }

  /**
   * @description Seed test users for development. This endpoint creates user profiles and assigns roles for test users that have been created in Stack Auth.
   * @name seed_test_users
   * @summary Seed Test Users
   * @request POST:/routes/dev-seed/seed-test-users
   */
  export namespace seed_test_users {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = SeedTestUsersData;
  }

  /**
   * @description Get information about test users. Returns the list of test users with their credentials.
   * @name get_test_user_info
   * @summary Get Test User Info
   * @request GET:/routes/dev-seed/test-user-info
   */
  export namespace get_test_user_info {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetTestUserInfoData;
  }

  /**
   * @description Creates a profile for an authenticated test user based on their email. Called during automated test user setup.
   * @name create_profile_for_test_user
   * @summary Create Profile For Test User
   * @request POST:/routes/dev-seed/create-profile-for-test-user
   */
  export namespace create_profile_for_test_user {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CreateProfileForTestUserData;
  }

  /**
   * @description Get published achievements for public timeline (newest first)
   * @name get_timeline
   * @summary Get Timeline
   * @request GET:/routes/achievements/timeline
   */
  export namespace get_timeline {
    export type RequestParams = {};
    export type RequestQuery = {
      /** Category */
      category?: string | null;
      /**
       * Limit
       * @default 100
       */
      limit?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetTimelineData;
  }

  /**
   * @description List all achievements for back office management
   * @name list_all_achievements
   * @summary List All Achievements
   * @request GET:/routes/achievements/admin
   */
  export namespace list_all_achievements {
    export type RequestParams = {};
    export type RequestQuery = {
      /** Category */
      category?: string | null;
      /** Published */
      published?: boolean | null;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListAllAchievementsData;
  }

  /**
   * @description Create a new achievement
   * @name create_achievement
   * @summary Create Achievement
   * @request POST:/routes/achievements/admin
   */
  export namespace create_achievement {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateAchievementRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateAchievementData;
  }

  /**
   * @description Update an existing achievement
   * @name update_achievement
   * @summary Update Achievement
   * @request PUT:/routes/achievements/admin/{achievement_id}
   */
  export namespace update_achievement {
    export type RequestParams = {
      /** Achievement Id */
      achievementId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateAchievementRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateAchievementData;
  }

  /**
   * @description Delete an achievement
   * @name delete_achievement
   * @summary Delete Achievement
   * @request DELETE:/routes/achievements/admin/{achievement_id}
   */
  export namespace delete_achievement {
    export type RequestParams = {
      /** Achievement Id */
      achievementId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteAchievementData;
  }

  /**
   * @description Upload an image for an achievement
   * @name upload_achievement_image
   * @summary Upload Achievement Image
   * @request POST:/routes/achievements/admin/{achievement_id}/upload-image
   */
  export namespace upload_achievement_image {
    export type RequestParams = {
      /** Achievement Id */
      achievementId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = BodyUploadAchievementImage;
    export type RequestHeaders = {};
    export type ResponseBody = UploadAchievementImageData;
  }

  /**
   * @description Approve a low-confidence document and move it to category folder.
   * @name approve_document
   * @summary Approve Document
   * @request POST:/routes/data-room/admin/google-drive-documents/approve/{log_id}
   */
  export namespace approve_document {
    export type RequestParams = {
      /** Log Id */
      logId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = ApproveDocumentRequest;
    export type RequestHeaders = {};
    export type ResponseBody = ApproveDocumentData;
  }

  /**
   * @description Manually override AI categorization decision.
   * @name override_document
   * @summary Override Document
   * @request POST:/routes/data-room/admin/google-drive-documents/override/{log_id}
   */
  export namespace override_document {
    export type RequestParams = {
      /** Log Id */
      logId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = OverrideDocumentRequest;
    export type RequestHeaders = {};
    export type ResponseBody = OverrideDocumentData;
  }

  /**
   * @description Get processing statistics and metrics.
   * @name get_processing_stats
   * @summary Get Processing Stats
   * @request GET:/routes/data-room/admin/google-drive-documents/stats
   */
  export namespace get_processing_stats {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetProcessingStatsData;
  }

  /**
   * @description Send investment invitation to a lead. Creates a tracked invitation link and queues email. Requires super_admin or back_office role.
   * @name send_invitation
   * @summary Send Invitation
   * @request POST:/routes/investor-invitations/send
   */
  export namespace send_invitation {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = SendInvitationRequest;
    export type RequestHeaders = {};
    export type ResponseBody = SendInvitationData;
  }

  /**
   * @description Send invitations to multiple leads at once. Requires super_admin or back_office role.
   * @name bulk_send_invitations
   * @summary Bulk Send Invitations
   * @request POST:/routes/investor-invitations/bulk-send
   */
  export namespace bulk_send_invitations {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = BulkSendInvitationRequest;
    export type RequestHeaders = {};
    export type ResponseBody = BulkSendInvitationsData;
  }

  /**
   * @description List all investor invitations with optional filtering. Requires super_admin or back_office role.
   * @name list_investor_invitations
   * @summary List Investor Invitations
   * @request POST:/routes/investor-invitations/list
   */
  export namespace list_investor_invitations {
    export type RequestParams = {};
    export type RequestQuery = {
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
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListInvestorInvitationsData;
  }

  /**
   * @description Track when an invitation email is opened. This endpoint is called by embedding a tracking pixel in the email.
   * @name track_investor_invitation_open
   * @summary Track Investor Invitation Open
   * @request POST:/routes/investor-invitations/track-open/{tracking_token}
   */
  export namespace track_investor_invitation_open {
    export type RequestParams = {
      /** Tracking Token */
      trackingToken: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = TrackInvestorInvitationOpenData;
  }

  /**
   * @description Track when an invitation link is clicked. This should be called when the user clicks the subscription link.
   * @name track_link_click
   * @summary Track Link Click
   * @request POST:/routes/investor-invitations/track-click/{tracking_token}
   */
  export namespace track_link_click {
    export type RequestParams = {
      /** Tracking Token */
      trackingToken: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = TrackLinkClickData;
  }

  /**
   * @description Get invitation statistics and engagement metrics. Requires super_admin or back_office role.
   * @name get_invitation_stats
   * @summary Get Invitation Stats
   * @request GET:/routes/investor-invitations/stats
   */
  export namespace get_invitation_stats {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetInvitationStatsData;
  }

  /**
   * @description Scan dump folder and process new documents.
   * @name trigger_processing
   * @summary Trigger Processing
   * @request POST:/routes/data-room/admin/google-drive-processing/process
   */
  export namespace trigger_processing {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = TriggerProcessingData;
  }

  /**
   * @description Get documents in processing queue.
   * @name get_queue
   * @summary Get Queue
   * @request GET:/routes/data-room/admin/google-drive-processing/queue
   */
  export namespace get_queue {
    export type RequestParams = {};
    export type RequestQuery = {
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
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetQueueData;
  }

  /**
   * @description Get document processing history logs.
   * @name get_processing_logs
   * @summary Get Processing Logs
   * @request GET:/routes/data-room/admin/google-drive-processing/processing-logs
   */
  export namespace get_processing_logs {
    export type RequestParams = {};
    export type RequestQuery = {
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
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetProcessingLogsData;
  }

  /**
   * @description Get customer dashboard overview
   * @name get_dashboard
   * @summary Get Dashboard
   * @request GET:/routes/customer-banking/dashboard
   */
  export namespace get_dashboard {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetDashboardData;
  }

  /**
   * @description List all customer accounts
   * @name list_accounts
   * @summary List Accounts
   * @request GET:/routes/customer-banking/accounts
   */
  export namespace list_accounts {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListAccountsData;
  }

  /**
   * @description Get account details
   * @name get_account
   * @summary Get Account
   * @request GET:/routes/customer-banking/accounts/{account_id}
   */
  export namespace get_account {
    export type RequestParams = {
      /** Account Id */
      accountId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAccountData;
  }

  /**
   * @description Search transactions with filters
   * @name search_transactions
   * @summary Search Transactions
   * @request POST:/routes/customer-banking/transactions/search
   */
  export namespace search_transactions {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = TransactionFilters;
    export type RequestHeaders = {};
    export type ResponseBody = SearchTransactionsData;
  }

  /**
   * @description Create a transfer (internal, external, or international)
   * @name create_transfer
   * @summary Create Transfer
   * @request POST:/routes/customer-banking/transfers
   */
  export namespace create_transfer {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = TransferRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateTransferData;
  }

  /**
   * @description List all beneficiaries
   * @name list_beneficiaries
   * @summary List Beneficiaries
   * @request GET:/routes/customer-banking/beneficiaries
   */
  export namespace list_beneficiaries {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListBeneficiariesData;
  }

  /**
   * @description Add a new beneficiary
   * @name add_beneficiary
   * @summary Add Beneficiary
   * @request POST:/routes/customer-banking/beneficiaries
   */
  export namespace add_beneficiary {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = BeneficiaryRequest;
    export type RequestHeaders = {};
    export type ResponseBody = AddBeneficiaryData;
  }

  /**
   * @description Delete a beneficiary
   * @name delete_beneficiary
   * @summary Delete Beneficiary
   * @request DELETE:/routes/customer-banking/beneficiaries/{beneficiary_id}
   */
  export namespace delete_beneficiary {
    export type RequestParams = {
      /** Beneficiary Id */
      beneficiaryId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteBeneficiaryData;
  }

  /**
   * @description Create a bill payment
   * @name create_bill_payment
   * @summary Create Bill Payment
   * @request POST:/routes/customer-banking/bill-payments
   */
  export namespace create_bill_payment {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = BillPaymentRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateBillPaymentData;
  }

  /**
   * @description List bill payments
   * @name list_bill_payments
   * @summary List Bill Payments
   * @request GET:/routes/customer-banking/bill-payments
   */
  export namespace list_bill_payments {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Limit
       * @default 50
       */
      limit?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListBillPaymentsData;
  }

  /**
   * @description List all loans
   * @name list_loans
   * @summary List Loans
   * @request GET:/routes/customer-banking/loans
   */
  export namespace list_loans {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListLoansData;
  }

  /**
   * @description Get loan details
   * @name get_loan
   * @summary Get Loan
   * @request GET:/routes/customer-banking/loans/{loan_id}
   */
  export namespace get_loan {
    export type RequestParams = {
      /** Loan Id */
      loanId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetLoanData;
  }

  /**
   * @description Calculate loan payment
   * @name calculate_loan
   * @summary Calculate Loan
   * @request POST:/routes/customer-banking/loans/calculator
   */
  export namespace calculate_loan {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = LoanCalculatorRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CalculateLoanData;
  }

  /**
   * @description List all cards
   * @name list_cards
   * @summary List Cards
   * @request GET:/routes/customer-banking/cards
   */
  export namespace list_cards {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListCardsData;
  }

  /**
   * @description Block or unblock a card
   * @name card_action
   * @summary Card Action
   * @request POST:/routes/customer-banking/cards/action
   */
  export namespace card_action {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CardActionRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CardActionData;
  }

  /**
   * @description Update card spending limits
   * @name update_card_limits
   * @summary Update Card Limits
   * @request POST:/routes/customer-banking/cards/update-limits
   */
  export namespace update_card_limits {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = UpdateCardLimitsRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateCardLimitsData;
  }

  /**
   * @description Manually trigger 24-hour onboarding reminders for board members. Scans for board members with: - Incomplete onboarding (based on role assignment) - Last activity > 24 hours ago - No reminder sent in last 24 hours Sends reminders via: - Email (always enabled) - SMS (if Twilio configured) - WhatsApp (if Meta API configured) Returns counts and status per channel.
   * @name run_onboarding_reminders
   * @summary Run Onboarding Reminders
   * @request POST:/routes/reminders/run-onboarding
   */
  export namespace run_onboarding_reminders {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RunOnboardingRemindersData;
  }

  /**
   * @description Complete user registration after Stack Auth signup. Stores extended profile data in our database. Note: User must be authenticated via Stack Auth first.
   * @name register_user
   * @summary Register User
   * @request POST:/routes/users/register
   */
  export namespace register_user {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = UserRegistrationRequest;
    export type RequestHeaders = {};
    export type ResponseBody = RegisterUserData;
  }

  /**
   * @description Get the current user's profile
   * @name get_user_profile
   * @summary Get User Profile
   * @request GET:/routes/users/profile
   */
  export namespace get_user_profile {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetUserProfileData;
  }

  /**
   * @description Update the current user's profile with optimistic concurrency control
   * @name update_user_profile
   * @summary Update User Profile
   * @request PUT:/routes/users/profile
   */
  export namespace update_user_profile {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = UserProfileUpdate;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateUserProfileData;
  }

  /**
   * @description Get comprehensive user details by user ID (admin use)
   * @name get_user_profile_by_id
   * @summary Get User Profile By Id
   * @request GET:/routes/users/profile/{user_id}
   */
  export namespace get_user_profile_by_id {
    export type RequestParams = {
      /** User Id */
      userId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetUserProfileByIdData;
  }

  /**
   * @description Record that the user dismissed the profile completion modal
   * @name dismiss_profile_completion
   * @summary Dismiss Profile Completion
   * @request POST:/routes/users/dismiss-profile-completion
   */
  export namespace dismiss_profile_completion {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DismissProfileCompletionData;
  }

  /**
   * @description Check if user's profile meets completeness requirements
   * @name check_profile_completeness
   * @summary Check Profile Completeness
   * @request POST:/routes/users/profile/completeness
   */
  export namespace check_profile_completeness {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CheckProfileCompletenessPayload;
    export type RequestHeaders = {};
    export type ResponseBody = CheckProfileCompletenessData;
  }

  /**
   * @description Upload CV/Resume document for the user profile
   * @name upload_cv
   * @summary Upload Cv
   * @request POST:/routes/users/profile/upload-cv
   */
  export namespace upload_cv {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = BodyUploadCv;
    export type RequestHeaders = {};
    export type ResponseBody = UploadCvData;
  }

  /**
   * @description Upload profile picture for the user
   * @name upload_profile_picture
   * @summary Upload Profile Picture
   * @request POST:/routes/users/profile/upload-profile-picture
   */
  export namespace upload_profile_picture {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = BodyUploadProfilePicture;
    export type RequestHeaders = {};
    export type ResponseBody = UploadProfilePictureData;
  }

  /**
   * @description Validate identity document and extract data (for SA IDs)
   * @name validate_identity
   * @summary Validate Identity
   * @request POST:/routes/users/validate-identity
   */
  export namespace validate_identity {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ValidateIdentityPayload;
    export type RequestHeaders = {};
    export type ResponseBody = ValidateIdentityData;
  }

  /**
   * @description List all users with pagination and optional filtering. Super admin only. Includes role information for each user.
   * @name list_all_users
   * @summary List All Users
   * @request GET:/routes/users/admin/list
   */
  export namespace list_all_users {
    export type RequestParams = {};
    export type RequestQuery = {
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
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListAllUsersData;
  }

  /**
   * @description Search users by name, email, or phone. Super admin only.
   * @name search_users
   * @summary Search Users
   * @request GET:/routes/users/admin/search
   */
  export namespace search_users {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Query
       * @minLength 1
       */
      query: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = SearchUsersData;
  }

  /**
   * @description Suspend a user account. Super admin only. Cannot suspend yourself.
   * @name suspend_user
   * @summary Suspend User
   * @request POST:/routes/users/admin/{user_id}/suspend
   */
  export namespace suspend_user {
    export type RequestParams = {
      /** User Id */
      userId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = SuspendUserRequest;
    export type RequestHeaders = {};
    export type ResponseBody = SuspendUserData;
  }

  /**
   * @description Reactivate a suspended user account. Super admin only.
   * @name reactivate_user
   * @summary Reactivate User
   * @request POST:/routes/users/admin/{user_id}/reactivate
   */
  export namespace reactivate_user {
    export type RequestParams = {
      /** User Id */
      userId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ReactivateUserData;
  }

  /**
   * @description Send profile completion reminder to a user. Super admin only.
   * @name send_profile_completion_reminder
   * @summary Send Profile Completion Reminder
   * @request POST:/routes/users/admin/{user_id}/send-profile-reminder
   */
  export namespace send_profile_completion_reminder {
    export type RequestParams = {
      /** User Id */
      userId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = SendProfileCompletionReminderData;
  }

  /**
   * @description Get comprehensive portfolio dashboard with all metrics, allocations, and performance data. Includes investment summary, asset allocation, dividend metrics, and historical performance.
   * @name get_portfolio_dashboard
   * @summary Get Portfolio Dashboard
   * @request GET:/routes/dashboard
   */
  export namespace get_portfolio_dashboard {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPortfolioDashboardData;
  }

  /**
   * @description Get AI-based investment recommendations based on portfolio composition and risk profile. Analyzes diversification, allocation, and provides actionable suggestions.
   * @name get_investment_recommendations
   * @summary Get Investment Recommendations
   * @request GET:/routes/recommendations
   */
  export namespace get_investment_recommendations {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetInvestmentRecommendationsData;
  }

  /**
   * @description Get comprehensive portfolio risk assessment and analysis. Evaluates risk score, diversification, concentration, and provides suggestions.
   * @name get_risk_assessment
   * @summary Get Risk Assessment
   * @request GET:/routes/risk-assessment
   */
  export namespace get_risk_assessment {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetRiskAssessmentData;
  }

  /**
   * @description Get the current user's roles. This is used by the frontend to determine what the user can access.
   * @name get_my_roles
   * @summary Get My Roles
   * @request GET:/routes/roles/my-roles
   */
  export namespace get_my_roles {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetMyRolesData;
  }

  /**
   * @description Get all available roles in the system. This is an open endpoint for displaying available roles.
   * @name list_all_roles
   * @summary List All Roles
   * @request GET:/routes/roles/all
   */
  export namespace list_all_roles {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListAllRolesData;
  }

  /**
   * @description Assign a role to a user. Only super_admin users can assign roles. Auto-activates user when customer role is assigned.
   * @name assign_role
   * @summary Assign Role
   * @request POST:/routes/roles/assign
   */
  export namespace assign_role {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = AssignRoleRequest;
    export type RequestHeaders = {};
    export type ResponseBody = AssignRoleData;
  }

  /**
   * @description Remove a role from a user. Only super_admin users can remove roles. Auto-suspends user when customer role is removed and no other active roles exist.
   * @name remove_role
   * @summary Remove Role
   * @request POST:/routes/roles/remove
   */
  export namespace remove_role {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = RemoveRoleRequest;
    export type RequestHeaders = {};
    export type ResponseBody = RemoveRoleData;
  }

  /**
   * @description Get roles for a specific user. Only super_admin users can view other users' roles.
   * @name get_user_roles_by_id
   * @summary Get User Roles By Id
   * @request GET:/routes/roles/user/{user_id}
   */
  export namespace get_user_roles_by_id {
    export type RequestParams = {
      /** User Id */
      userId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetUserRolesByIdData;
  }

  /**
   * @description Check if the logged-in user has any pending invitations and auto-accept them. This is called when a user logs in to automatically complete invitation acceptance.
   * @name check_and_accept_pending_invitations
   * @summary Check And Accept Pending Invitations
   * @request POST:/routes/roles/check-pending-invitations
   */
  export namespace check_and_accept_pending_invitations {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CheckAndAcceptPendingInvitationsData;
  }

  /**
   * @description Log a single onboarding analytics event for the authenticated user.
   * @name log_onboarding_event
   * @summary Log Onboarding Event
   * @request POST:/routes/analytics/onboarding/event
   */
  export namespace log_onboarding_event {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = OnboardingEventRequest;
    export type RequestHeaders = {};
    export type ResponseBody = LogOnboardingEventData;
  }

  /**
   * @description Basic summary for admins to understand onboarding funnel. Requires super_admin.
   * @name get_onboarding_summary
   * @summary Get Onboarding Summary
   * @request GET:/routes/analytics/onboarding/summary
   */
  export namespace get_onboarding_summary {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetOnboardingSummaryData;
  }

  /**
   * @description Webhook endpoint for daily payment reminder processing. **Authentication:** Requires SCHEDULER_WEBHOOK_TOKEN in Authorization header. **Schedule:** Should be called daily at 9 AM Lesotho time (CAT/SAST). **What it does:** - Sends email + bell notifications for payment deadlines - Marks expired subscriptions - Logs all processing activity **Example cURL:** ```bash curl -X POST "<YOUR_DOMAIN>/api/scheduler/daily-payment-reminders"       -H "Authorization: Bearer YOUR_WEBHOOK_TOKEN" ```
   * @name daily_payment_reminders
   * @summary Daily Payment Reminders
   * @request POST:/routes/scheduler/daily-payment-reminders
   */
  export namespace daily_payment_reminders {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {
      /**
       * Authorization
       * Bearer token for webhook authentication
       */
      authorization?: string;
    };
    export type ResponseBody = DailyPaymentRemindersData;
  }

  /**
   * @description Webhook endpoint for monthly debit order processing. **Authentication:** Requires SCHEDULER_WEBHOOK_TOKEN in Authorization header. **Schedule:** Should be called on the 1st of each month at 6 AM Lesotho time (CAT/SAST). **What it does:** - Processes all active debit orders due for the current month - Creates transaction records - Sends confirmation emails for successful debits - Handles failed debits with retry logic - Updates subscription payment status - Creates bell notifications **Example cURL:** ```bash curl -X POST "<YOUR_DOMAIN>/api/scheduler/monthly-debit-orders"       -H "Authorization: Bearer YOUR_WEBHOOK_TOKEN" ```
   * @name monthly_debit_orders
   * @summary Monthly Debit Orders
   * @request POST:/routes/scheduler/monthly-debit-orders
   */
  export namespace monthly_debit_orders {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {
      /**
       * Authorization
       * Bearer token for webhook authentication
       */
      authorization?: string;
    };
    export type ResponseBody = MonthlyDebitOrdersData;
  }

  /**
   * @description Health check endpoint for monitoring.
   * @name scheduler_health
   * @summary Scheduler Health
   * @request GET:/routes/scheduler/health
   */
  export namespace scheduler_health {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = SchedulerHealthData;
  }

  /**
   * @description Generate an AI-powered professional bio for any user. Uses OpenAI to create a contextual introduction based on comprehensive profile data.
   * @name generate_bio_for_user
   * @summary Generate Bio For User
   * @request POST:/routes/bio/generate
   */
  export namespace generate_bio_for_user {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GenerateBioForUserData;
  }

  /**
   * @description Start a new AI conversation for lead creation. Creates a new conversation session and returns an initial AI greeting.
   * @tags Lead Chat
   * @name start_conversation
   * @summary Start Conversation
   * @request POST:/routes/lead-chat/start
   */
  export namespace start_conversation {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = StartConversationData;
  }

  /**
   * @description Send a message in the conversation and get AI response. The AI will extract information and ask follow-up questions.
   * @tags Lead Chat
   * @name send_message
   * @summary Send Message
   * @request POST:/routes/lead-chat/message
   */
  export namespace send_message {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = AppApisLeadChatSendMessageRequest;
    export type RequestHeaders = {};
    export type ResponseBody = SendMessageData;
  }

  /**
   * @description Complete conversation and create lead from extracted data. This creates the lead, assignment, follow-up, and story.
   * @tags Lead Chat
   * @name complete_conversation_and_create_lead
   * @summary Complete Conversation And Create Lead
   * @request POST:/routes/lead-chat/complete
   */
  export namespace complete_conversation_and_create_lead {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CompleteConversationRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CompleteConversationAndCreateLeadData;
  }

  /**
   * @description Get full conversation history. Returns all messages and metadata for a conversation.
   * @tags Lead Chat
   * @name get_conversation
   * @summary Get Conversation
   * @request GET:/routes/lead-chat/conversation/{conversation_id}
   */
  export namespace get_conversation {
    export type RequestParams = {
      /** Conversation Id */
      conversationId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetConversationData;
  }

  /**
   * @description Get lead story with conversation context. Returns the full story including transcript, summary, assignee, and follow-up.
   * @tags Lead Chat
   * @name get_lead_story_endpoint
   * @summary Get Lead Story Endpoint
   * @request GET:/routes/lead-chat/story/{lead_id}
   */
  export namespace get_lead_story_endpoint {
    export type RequestParams = {
      /** Lead Id */
      leadId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetLeadStoryEndpointData;
  }

  /**
   * @description List all email templates.
   * @name list_email_templates
   * @summary List Email Templates
   * @request GET:/routes/email-templates/list
   */
  export namespace list_email_templates {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListEmailTemplatesData;
  }

  /**
   * @description Create a new email template.
   * @name create_email_template
   * @summary Create Email Template
   * @request POST:/routes/email-templates/create
   */
  export namespace create_email_template {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateEmailTemplateModel;
    export type RequestHeaders = {};
    export type ResponseBody = CreateEmailTemplateData;
  }

  /**
   * @description Update an email template.
   * @name update_email_template
   * @summary Update Email Template
   * @request PUT:/routes/email-templates/{template_id}
   */
  export namespace update_email_template {
    export type RequestParams = {
      /** Template Id */
      templateId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateEmailTemplateModel;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateEmailTemplateData;
  }

  /**
   * @description Send email from template to one or more recipients using queue system.
   * @name send_email_from_template
   * @summary Send Email From Template
   * @request POST:/routes/email-templates/send
   */
  export namespace send_email_from_template {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = SendEmailModel;
    export type RequestHeaders = {};
    export type ResponseBody = SendEmailFromTemplateData;
  }

  /**
   * @description Get email sending history with optional filters.
   * @name get_email_history
   * @summary Get Email History
   * @request GET:/routes/email-templates/history
   */
  export namespace get_email_history {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetEmailHistoryData;
  }

  /**
   * @description Get email queue statistics.
   * @name get_email_queue_status
   * @summary Get Email Queue Status
   * @request GET:/routes/email-templates/queue/status
   */
  export namespace get_email_queue_status {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetEmailQueueStatusData;
  }

  /**
   * @description Manually trigger email queue processing. Useful for testing or forcing immediate delivery.
   * @name process_email_queue_endpoint
   * @summary Process Email Queue Endpoint
   * @request POST:/routes/email-templates/queue/process
   */
  export namespace process_email_queue_endpoint {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ProcessEmailQueueEndpointData;
  }

  /**
   * @description Manually retry a failed email.
   * @name retry_failed_email_endpoint
   * @summary Retry Failed Email Endpoint
   * @request POST:/routes/email-templates/queue/retry/{queue_id}
   */
  export namespace retry_failed_email_endpoint {
    export type RequestParams = {
      /** Queue Id */
      queueId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RetryFailedEmailEndpointData;
  }

  /**
   * @description Send a test payment instructions email using real bank/crypto details. Does not create a subscription - for testing email delivery only.
   * @name send_test_payment_email
   * @summary Send Test Payment Email
   * @request POST:/routes/email-templates/test/payment-instructions
   */
  export namespace send_test_payment_email {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = TestPaymentEmailRequest;
    export type RequestHeaders = {};
    export type ResponseBody = SendTestPaymentEmailData;
  }

  /**
   * @description List all email templates from registry (hardcoded + dynamic). Includes full metadata for management and visibility.
   * @name list_template_registry
   * @summary List Template Registry
   * @request GET:/routes/email-templates/registry/list
   */
  export namespace list_template_registry {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListTemplateRegistryData;
  }

  /**
   * @description Send a test email using template with sample or custom data. Works for both hardcoded and dynamic templates.
   * @name test_template_from_registry
   * @summary Test Template From Registry
   * @request POST:/routes/email-templates/registry/test
   */
  export namespace test_template_from_registry {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = TestTemplateRequest;
    export type RequestHeaders = {};
    export type ResponseBody = TestTemplateFromRegistryData;
  }

  /**
   * @description Generate HTML preview of template with sample data. Returns rendered HTML for display in browser.
   * @name preview_template_from_registry
   * @summary Preview Template From Registry
   * @request POST:/routes/email-templates/registry/preview
   */
  export namespace preview_template_from_registry {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PreviewTemplateRequest;
    export type RequestHeaders = {};
    export type ResponseBody = PreviewTemplateFromRegistryData;
  }

  /**
   * @description Activate or deactivate a template. Deactivated templates won't be used for sending emails.
   * @name toggle_template_active_status
   * @summary Toggle Template Active Status
   * @request POST:/routes/email-templates/registry/toggle-active/{template_id}
   */
  export namespace toggle_template_active_status {
    export type RequestParams = {
      /** Template Id */
      templateId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ToggleTemplateActiveStatusData;
  }

  /**
   * @description Get usage statistics for a specific template. Shows recent sends and success rates.
   * @name get_template_usage_stats
   * @summary Get Template Usage Stats
   * @request GET:/routes/email-templates/registry/usage/{template_id}
   */
  export namespace get_template_usage_stats {
    export type RequestParams = {
      /** Template Id */
      templateId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetTemplateUsageStatsData;
  }

  /**
   * @description List sent emails with filters and search. Combines email_queue and email_history for comprehensive tracking.
   * @name list_sent_emails
   * @summary List Sent Emails
   * @request POST:/routes/email-templates/sent-items/list
   */
  export namespace list_sent_emails {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ListSentEmailsRequest;
    export type RequestHeaders = {};
    export type ResponseBody = ListSentEmailsData;
  }

  /**
   * @description Generate a 6-digit verification code for invitation acceptance. Sends code via email, expires in 90 seconds. User can resend once (2 total sends). Admins can override this limit.
   * @name generate_verification_code
   * @summary Generate Verification Code
   * @request POST:/routes/invitations/generate-code
   */
  export namespace generate_verification_code {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GenerateCodeRequest;
    export type RequestHeaders = {};
    export type ResponseBody = GenerateVerificationCodeData;
  }

  /**
   * @description Verify the 6-digit code and accept the invitation. Assigns role, creates board member record if needed, and completes acceptance.
   * @name verify_code_and_accept
   * @summary Verify Code And Accept
   * @request POST:/routes/invitations/verify-code-and-accept
   */
  export namespace verify_code_and_accept {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = VerifyCodeRequest;
    export type RequestHeaders = {};
    export type ResponseBody = VerifyCodeAndAcceptData;
  }

  /**
   * @description Check if user has signed all required agreements
   * @name check_access
   * @summary Check Access
   * @request GET:/routes/data-room/investor/check-access
   */
  export namespace check_access {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CheckAccessData;
  }

  /**
   * @description List available documents for investors (requires signed agreements)
   * @name list_investor_documents
   * @summary List Investor Documents
   * @request GET:/routes/data-room/investor/documents
   */
  export namespace list_investor_documents {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListInvestorDocumentsData;
  }

  /**
   * @description Download a document (logs access with reason)
   * @name access_document
   * @summary Access Document
   * @request POST:/routes/data-room/investor/document/{document_id}/access
   */
  export namespace access_document {
    export type RequestParams = {
      /** Document Id */
      documentId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = DocumentAccessRequest;
    export type RequestHeaders = {};
    export type ResponseBody = AccessDocumentData;
  }

  /**
   * @description Get current NCNDA template
   * @name get_current_ncnda
   * @summary Get Current Ncnda
   * @request GET:/routes/data-room/investor/agreements/ncnda/current
   */
  export namespace get_current_ncnda {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetCurrentNcndaData;
  }

  /**
   * @description Sign NCNDA digitally
   * @name sign_ncnda
   * @summary Sign Ncnda
   * @request POST:/routes/data-room/investor/agreements/sign-ncnda
   */
  export namespace sign_ncnda {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = SignAgreementRequest;
    export type RequestHeaders = {};
    export type ResponseBody = SignNcndaData;
  }

  /**
   * @description Accept terms & conditions
   * @name sign_terms
   * @summary Sign Terms
   * @request POST:/routes/data-room/investor/agreements/sign-terms
   */
  export namespace sign_terms {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = SignAgreementRequest;
    export type RequestHeaders = {};
    export type ResponseBody = SignTermsData;
  }

  /**
   * @description Agree to provide Letter of Intent with investment details
   * @name agree_to_loi
   * @summary Agree To Loi
   * @request POST:/routes/data-room/investor/agreements/agree-loi
   */
  export namespace agree_to_loi {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = LOIAgreementRequest;
    export type RequestHeaders = {};
    export type ResponseBody = AgreeToLoiData;
  }

  /**
   * @description Get user's agreement status
   * @name get_my_agreement_status
   * @summary Get My Agreement Status
   * @request GET:/routes/data-room/investor/agreements/my-status
   */
  export namespace get_my_agreement_status {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetMyAgreementStatusData;
  }

  /**
   * @description Send OTP code to email or mobile number. Rate limited to 3 requests per 10 minutes.
   * @name send_otp
   * @summary Send Otp
   * @request POST:/routes/otp/send
   */
  export namespace send_otp {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = SendOTPRequest;
    export type RequestHeaders = {};
    export type ResponseBody = SendOtpData;
  }

  /**
   * @description Verify OTP code and update user profile verification status.
   * @name verify_otp
   * @summary Verify Otp
   * @request POST:/routes/otp/verify
   */
  export namespace verify_otp {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = VerifyOTPRequest;
    export type RequestHeaders = {};
    export type ResponseBody = VerifyOtpData;
  }

  /**
   * @description Set up a new debit order for recurring share subscription payments. Creates a debit order mandate and sends confirmation email with mandate details.
   * @name setup_debit_order
   * @summary Setup Debit Order
   * @request POST:/routes/debit-orders/setup
   */
  export namespace setup_debit_order {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = DebitOrderSetupRequest;
    export type RequestHeaders = {};
    export type ResponseBody = SetupDebitOrderData;
  }

  /**
   * @description Get all debit orders for the authenticated user.
   * @name get_my_debit_orders
   * @summary Get My Debit Orders
   * @request GET:/routes/debit-orders/my-orders
   */
  export namespace get_my_debit_orders {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetMyDebitOrdersData;
  }

  /**
   * @description Pause an active debit order.
   * @name pause_debit_order
   * @summary Pause Debit Order
   * @request PUT:/routes/debit-orders/{debit_order_id}/pause
   */
  export namespace pause_debit_order {
    export type RequestParams = {
      /** Debit Order Id */
      debitOrderId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PauseDebitOrderData;
  }

  /**
   * @description Resume a paused debit order.
   * @name resume_debit_order
   * @summary Resume Debit Order
   * @request PUT:/routes/debit-orders/{debit_order_id}/resume
   */
  export namespace resume_debit_order {
    export type RequestParams = {
      /** Debit Order Id */
      debitOrderId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ResumeDebitOrderData;
  }

  /**
   * @description Cancel a debit order permanently.
   * @name cancel_debit_order
   * @summary Cancel Debit Order
   * @request DELETE:/routes/debit-orders/{debit_order_id}
   */
  export namespace cancel_debit_order {
    export type RequestParams = {
      /** Debit Order Id */
      debitOrderId: string;
    };
    export type RequestQuery = {
      /** Reason */
      reason?: string | null;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CancelDebitOrderData;
  }

  /**
   * @description Get transaction history for a specific debit order.
   * @name get_debit_order_transactions
   * @summary Get Debit Order Transactions
   * @request GET:/routes/debit-orders/{debit_order_id}/transactions
   */
  export namespace get_debit_order_transactions {
    export type RequestParams = {
      /** Debit Order Id */
      debitOrderId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetDebitOrderTransactionsData;
  }

  /**
   * @description Get current user's notification preferences. Creates default preferences if none exist. **Anti-storm design:** This endpoint is called once per user session. Preferences are cached client-side and only refreshed when user updates them.
   * @name get_my_preferences
   * @summary Get My Preferences
   * @request GET:/routes/notification-preferences/my-preferences
   */
  export namespace get_my_preferences {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetMyPreferencesData;
  }

  /**
   * @description Update current user's notification preferences. Only updates fields that are provided (partial update).
   * @name update_my_preferences
   * @summary Update My Preferences
   * @request PUT:/routes/notification-preferences/my-preferences
   */
  export namespace update_my_preferences {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = UpdatePreferencesRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateMyPreferencesData;
  }

  /**
   * @description Register a device for push notifications. Idempotent - updates existing device if already registered. **Anti-storm design:** Called once per browser/device, not per page load. Frontend should cache device_hwid and only re-register if token changes.
   * @name register_device
   * @summary Register Device
   * @request POST:/routes/notification-preferences/register-device
   */
  export namespace register_device {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = DeviceRegistration;
    export type RequestHeaders = {};
    export type ResponseBody = RegisterDeviceData;
  }

  /**
   * @description Get all registered devices for current user. **Anti-storm design:** Called only when user views settings page.
   * @name get_my_devices
   * @summary Get My Devices
   * @request GET:/routes/notification-preferences/my-devices
   */
  export namespace get_my_devices {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetMyDevicesData;
  }

  /**
   * @description Remove a registered device (soft delete - marks as inactive).
   * @name remove_device
   * @summary Remove Device
   * @request DELETE:/routes/notification-preferences/my-devices/{device_id}
   */
  export namespace remove_device {
    export type RequestParams = {
      /** Device Id */
      deviceId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RemoveDeviceData;
  }

  /**
   * @description Get preferences for multiple users at once. **Anti-storm design:** Allows fetching 50+ user preferences in one call instead of 50+ individual API calls. Use case: Admin viewing list of users with their notification settings.
   * @name get_batch_preferences
   * @summary Get Batch Preferences
   * @request POST:/routes/notification-preferences/batch-preferences
   */
  export namespace get_batch_preferences {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GetBatchPreferencesPayload;
    export type RequestHeaders = {};
    export type ResponseBody = GetBatchPreferencesData;
  }

  /**
   * @description Get high-level analytics overview. Shows: - Total notifications sent/delivered/failed - Success rate by channel - Success rate by notification type - Recent activity timeline Args: days: Number of days to include in analysis (default: 7)
   * @name get_analytics_overview
   * @summary Get Analytics Overview
   * @request GET:/routes/notification-analytics/overview
   */
  export namespace get_analytics_overview {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Days
       * @default 7
       */
      days?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAnalyticsOverviewData;
  }

  /**
   * @description Get paginated delivery logs with filtering. Args: page: Page number (1-indexed) page_size: Items per page notification_type: Filter by notification type user_identifier: Filter by user email/phone status: Filter by 'success' or 'failed' days: Number of days to query (default: 30)
   * @name get_delivery_logs
   * @summary Get Delivery Logs
   * @request GET:/routes/notification-analytics/delivery-logs
   */
  export namespace get_delivery_logs {
    export type RequestParams = {};
    export type RequestQuery = {
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
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetDeliveryLogsData;
  }

  /**
   * @description Get channel performance statistics over time. Returns daily stats for each channel, useful for charting trends. Args: days: Number of days to query (default: 30) channel: Filter by specific channel (sms, email, push) notification_type: Filter by notification type
   * @name get_channel_stats
   * @summary Get Channel Stats
   * @request GET:/routes/notification-analytics/channel-stats
   */
  export namespace get_channel_stats {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Days
       * @default 30
       */
      days?: number;
      /** Channel */
      channel?: string | null;
      /** Notification Type */
      notification_type?: string | null;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetChannelStatsData;
  }

  /**
   * @description Get list of all notification types that have been sent. Useful for dropdown filters in the UI.
   * @name get_notification_types
   * @summary Get Notification Types
   * @request GET:/routes/notification-analytics/notification-types
   */
  export namespace get_notification_types {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetNotificationTypesData;
  }

  /**
   * @description List all invitation permissions (super_admin only). Shows which roles can invite which other roles.
   * @name list_invitation_permissions
   * @summary List Invitation Permissions
   * @request GET:/routes/admin/invitation-permissions
   */
  export namespace list_invitation_permissions {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListInvitationPermissionsData;
  }

  /**
   * @description Create or update invitation permissions for a role (super_admin only). Allows configuring which roles a given role can invite.
   * @name update_invitation_permission
   * @summary Update Invitation Permission
   * @request POST:/routes/admin/invitation-permissions
   */
  export namespace update_invitation_permission {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = UpdateInvitationPermissionRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateInvitationPermissionData;
  }

  /**
   * @description Get invitation permissions for a specific role. Users can view their own role's permissions, super_admin can view all.
   * @name get_invitation_permission
   * @summary Get Invitation Permission
   * @request GET:/routes/admin/invitation-permissions/{role_name}
   */
  export namespace get_invitation_permission {
    export type RequestParams = {
      /** Role Name */
      roleName: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetInvitationPermissionData;
  }

  /**
   * @description Check if the current user can invite someone to the target_role. Returns {can_invite: bool, reason: str}
   * @name check_can_invite_role
   * @summary Check Can Invite Role
   * @request GET:/routes/invitation-permissions/check/{target_role}
   */
  export namespace check_can_invite_role {
    export type RequestParams = {
      /** Target Role */
      targetRole: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CheckCanInviteRoleData;
  }

  /**
   * @description Get all email automation rules and their configurations.
   * @name get_automation_rules
   * @summary Get Automation Rules
   * @request GET:/routes/email-automation/rules
   */
  export namespace get_automation_rules {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAutomationRulesData;
  }

  /**
   * @description Update an automation rule configuration.
   * @name update_automation_rule
   * @summary Update Automation Rule
   * @request PUT:/routes/email-automation/rules/{rule_id}
   */
  export namespace update_automation_rule {
    export type RequestParams = {
      /** Rule Id */
      ruleId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = AutomationRuleConfig;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateAutomationRuleData;
  }

  /**
   * @description Manually trigger an automation action. Can be run on specific emails or all eligible emails.
   * @name execute_automation_action
   * @summary Execute Automation Action
   * @request POST:/routes/email-automation/execute
   */
  export namespace execute_automation_action {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = AutomationActionRequest;
    export type RequestHeaders = {};
    export type ResponseBody = ExecuteAutomationActionData;
  }

  /**
   * @description Get statistics about automation executions.
   * @name get_automation_stats
   * @summary Get Automation Stats
   * @request GET:/routes/email-automation/stats
   */
  export namespace get_automation_stats {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAutomationStatsData;
  }

  /**
   * @description Get login history for a specific user. Requires super_admin or back_office role.
   * @name get_user_login_history
   * @summary Get User Login History
   * @request GET:/routes/user-activity/login-history/{user_id}
   */
  export namespace get_user_login_history {
    export type RequestParams = {
      /** User Id */
      userId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetUserLoginHistoryData;
  }

  /**
   * @description Get suspension history for a specific user. Requires super_admin or back_office role.
   * @name get_user_suspension_history
   * @summary Get User Suspension History
   * @request GET:/routes/user-activity/suspension-history/{user_id}
   */
  export namespace get_user_suspension_history {
    export type RequestParams = {
      /** User Id */
      userId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetUserSuspensionHistoryData;
  }

  /**
   * @description Get role assignment/removal history for a specific user. Requires super_admin or back_office role.
   * @name get_user_role_history
   * @summary Get User Role History
   * @request GET:/routes/user-activity/role-history/{user_id}
   */
  export namespace get_user_role_history {
    export type RequestParams = {
      /** User Id */
      userId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetUserRoleHistoryData;
  }

  /**
   * @description Create a new board meeting.
   * @name create_meeting
   * @summary Create Meeting
   * @request POST:/routes/board-meetings/create
   */
  export namespace create_meeting {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateMeetingRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateMeetingData;
  }

  /**
   * @description List all board meetings with optional filtering.
   * @name list_meetings
   * @summary List Meetings
   * @request GET:/routes/board-meetings/list
   */
  export namespace list_meetings {
    export type RequestParams = {};
    export type RequestQuery = {
      /** Status */
      status?: string | null;
      /**
       * Limit
       * @default 50
       */
      limit?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListMeetingsData;
  }

  /**
   * @description Get a single meeting by ID.
   * @name get_meeting
   * @summary Get Meeting
   * @request GET:/routes/board-meetings/{meeting_id}
   */
  export namespace get_meeting {
    export type RequestParams = {
      /** Meeting Id */
      meetingId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetMeetingData;
  }

  /**
   * @description Update a meeting.
   * @name update_meeting
   * @summary Update Meeting
   * @request PUT:/routes/board-meetings/{meeting_id}
   */
  export namespace update_meeting {
    export type RequestParams = {
      /** Meeting Id */
      meetingId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateMeetingRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateMeetingData;
  }

  /**
   * @description Delete a meeting (soft delete by setting status to cancelled).
   * @name delete_meeting
   * @summary Delete Meeting
   * @request DELETE:/routes/board-meetings/{meeting_id}
   */
  export namespace delete_meeting {
    export type RequestParams = {
      /** Meeting Id */
      meetingId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteMeetingData;
  }

  /**
   * @description Add an agenda item to a meeting.
   * @name add_agenda_item
   * @summary Add Agenda Item
   * @request POST:/routes/board-meetings/{meeting_id}/agenda
   */
  export namespace add_agenda_item {
    export type RequestParams = {
      /** Meeting Id */
      meetingId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = AgendaItemRequest;
    export type RequestHeaders = {};
    export type ResponseBody = AddAgendaItemData;
  }

  /**
   * @description Get all agenda items for a meeting.
   * @name get_agenda
   * @summary Get Agenda
   * @request GET:/routes/board-meetings/{meeting_id}/agenda
   */
  export namespace get_agenda {
    export type RequestParams = {
      /** Meeting Id */
      meetingId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAgendaData;
  }

  /**
   * @description Record minutes for a meeting.
   * @name record_minutes
   * @summary Record Minutes
   * @request POST:/routes/board-meetings/{meeting_id}/minutes
   */
  export namespace record_minutes {
    export type RequestParams = {
      /** Meeting Id */
      meetingId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = MinutesRequest;
    export type RequestHeaders = {};
    export type ResponseBody = RecordMinutesData;
  }

  /**
   * @description Get the latest minutes for a meeting.
   * @name get_minutes
   * @summary Get Minutes
   * @request GET:/routes/board-meetings/{meeting_id}/minutes
   */
  export namespace get_minutes {
    export type RequestParams = {
      /** Meeting Id */
      meetingId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetMinutesData;
  }

  /**
   * @description Approve the latest minutes for a meeting.
   * @name approve_minutes
   * @summary Approve Minutes
   * @request PUT:/routes/board-meetings/{meeting_id}/minutes/approve
   */
  export namespace approve_minutes {
    export type RequestParams = {
      /** Meeting Id */
      meetingId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ApproveMinutesData;
  }

  /**
   * @description Mark attendance for a board member.
   * @name mark_attendance
   * @summary Mark Attendance
   * @request POST:/routes/board-meetings/{meeting_id}/attendance
   */
  export namespace mark_attendance {
    export type RequestParams = {
      /** Meeting Id */
      meetingId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = AttendanceRequest;
    export type RequestHeaders = {};
    export type ResponseBody = MarkAttendanceData;
  }

  /**
   * @description Get attendance records for a meeting.
   * @name get_attendance
   * @summary Get Attendance
   * @request GET:/routes/board-meetings/{meeting_id}/attendance
   */
  export namespace get_attendance {
    export type RequestParams = {
      /** Meeting Id */
      meetingId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAttendanceData;
  }

  /**
   * @description Create an action item from a meeting.
   * @name create_action_item
   * @summary Create Action Item
   * @request POST:/routes/board-meetings/{meeting_id}/action-items
   */
  export namespace create_action_item {
    export type RequestParams = {
      /** Meeting Id */
      meetingId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ActionItemRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateActionItemData;
  }

  /**
   * @description List action items for a specific meeting.
   * @name list_meeting_action_items
   * @summary List Meeting Action Items
   * @request GET:/routes/board-meetings/{meeting_id}/action-items
   */
  export namespace list_meeting_action_items {
    export type RequestParams = {
      /** Meeting Id */
      meetingId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListMeetingActionItemsData;
  }

  /**
   * @description List all action items across meetings.
   * @name list_all_action_items
   * @summary List All Action Items
   * @request GET:/routes/board-meetings/action-items/all
   */
  export namespace list_all_action_items {
    export type RequestParams = {};
    export type RequestQuery = {
      /** Status */
      status?: string | null;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListAllActionItemsData;
  }

  /**
   * @description Update an action item.
   * @name update_action_item
   * @summary Update Action Item
   * @request PUT:/routes/board-meetings/action-items/{action_item_id}
   */
  export namespace update_action_item {
    export type RequestParams = {
      /** Action Item Id */
      actionItemId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateActionItemRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateActionItemData;
  }

  /**
   * @description Invite board members to a meeting and send email invitations.
   * @name invite_members
   * @summary Invite Members
   * @request POST:/routes/board-meetings/{meeting_id}/invite
   */
  export namespace invite_members {
    export type RequestParams = {
      /** Meeting Id */
      meetingId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = InviteeMemberRequest;
    export type RequestHeaders = {};
    export type ResponseBody = InviteMembersData;
  }

  /**
   * @description Get list of invitees for a meeting.
   * @name get_meeting_invitees
   * @summary Get Meeting Invitees
   * @request GET:/routes/board-meetings/{meeting_id}/invitees
   */
  export namespace get_meeting_invitees {
    export type RequestParams = {
      /** Meeting Id */
      meetingId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetMeetingInviteesData;
  }

  /**
   * @description Update RSVP status for a meeting invitation.
   * @name update_rsvp
   * @summary Update Rsvp
   * @request PUT:/routes/board-meetings/{meeting_id}/rsvp
   */
  export namespace update_rsvp {
    export type RequestParams = {
      /** Meeting Id */
      meetingId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateRSVPRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateRsvpData;
  }

  /**
   * @description Process and send scheduled meeting reminders (called by scheduler).
   * @name send_meeting_reminders
   * @summary Send Meeting Reminders
   * @request POST:/routes/board-meetings/send-reminders
   */
  export namespace send_meeting_reminders {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = SendMeetingRemindersData;
  }

  /**
   * @description Resend meeting invitations to selected recipients.
   * @name resend_meeting_invitations
   * @summary Resend Meeting Invitations
   * @request POST:/routes/board-meetings/{meeting_id}/resend-invitations
   */
  export namespace resend_meeting_invitations {
    export type RequestParams = {
      /** Meeting Id */
      meetingId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = ResendInvitationsRequest;
    export type RequestHeaders = {};
    export type ResponseBody = ResendMeetingInvitationsData;
  }

  /**
   * @description Get list of active board members available for meeting invitations.
   * @name get_board_members_for_invitation
   * @summary Get Board Members For Invitation
   * @request GET:/routes/board-meetings/board-members
   */
  export namespace get_board_members_for_invitation {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetBoardMembersForInvitationData;
  }

  /**
   * @description Upload an image file and return the public URL (admin only)
   * @name upload_image
   * @summary Upload Image
   * @request POST:/routes/image-management/upload
   */
  export namespace upload_image {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = BodyUploadImage;
    export type RequestHeaders = {};
    export type ResponseBody = UploadImageData;
  }

  /**
   * @description Serve an uploaded image from storage (public endpoint)
   * @name serve_image
   * @summary Serve Image
   * @request GET:/routes/image-management/serve/{file_path}
   */
  export namespace serve_image {
    export type RequestParams = {
      /** File Path */
      filePath: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ServeImageData;
  }

  /**
   * @description Serve profile picture from storage (public endpoint)
   * @name serve_profile_picture
   * @summary Serve Profile Picture
   * @request GET:/routes/image-management/profile-picture/{storage_key}
   */
  export namespace serve_profile_picture {
    export type RequestParams = {
      /** Storage Key */
      storageKey: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ServeProfilePictureData;
  }

  /**
   * @description Search for images on Unsplash (open endpoint for image browsing)
   * @name search_images
   * @summary Search Images
   * @request GET:/routes/image-management/search
   */
  export namespace search_images {
    export type RequestParams = {};
    export type RequestQuery = {
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
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = SearchImagesData;
  }

  /**
   * @description Track when an Unsplash image is downloaded/used (required by Unsplash API guidelines)
   * @name track_unsplash_download
   * @summary Track Unsplash Download
   * @request POST:/routes/image-management/track-download/{photo_id}
   */
  export namespace track_unsplash_download {
    export type RequestParams = {
      /** Photo Id */
      photoId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = TrackUnsplashDownloadData;
  }

  /**
   * @description Main scheduled job endpoint that: 1. Sends consolidated daily reminders for missing/rejected documents 2. Sends expiry warnings for documents expiring soon 3. Creates escalations for overdue critical documents This endpoint should be called by an external cron service (e.g., daily).
   * @name process_reminders
   * @summary Process Reminders
   * @request POST:/routes/board-document-reminders/process-reminders
   */
  export namespace process_reminders {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ProcessRemindersData;
  }

  /**
   * @description Get statistics about reminder activity.
   * @name get_reminder_stats
   * @summary Get Reminder Stats
   * @request GET:/routes/board-document-reminders/stats
   */
  export namespace get_reminder_stats {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetReminderStatsData;
  }

  /**
   * @description List all document categories (admin only)
   * @name list_categories
   * @summary List Categories
   * @request GET:/routes/data-room/admin/categories
   */
  export namespace list_categories {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListCategoriesData;
  }

  /**
   * @description Create a new document category (admin only)
   * @name create_category
   * @summary Create Category
   * @request POST:/routes/data-room/admin/categories
   */
  export namespace create_category {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CategoryCreate;
    export type RequestHeaders = {};
    export type ResponseBody = CreateCategoryData;
  }

  /**
   * @description Update a document category (admin only)
   * @name update_category
   * @summary Update Category
   * @request PUT:/routes/data-room/admin/categories/{category_id}
   */
  export namespace update_category {
    export type RequestParams = {
      /** Category Id */
      categoryId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = CategoryUpdate;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateCategoryData;
  }

  /**
   * @description Delete a document category (admin only) - only if no documents are in it
   * @name delete_category
   * @summary Delete Category
   * @request DELETE:/routes/data-room/admin/categories/{category_id}
   */
  export namespace delete_category {
    export type RequestParams = {
      /** Category Id */
      categoryId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteCategoryData;
  }

  /**
   * @description Upload a document to the data room (admin only)
   * @name upload_data_room_document
   * @summary Upload Data Room Document
   * @request POST:/routes/data-room/admin/documents
   */
  export namespace upload_data_room_document {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = BodyUploadDataRoomDocument;
    export type RequestHeaders = {};
    export type ResponseBody = UploadDataRoomDocumentData;
  }

  /**
   * @description List all documents (admin only)
   * @name list_documents
   * @summary List Documents
   * @request GET:/routes/data-room/admin/documents
   */
  export namespace list_documents {
    export type RequestParams = {};
    export type RequestQuery = {
      /** Category Id */
      category_id?: number | null;
      /**
       * Status
       * @default "active"
       */
      status?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListDocumentsData;
  }

  /**
   * @description Update document metadata (admin only)
   * @name update_document
   * @summary Update Document
   * @request PUT:/routes/data-room/admin/documents/{document_id}
   */
  export namespace update_document {
    export type RequestParams = {
      /** Document Id */
      documentId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = DocumentUpdate;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateDocumentData;
  }

  /**
   * @description Delete a document (admin only) - soft delete by setting status to 'deleted'
   * @name delete_data_room_document
   * @summary Delete Data Room Document
   * @request DELETE:/routes/data-room/admin/documents/{document_id}
   */
  export namespace delete_data_room_document {
    export type RequestParams = {
      /** Document Id */
      documentId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteDataRoomDocumentData;
  }

  /**
   * @description Track user login and update last login timestamp. Also logs detailed login history with IP address and location. Should be called automatically when user successfully logs in.
   * @name track_login
   * @summary Track Login
   * @request POST:/routes/auth/track-login
   */
  export namespace track_login {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = TrackLoginData;
  }

  /**
   * @description Allow admins to create share subscriptions on behalf of investors. Automatically creates investor invitation if user doesn't exist. Requires: super_admin or admin role
   * @name create_subscription_on_behalf
   * @summary Create Subscription On Behalf
   * @request POST:/routes/create-on-behalf
   */
  export namespace create_subscription_on_behalf {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateSubscriptionRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateSubscriptionOnBehalfData;
  }

  /**
   * @description Upload payment proof for an admin-created subscription. Requires: super_admin or admin role
   * @name upload_admin_payment_proof
   * @summary Upload Admin Payment Proof
   * @request POST:/routes/upload-admin-payment-proof/{subscription_id}
   */
  export namespace upload_admin_payment_proof {
    export type RequestParams = {
      /** Subscription Id */
      subscriptionId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = BodyUploadAdminPaymentProof;
    export type RequestHeaders = {};
    export type ResponseBody = UploadAdminPaymentProofData;
  }

  /**
   * @description Get all subscriptions created by the current admin. Requires: super_admin or admin role
   * @name get_my_created_subscriptions
   * @summary Get My Created Subscriptions
   * @request GET:/routes/my-created-subscriptions
   */
  export namespace get_my_created_subscriptions {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetMyCreatedSubscriptionsData;
  }

  /**
   * @description Update the payment status of an admin-created subscription. Valid statuses: pending, verified, completed, failed Requires: super_admin or admin role
   * @name update_payment_status
   * @summary Update Payment Status
   * @request PUT:/routes/update-payment-status/{subscription_id}
   */
  export namespace update_payment_status {
    export type RequestParams = {
      /** Subscription Id */
      subscriptionId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdatePaymentStatusRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdatePaymentStatusData;
  }

  /**
   * @description Record a payment made by admin on behalf of a subscriber. Updates amount_paid and creates payment history entry. Requires: super_admin or admin role
   * @name record_payment
   * @summary Record Payment
   * @request POST:/routes/record-payment/{subscription_id}
   */
  export namespace record_payment {
    export type RequestParams = {
      /** Subscription Id */
      subscriptionId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = RecordPaymentRequest;
    export type RequestHeaders = {};
    export type ResponseBody = RecordPaymentData;
  }

  /**
   * @description Add or update payment notes for an admin-created subscription. Requires: super_admin or admin role
   * @name add_payment_notes
   * @summary Add Payment Notes
   * @request POST:/routes/add-payment-notes/{subscription_id}
   */
  export namespace add_payment_notes {
    export type RequestParams = {
      /** Subscription Id */
      subscriptionId: string;
    };
    export type RequestQuery = {
      /** Notes */
      notes: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = AddPaymentNotesData;
  }

  /**
   * @description Get current share configuration. Public endpoint - anyone can view share prices.
   * @name get_share_config
   * @summary Get Share Config
   * @request GET:/routes/config
   */
  export namespace get_share_config {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetShareConfigData;
  }

  /**
   * @description Get all share classes with current pricing from database. Public endpoint.
   * @name get_all_share_classes
   * @summary Get All Share Classes
   * @request GET:/routes/share-classes
   */
  export namespace get_all_share_classes {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAllShareClassesData;
  }

  /**
   * @description Get all share classes with full admin details. Requires: super_admin or admin role.
   * @name get_share_classes_admin
   * @summary Get Share Classes Admin
   * @request GET:/routes/share-classes/admin
   */
  export namespace get_share_classes_admin {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetShareClassesAdminData;
  }

  /**
   * @description Update a specific share class configuration. Requires: super_admin or admin role.
   * @name update_share_class
   * @summary Update Share Class
   * @request PUT:/routes/share-classes/{class_name}
   */
  export namespace update_share_class {
    export type RequestParams = {
      /** Class Name */
      className: string;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateShareClassRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateShareClassData;
  }

  /**
   * @description Update share price and configuration. Requires: super_admin or admin role.
   * @name update_share_price
   * @summary Update Share Price
   * @request PUT:/routes/update-price
   */
  export namespace update_share_price {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = UpdateSharePriceRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateSharePriceData;
  }

  /**
   * @description Transfer shares from one investor to another. Admin only - creates new subscription for recipient and updates source.
   * @name transfers_transfer_shares
   * @summary Transfers Transfer Shares
   * @request POST:/routes/subscriptions/transfers/transfer-shares
   */
  export namespace transfers_transfer_shares {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = TransferSharesRequest;
    export type RequestHeaders = {};
    export type ResponseBody = TransfersTransferSharesData;
  }

  /**
   * @description Convert shares from one class to another. Admin only - updates subscription and issues new certificate.
   * @name transfers_convert_share_class
   * @summary Transfers Convert Share Class
   * @request POST:/routes/subscriptions/transfers/convert-share-class
   */
  export namespace transfers_convert_share_class {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ConvertShareClassRequest;
    export type RequestHeaders = {};
    export type ResponseBody = TransfersConvertShareClassData;
  }

  /**
   * @description Get transfer and conversion history for a subscription. User must own the subscription or be admin.
   * @name transfers_get_history
   * @summary Transfers Get History
   * @request GET:/routes/subscriptions/transfers/transfer-history/{subscription_id}
   */
  export namespace transfers_get_history {
    export type RequestParams = {
      /** Subscription Id */
      subscriptionId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = TransfersGetHistoryData;
  }

  /**
   * @description Admin utility to fix subscription-user mappings and data inconsistencies. Scans all subscriptions and fixes common issues.
   * @name transfers_fix_mappings
   * @summary Transfers Fix Mappings
   * @request POST:/routes/subscriptions/transfers/admin/fix-subscription-mappings
   */
  export namespace transfers_fix_mappings {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = TransfersFixMappingsData;
  }

  /**
   * @description Auto-link pending notifications and messages to user on login.
   * @name link_pending_notifications
   * @summary Link Pending Notifications
   * @request POST:/routes/link-pending
   */
  export namespace link_pending_notifications {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = LinkPendingNotificationsData;
  }

  /**
   * @description Get user's notifications with pagination.
   * @name list_notifications
   * @summary List Notifications
   * @request GET:/routes/notifications
   */
  export namespace list_notifications {
    export type RequestParams = {};
    export type RequestQuery = {
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
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListNotificationsData;
  }

  /**
   * @description Get count of unread notifications for user.
   * @name get_unread_count
   * @summary Get Unread Count
   * @request GET:/routes/unread-count
   */
  export namespace get_unread_count {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetUnreadCountData;
  }

  /**
   * @description Mark one or more notifications as read.
   * @name mark_notifications_read
   * @summary Mark Notifications Read
   * @request POST:/routes/mark-read
   */
  export namespace mark_notifications_read {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = MarkReadRequest;
    export type RequestHeaders = {};
    export type ResponseBody = MarkNotificationsReadData;
  }

  /**
   * @description Mark all unread notifications as read for user.
   * @name mark_all_notifications_read
   * @summary Mark All Notifications Read
   * @request POST:/routes/mark-all-read
   */
  export namespace mark_all_notifications_read {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = MarkAllNotificationsReadData;
  }

  /**
   * @description Delete a notification.
   * @name delete_notification
   * @summary Delete Notification
   * @request DELETE:/routes/{notification_id}
   */
  export namespace delete_notification {
    export type RequestParams = {
      /** Notification Id */
      notificationId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteNotificationData;
  }

  /**
   * @description Provides geolocation information, including currency, for a given IP address. If ip_address is empty, auto-detects the client's IP from the request.
   * @name lookup_ip
   * @summary Lookup Ip
   * @request GET:/routes/geolocation/lookup
   */
  export namespace lookup_ip {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Ip Address
       * The IP address to look up. Leave empty to auto-detect.
       * @default ""
       */
      ip_address?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = LookupIpData;
  }

  /**
   * @description Create a new governance session (AGM vote, board resolution, or meeting)
   * @name create_session
   * @summary Create Session
   * @request POST:/routes/governance/sessions
   */
  export namespace create_session {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateSessionRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateSessionData;
  }

  /**
   * @description List governance sessions with filtering
   * @name list_sessions
   * @summary List Sessions
   * @request GET:/routes/governance/sessions
   */
  export namespace list_sessions {
    export type RequestParams = {};
    export type RequestQuery = {
      /** Status */
      status?: string | null;
      /** Session Type */
      session_type?: string | null;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListSessionsData;
  }

  /**
   * @description Add voting items to an AGM session
   * @name add_voting_items
   * @summary Add Voting Items
   * @request POST:/routes/governance/sessions/{session_id}/items
   */
  export namespace add_voting_items {
    export type RequestParams = {
      /** Session Id */
      sessionId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = CreateVotingItemRequest;
    export type RequestHeaders = {};
    export type ResponseBody = AddVotingItemsData;
  }

  /**
   * @description Update voting items for a session (only allowed when session is in draft status)
   * @name update_voting_items
   * @summary Update Voting Items
   * @request PATCH:/routes/governance/sessions/{session_id}/items
   */
  export namespace update_voting_items {
    export type RequestParams = {
      /** Session Id */
      sessionId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateVotingItemsRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateVotingItemsData;
  }

  /**
   * @description Get list of sessions for document upload selection dropdown. Includes active sessions and the default 'Unlinked Documents' holding session.
   * @name list_sessions_for_selection
   * @summary List Sessions For Selection
   * @request GET:/routes/governance/sessions/for-selection
   */
  export namespace list_sessions_for_selection {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListSessionsForSelectionData;
  }

  /**
   * @description Get detailed information about a session
   * @name get_session_details
   * @summary Get Session Details
   * @request GET:/routes/governance/sessions/{session_id}
   */
  export namespace get_session_details {
    export type RequestParams = {
      /** Session Id */
      sessionId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetSessionDetailsData;
  }

  /**
   * @description Update session details (only allowed when session is in draft status)
   * @name update_session
   * @summary Update Session
   * @request PATCH:/routes/governance/sessions/{session_id}
   */
  export namespace update_session {
    export type RequestParams = {
      /** Session Id */
      sessionId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateSessionRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateSessionData;
  }

  /**
   * @description Delete a governance session. Only the creator or super_admin can delete sessions. All related data (votes, documents, voting items) will be cascade deleted.
   * @name delete_session
   * @summary Delete Session
   * @request DELETE:/routes/governance/sessions/{session_id}
   */
  export namespace delete_session {
    export type RequestParams = {
      /** Session Id */
      sessionId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteSessionData;
  }

  /**
   * @description Cast a vote on an AGM item or board resolution
   * @name cast_vote
   * @summary Cast Vote
   * @request POST:/routes/governance/vote
   */
  export namespace cast_vote {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CastVoteRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CastVoteData;
  }

  /**
   * @description Get voting results for a session
   * @name get_vote_results
   * @summary Get Vote Results
   * @request GET:/routes/governance/sessions/{session_id}/results
   */
  export namespace get_vote_results {
    export type RequestParams = {
      /** Session Id */
      sessionId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetVoteResultsData;
  }

  /**
   * @description Update session status (open voting, close voting, finalize, reopen)
   * @name update_session_status
   * @summary Update Session Status
   * @request PATCH:/routes/governance/sessions/{session_id}/status
   */
  export namespace update_session_status {
    export type RequestParams = {
      /** Session Id */
      sessionId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateSessionStatusRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateSessionStatusData;
  }

  /**
   * @description Upload a document (minutes, agenda, attachment)
   * @name upload_governance_document
   * @summary Upload Governance Document
   * @request POST:/routes/governance/documents
   */
  export namespace upload_governance_document {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = UploadDocumentRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UploadGovernanceDocumentData;
  }

  /**
   * @description Approve minutes, RSVP to meeting, or approve resolution
   * @name approve_item
   * @summary Approve Item
   * @request POST:/routes/governance/approve
   */
  export namespace approve_item {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ApproveItemRequest;
    export type RequestHeaders = {};
    export type ResponseBody = ApproveItemData;
  }

  /**
   * @description Assign proxy voting rights to another user
   * @name create_proxy_assignment
   * @summary Create Proxy Assignment
   * @request POST:/routes/governance/proxy
   */
  export namespace create_proxy_assignment {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateProxyRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateProxyAssignmentData;
  }

  /**
   * @description Revoke a proxy assignment
   * @name revoke_proxy
   * @summary Revoke Proxy
   * @request DELETE:/routes/governance/proxy/{proxy_id}
   */
  export namespace revoke_proxy {
    export type RequestParams = {
      /** Proxy Id */
      proxyId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RevokeProxyData;
  }

  /**
   * @description Get user's active proxy assignments (both given and received)
   * @name get_my_proxy_assignments
   * @summary Get My Proxy Assignments
   * @request GET:/routes/governance/my-proxy-assignments
   */
  export namespace get_my_proxy_assignments {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetMyProxyAssignmentsData;
  }

  /**
   * @description Get all pending actions requiring user's attention
   * @name get_pending_actions
   * @summary Get Pending Actions
   * @request GET:/routes/governance/pending-actions
   */
  export namespace get_pending_actions {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPendingActionsData;
  }

  /**
   * @description Get user's voting and participation history
   * @name get_voting_history
   * @summary Get Voting History
   * @request GET:/routes/governance/history
   */
  export namespace get_voting_history {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Limit
       * @default 50
       */
      limit?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetVotingHistoryData;
  }

  /**
   * @description Link/move a document from one session to another. Allows moving documents from 'Unlinked Documents' to specific sessions.
   * @name link_document_to_session
   * @summary Link Document To Session
   * @request POST:/routes/governance/documents/link
   */
  export namespace link_document_to_session {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = LinkDocumentRequest;
    export type RequestHeaders = {};
    export type ResponseBody = LinkDocumentToSessionData;
  }

  /**
   * @description Get all documents in the 'Unlinked Documents' holding area. Useful for session editing UI to show available documents to link.
   * @name get_unlinked_documents
   * @summary Get Unlinked Documents
   * @request GET:/routes/governance/documents/unlinked
   */
  export namespace get_unlinked_documents {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetUnlinkedDocumentsData;
  }

  /**
   * @description Delete a governance document. Only the uploader or super_admin can delete documents.
   * @name delete_document
   * @summary Delete Document
   * @request DELETE:/routes/governance/documents/{document_id}
   */
  export namespace delete_document {
    export type RequestParams = {
      /** Document Id */
      documentId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteDocumentData;
  }

  /**
   * @description Get list of board members who can be notified about the session
   * @name get_board_members_for_notification
   * @summary Get Board Members For Notification
   * @request GET:/routes/governance/sessions/{session_id}/board-members-for-notification
   */
  export namespace get_board_members_for_notification {
    export type RequestParams = {
      /** Session Id */
      sessionId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetBoardMembersForNotificationData;
  }

  /**
   * @description Preview the governance session notification email for a specific recipient
   * @name preview_governance_session_email
   * @summary Preview Governance Session Email
   * @request GET:/routes/governance/sessions/{session_id}/email-preview
   */
  export namespace preview_governance_session_email {
    export type RequestParams = {
      /** Session Id */
      sessionId: number;
    };
    export type RequestQuery = {
      /** Recipient User Id */
      recipient_user_id: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PreviewGovernanceSessionEmailData;
  }

  /**
   * @description Queue governance session notifications for selected board members
   * @name send_governance_session_notification
   * @summary Send Governance Session Notification
   * @request POST:/routes/governance/sessions/{session_id}/send-notifications
   */
  export namespace send_governance_session_notification {
    export type RequestParams = {
      /** Session Id */
      sessionId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = SendGovernanceNotificationRequest;
    export type RequestHeaders = {};
    export type ResponseBody = SendGovernanceSessionNotificationData;
  }

  /**
   * @description List queued emails with optional filters
   * @name list_email_queue
   * @summary List Email Queue
   * @request GET:/routes/governance/email-queue
   */
  export namespace list_email_queue {
    export type RequestParams = {};
    export type RequestQuery = {
      /** Session Id */
      session_id?: number | null;
      /** Status */
      status?: string | null;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListEmailQueueData;
  }

  /**
   * @description Cancel a pending email in the queue
   * @name cancel_queued_email
   * @summary Cancel Queued Email
   * @request DELETE:/routes/governance/email-queue/{email_id}
   */
  export namespace cancel_queued_email {
    export type RequestParams = {
      /** Email Id */
      emailId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CancelQueuedEmailData;
  }

  /**
   * @description Process pending emails in the queue (called by scheduler)
   * @name process_email_queue
   * @summary Process Email Queue
   * @request POST:/routes/governance/email-queue/process
   */
  export namespace process_email_queue {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ProcessEmailQueueData;
  }

  /**
   * @description View certificate by scanning QR code - PUBLIC ACCESS. Returns PDF certificate with filled template. No authentication required - secured by verification code.
   * @name view_certificate_public
   * @summary View Certificate Public
   * @request GET:/routes/certificates/{cert_number}/{verification_code}
   */
  export namespace view_certificate_public {
    export type RequestParams = {
      /** Cert Number */
      certNumber: string;
      /** Verification Code */
      verificationCode: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ViewCertificatePublicData;
  }

  /**
   * @description View latest version of certificate - REQUIRES verification code in database. This endpoint is for backward compatibility with older QR codes.
   * @name view_latest_certificate_public
   * @summary View Latest Certificate Public
   * @request GET:/routes/certificates/{cert_number}
   */
  export namespace view_latest_certificate_public {
    export type RequestParams = {
      /** Cert Number */
      certNumber: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ViewLatestCertificatePublicData;
  }

  /**
   * @description Process and send pending profile completion reminders. This endpoint is called by the scheduler. Returns: Summary of processing results
   * @name process_profile_completion_reminders
   * @summary Process Profile Completion Reminders
   * @request POST:/routes/process-reminders
   */
  export namespace process_profile_completion_reminders {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ProcessProfileCompletionRemindersData;
  }

  /**
   * @description Get statistics about profile completion reminders. Returns: Stats on pending, sent, cancelled, and failed reminders
   * @name get_reminder_stats2
   * @summary Get Reminder Stats
   * @request GET:/routes/reminder-stats
   * @originalName get_reminder_stats
   * @duplicate
   */
  export namespace get_reminder_stats2 {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetReminderStats2Data;
  }

  /**
   * @description Create a document request for a board member. Only accessible by back office staff.
   * @name create_document_request
   * @summary Create Document Request
   * @request POST:/routes/document-requests/create
   */
  export namespace create_document_request {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateDocumentRequestModel;
    export type RequestHeaders = {};
    export type ResponseBody = CreateDocumentRequestData;
  }

  /**
   * @description Get all document requests for the logged-in board member.
   * @name get_my_document_requests
   * @summary Get My Document Requests
   * @request GET:/routes/document-requests/my-requests
   */
  export namespace get_my_document_requests {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetMyDocumentRequestsData;
  }

  /**
   * @description Get all document requests (back office view).
   * @name get_all_document_requests
   * @summary Get All Document Requests
   * @request GET:/routes/document-requests/all
   */
  export namespace get_all_document_requests {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAllDocumentRequestsData;
  }

  /**
   * @description Mark a document request as completed. Called when board member uploads the requested document.
   * @name complete_document_request
   * @summary Complete Document Request
   * @request POST:/routes/document-requests/complete
   */
  export namespace complete_document_request {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CompleteRequestModel;
    export type RequestHeaders = {};
    export type ResponseBody = CompleteDocumentRequestData;
  }

  /**
   * @description Webhook endpoint for Resend email events. Receives real-time updates about email delivery status. Event types: - email.sent: Email accepted by Resend - email.delivered: Email successfully delivered - email.bounced: Email bounced - email.complained: Recipient marked as spam - email.opened: Email opened by recipient - email.clicked: Link clicked in email
   * @name resend_webhook
   * @summary Resend Webhook
   * @request POST:/routes/webhooks/resend
   */
  export namespace resend_webhook {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {
      /** Svix-Id */
      "svix-id"?: string | null;
      /** Svix-Timestamp */
      "svix-timestamp"?: string | null;
      /** Svix-Signature */
      "svix-signature"?: string | null;
    };
    export type ResponseBody = ResendWebhookData;
  }

  /**
   * @description Test endpoint to verify webhook configuration.
   * @name test_resend_webhook
   * @summary Test Resend Webhook
   * @request GET:/routes/webhooks/resend/test
   */
  export namespace test_resend_webhook {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = TestResendWebhookData;
  }

  /**
   * @description Get all published timeline items ordered by date
   * @name list_public_timeline_items
   * @summary List Public Timeline Items
   * @request GET:/routes/progress-timeline/public
   */
  export namespace list_public_timeline_items {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListPublicTimelineItemsData;
  }

  /**
   * @description Get all timeline items for admin (including unpublished)
   * @name list_all_timeline_items
   * @summary List All Timeline Items
   * @request GET:/routes/progress-timeline/admin/list
   */
  export namespace list_all_timeline_items {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListAllTimelineItemsData;
  }

  /**
   * @description Create a new timeline item (admin only)
   * @name create_timeline_item
   * @summary Create Timeline Item
   * @request POST:/routes/progress-timeline/admin/create
   */
  export namespace create_timeline_item {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = TimelineItemCreate;
    export type RequestHeaders = {};
    export type ResponseBody = CreateTimelineItemData;
  }

  /**
   * @description Update a timeline item (admin only)
   * @name update_timeline_item
   * @summary Update Timeline Item
   * @request PUT:/routes/progress-timeline/admin/{item_id}
   */
  export namespace update_timeline_item {
    export type RequestParams = {
      /** Item Id */
      itemId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = TimelineItemUpdate;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateTimelineItemData;
  }

  /**
   * @description Delete a timeline item (admin only)
   * @name delete_timeline_item
   * @summary Delete Timeline Item
   * @request DELETE:/routes/progress-timeline/admin/{item_id}
   */
  export namespace delete_timeline_item {
    export type RequestParams = {
      /** Item Id */
      itemId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteTimelineItemData;
  }

  /**
   * @description Get all approved comments for a timeline item
   * @name get_timeline_comments
   * @summary Get Timeline Comments
   * @request GET:/routes/progress-timeline/{item_id}/comments
   */
  export namespace get_timeline_comments {
    export type RequestParams = {
      /** Item Id */
      itemId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetTimelineCommentsData;
  }

  /**
   * @description Add a comment to a timeline item
   * @name add_timeline_comment
   * @summary Add Timeline Comment
   * @request POST:/routes/progress-timeline/comment
   */
  export namespace add_timeline_comment {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = TimelineCommentCreate;
    export type RequestHeaders = {};
    export type ResponseBody = AddTimelineCommentData;
  }

  /**
   * @description Delete a comment (admin only)
   * @name delete_comment
   * @summary Delete Comment
   * @request DELETE:/routes/progress-timeline/admin/comment/{comment_id}
   */
  export namespace delete_comment {
    export type RequestParams = {
      /** Comment Id */
      commentId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteCommentData;
  }

  /**
   * @description List all active document requirements (admin/back office overview).
   * @name list_requirements
   * @summary List Requirements
   * @request GET:/routes/board-documents/requirements
   */
  export namespace list_requirements {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListRequirementsData;
  }

  /**
   * @description Create a new document requirement. Only super_admin and back_office_staff allowed.
   * @name create_requirement
   * @summary Create Requirement
   * @request POST:/routes/board-documents/requirements
   */
  export namespace create_requirement {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = RequirementCreate;
    export type RequestHeaders = {};
    export type ResponseBody = CreateRequirementData;
  }

  /**
   * @description Update fields on a requirement. Only super_admin and back_office_staff allowed.
   * @name update_requirement
   * @summary Update Requirement
   * @request PUT:/routes/board-documents/requirements/{requirement_id}
   */
  export namespace update_requirement {
    export type RequestParams = {
      /** Requirement Id */
      requirementId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = RequirementUpdate;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateRequirementData;
  }

  /**
   * @description Soft-delete a requirement. Only super_admin and back_office_staff allowed.
   * @name delete_requirement
   * @summary Delete Requirement
   * @request DELETE:/routes/board-documents/requirements/{requirement_id}
   */
  export namespace delete_requirement {
    export type RequestParams = {
      /** Requirement Id */
      requirementId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteRequirementData;
  }

  /**
   * @description Upload a template file for a requirement. Only super_admin and back_office_staff allowed.
   * @name upload_template
   * @summary Upload Template
   * @request POST:/routes/board-documents/requirements/{requirement_id}/upload-template
   */
  export namespace upload_template {
    export type RequestParams = {
      /** Requirement Id */
      requirementId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = BodyUploadTemplate;
    export type RequestHeaders = {};
    export type ResponseBody = UploadTemplateData;
  }

  /**
   * @description Update template description. Only super_admin and back_office_staff allowed.
   * @name update_template_description
   * @summary Update Template Description
   * @request PUT:/routes/board-documents/requirements/{requirement_id}/template-description
   */
  export namespace update_template_description {
    export type RequestParams = {
      /** Requirement Id */
      requirementId: number;
    };
    export type RequestQuery = {
      /**
       * Description
       * Template description/instructions
       */
      description: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateTemplateDescriptionData;
  }

  /**
   * @description Delete a template file. Only super_admin and back_office_staff allowed.
   * @name delete_template
   * @summary Delete Template
   * @request DELETE:/routes/board-documents/requirements/{requirement_id}/template
   */
  export namespace delete_template {
    export type RequestParams = {
      /** Requirement Id */
      requirementId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteTemplateData;
  }

  /**
   * @description Download template file for a requirement (accessible to board members and back office).
   * @tags stream
   * @name download_template
   * @summary Download Template
   * @request GET:/routes/board-documents/requirements/{requirement_id}/download-template
   */
  export namespace download_template {
    export type RequestParams = {
      /** Requirement Id */
      requirementId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DownloadTemplateData;
  }

  /**
   * @description Download an uploaded board member document (accessible to document owner and back office).
   * @tags stream
   * @name download_document
   * @summary Download Document
   * @request GET:/routes/board-documents/documents/{document_id}/download
   */
  export namespace download_document {
    export type RequestParams = {
      /** Document Id */
      documentId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DownloadDocumentData;
  }

  /**
   * @description Get jurisdiction-specific checklist merged with member's submission status. Accessible to inactive and active board members.
   * @name get_checklist
   * @summary Get Checklist
   * @request GET:/routes/board-documents/checklist
   */
  export namespace get_checklist {
    export type RequestParams = {};
    export type RequestQuery = {
      /** Jurisdiction */
      jurisdiction?: string | null;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetChecklistData;
  }

  /**
   * @description Get document completion summary for current board member.
   * @name get_my_status
   * @summary Get My Status
   * @request GET:/routes/board-documents/my-status
   */
  export namespace get_my_status {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetMyStatusData;
  }

  /**
   * @description Get aggregated document status for the current board member.
   * @name get_my_document_status
   * @summary Get My Document Status
   * @request GET:/routes/board-documents/board-documents/my-status
   */
  export namespace get_my_document_status {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetMyDocumentStatusData;
  }

  /**
   * @description Upload a document for a specific requirement. Only accessible to active board members (not inactive).
   * @name upload_document
   * @summary Upload Document
   * @request POST:/routes/board-documents/upload
   */
  export namespace upload_document {
    export type RequestParams = {};
    export type RequestQuery = {
      /** Requirement Id */
      requirement_id: number;
    };
    export type RequestBody = BodyUploadDocument;
    export type RequestHeaders = {};
    export type ResponseBody = UploadDocumentData;
  }

  /**
   * @description Resubmit a previously rejected document with a new file.
   * @name resubmit_document
   * @summary Resubmit Document
   * @request PUT:/routes/board-documents/{document_id}/resubmit
   */
  export namespace resubmit_document {
    export type RequestParams = {
      /** Document Id */
      documentId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = BodyResubmitDocument;
    export type RequestHeaders = {};
    export type ResponseBody = ResubmitDocumentData;
  }

  /**
   * @description Approve or reject a submitted document (Back Office only).
   * @name review_document
   * @summary Review Document
   * @request PUT:/routes/board-documents/review/{document_id}
   */
  export namespace review_document {
    export type RequestParams = {
      /** Document Id */
      documentId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = ReviewDocumentRequest;
    export type RequestHeaders = {};
    export type ResponseBody = ReviewDocumentData;
  }

  /**
   * @description Get overview of all board members' document compliance status (Back Office).
   * @name get_all_members_status
   * @summary Get All Members Status
   * @request GET:/routes/board-documents/all-members-status
   */
  export namespace get_all_members_status {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAllMembersStatusData;
  }

  /**
   * @description Get list of documents pending review (Back Office).
   * @name get_review_queue
   * @summary Get Review Queue
   * @request GET:/routes/board-documents/review-queue
   */
  export namespace get_review_queue {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetReviewQueueData;
  }

  /**
   * @description Get license readiness report by jurisdiction (Back Office).
   * @name get_readiness_report
   * @summary Get Readiness Report
   * @request GET:/routes/board-documents/readiness-report
   */
  export namespace get_readiness_report {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetReadinessReportData;
  }

  /**
   * @description Broadcast document requests to multiple board members (Back Office). If board_member_ids is None or empty, broadcasts to all active members. Supports multiple channels: email, sms, whatsapp
   * @name broadcast_document_request
   * @summary Broadcast Document Request
   * @request POST:/routes/board-documents/broadcast-document-request
   */
  export namespace broadcast_document_request {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = BroadcastDocumentRequestBody;
    export type RequestHeaders = {};
    export type ResponseBody = BroadcastDocumentRequestData;
  }

  /**
   * @description List all document requirement settings (Back Office).
   * @name list_requirement_settings
   * @summary List Requirement Settings
   * @request GET:/routes/board-documents/settings
   */
  export namespace list_requirement_settings {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListRequirementSettingsData;
  }

  /**
   * @description Update notification settings for a document requirement (Back Office).
   * @name update_requirement_settings
   * @summary Update Requirement Settings
   * @request PUT:/routes/board-documents/settings/{requirement_id}
   */
  export namespace update_requirement_settings {
    export type RequestParams = {
      /** Requirement Id */
      requirementId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateRequirementSettingsBody;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateRequirementSettingsData;
  }

  /**
   * @description Send document request notifications to a specific board member. Only super_admin and back_office_staff can send individual requests.
   * @name send_individual_document_request
   * @summary Send Individual Document Request
   * @request POST:/routes/board-documents/send-individual-document-request
   */
  export namespace send_individual_document_request {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = IndividualDocumentRequest;
    export type RequestHeaders = {};
    export type ResponseBody = SendIndividualDocumentRequestData;
  }

  /**
   * @description Create a new media release (admin only)
   * @name create_media_release
   * @summary Create Media Release
   * @request POST:/routes/media-releases/create
   */
  export namespace create_media_release {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateMediaReleaseRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateMediaReleaseData;
  }

  /**
   * @description List all media releases (public for published, protected for drafts)
   * @name list_media_releases
   * @summary List Media Releases
   * @request GET:/routes/media-releases/list
   */
  export namespace list_media_releases {
    export type RequestParams = {};
    export type RequestQuery = {
      /** Status */
      status?: string | null;
      /**
       * Limit
       * @default 50
       */
      limit?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListMediaReleasesData;
  }

  /**
   * @description Get published media releases for public viewing
   * @name list_published_releases
   * @summary List Published Releases
   * @request GET:/routes/media-releases/published
   */
  export namespace list_published_releases {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Limit
       * @default 20
       */
      limit?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListPublishedReleasesData;
  }

  /**
   * @description Get a media release by slug and increment view count
   * @name get_media_release_by_slug
   * @summary Get Media Release By Slug
   * @request GET:/routes/media-releases/by-slug/{slug}
   */
  export namespace get_media_release_by_slug {
    export type RequestParams = {
      /** Slug */
      slug: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetMediaReleaseBySlugData;
  }

  /**
   * @description Get a specific media release by ID (admin only)
   * @name get_media_release
   * @summary Get Media Release
   * @request GET:/routes/media-releases/{release_id}
   */
  export namespace get_media_release {
    export type RequestParams = {
      /** Release Id */
      releaseId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetMediaReleaseData;
  }

  /**
   * @description Update a media release (admin only)
   * @name update_media_release
   * @summary Update Media Release
   * @request PUT:/routes/media-releases/{release_id}
   */
  export namespace update_media_release {
    export type RequestParams = {
      /** Release Id */
      releaseId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateMediaReleaseRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateMediaReleaseData;
  }

  /**
   * @description Delete a media release (admin only)
   * @name delete_media_release
   * @summary Delete Media Release
   * @request DELETE:/routes/media-releases/{release_id}
   */
  export namespace delete_media_release {
    export type RequestParams = {
      /** Release Id */
      releaseId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteMediaReleaseData;
  }

  /**
   * @description Publish a media release, send newsletter to board members, and create bell notifications. This endpoint: 1. Updates the release status to 'published' 2. Sends email newsletter to all active board members 3. Creates in-app bell notifications with CTA to read the article 4. (Future) Sends SMS notifications to board members with phone numbers
   * @name publish_media_release
   * @summary Publish Media Release
   * @request POST:/routes/media-releases/{release_id}/publish
   */
  export namespace publish_media_release {
    export type RequestParams = {
      /** Release Id */
      releaseId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PublishMediaReleaseData;
  }

  /**
   * @description Generate and download welcome letter for a completed subscription. User must own the subscription or be admin.
   * @name documents_generate_welcome_letter
   * @summary Documents Generate Welcome Letter
   * @request GET:/routes/subscriptions/documents/welcome-letter/{subscription_id}
   */
  export namespace documents_generate_welcome_letter {
    export type RequestParams = {
      /** Subscription Id */
      subscriptionId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DocumentsGenerateWelcomeLetterData;
  }

  /**
   * @description Get comprehensive subscription summary with all related documents. User must own the subscription or be admin.
   * @name documents_subscription_summary
   * @summary Documents Subscription Summary
   * @request GET:/routes/subscriptions/documents/subscription-summary/{subscription_id}
   */
  export namespace documents_subscription_summary {
    export type RequestParams = {
      /** Subscription Id */
      subscriptionId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DocumentsSubscriptionSummaryData;
  }

  /**
   * @description Generate consolidated payment receipt for all verified payments. User must own the subscription or be admin.
   * @name documents_payment_receipt
   * @summary Documents Payment Receipt
   * @request GET:/routes/subscriptions/documents/payment-receipt/{subscription_id}
   */
  export namespace documents_payment_receipt {
    export type RequestParams = {
      /** Subscription Id */
      subscriptionId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DocumentsPaymentReceiptData;
  }

  /**
   * @description Send complete welcome package via email (welcome letter, certificate, receipt). Admin only - for completed subscriptions.
   * @name documents_send_welcome_package
   * @summary Documents Send Welcome Package
   * @request POST:/routes/subscriptions/documents/send-welcome-package/{subscription_id}
   */
  export namespace documents_send_welcome_package {
    export type RequestParams = {
      /** Subscription Id */
      subscriptionId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DocumentsSendWelcomePackageData;
  }

  /**
   * @description List all bank accounts.
   * @name list_bank_accounts
   * @summary List Bank Accounts
   * @request GET:/routes/bank-accounts/list-bank-accounts
   */
  export namespace list_bank_accounts {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListBankAccountsData;
  }

  /**
   * @description Get the default bank account for a currency.
   * @name get_default_bank_account
   * @summary Get Default Bank Account
   * @request GET:/routes/bank-accounts/get-default-bank-account
   */
  export namespace get_default_bank_account {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Currency
       * @default "ZAR"
       */
      currency?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetDefaultBankAccountData;
  }

  /**
   * @description Create a new bank account.
   * @name create_bank_account
   * @summary Create Bank Account
   * @request POST:/routes/bank-accounts/create-bank-account
   */
  export namespace create_bank_account {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateBankAccountRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateBankAccountData;
  }

  /**
   * @description Update a bank account.
   * @name update_bank_account
   * @summary Update Bank Account
   * @request PUT:/routes/bank-accounts/update-bank-account/{account_id}
   */
  export namespace update_bank_account {
    export type RequestParams = {
      /** Account Id */
      accountId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateBankAccountRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateBankAccountData;
  }

  /**
   * @description Delete a bank account.
   * @name delete_bank_account
   * @summary Delete Bank Account
   * @request DELETE:/routes/bank-accounts/delete-bank-account/{account_id}
   */
  export namespace delete_bank_account {
    export type RequestParams = {
      /** Account Id */
      accountId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteBankAccountData;
  }

  /**
   * @description Seed the default FNB bank account if no accounts exist. This is idempotent - only creates if table is empty.
   * @name seed_bank_account
   * @summary Seed Bank Account
   * @request POST:/routes/bank-accounts/bank-accounts/seed
   */
  export namespace seed_bank_account {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = SeedBankAccountData;
  }

  /**
   * @description Issue a share certificate for a completed subscription. Only accessible by admin and back-office roles.
   * @name certificates_issue_certificate
   * @summary Certificates Issue Certificate
   * @request POST:/routes/subscriptions/certificates/issue-certificate
   */
  export namespace certificates_issue_certificate {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = IssueCertificateRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CertificatesIssueCertificateData;
  }

  /**
   * @description View certificate details using certificate number and verification code. Public endpoint - no authentication required.
   * @name certificates_view_certificate
   * @summary Certificates View Certificate
   * @request GET:/routes/subscriptions/certificates/certificate/{cert_number}/{verification_code}
   */
  export namespace certificates_view_certificate {
    export type RequestParams = {
      /** Cert Number */
      certNumber: string;
      /** Verification Code */
      verificationCode: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CertificatesViewCertificateData;
  }

  /**
   * @description Download certificate PDF. Requires verification code for public access, or admin role.
   * @name certificates_download_certificate
   * @summary Certificates Download Certificate
   * @request GET:/routes/subscriptions/certificates/certificate/{cert_number}/download
   */
  export namespace certificates_download_certificate {
    export type RequestParams = {
      /** Cert Number */
      certNumber: string;
    };
    export type RequestQuery = {
      /** Verification Code */
      verification_code?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CertificatesDownloadCertificateData;
  }

  /**
   * @description Get all certificates for the current user. Shows certificates from all completed subscriptions.
   * @name certificates_get_my_certificates
   * @summary Certificates Get My Certificates
   * @request GET:/routes/subscriptions/certificates/my-certificates
   */
  export namespace certificates_get_my_certificates {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CertificatesGetMyCertificatesData;
  }

  /**
   * @description Revoke a certificate (admin only). Marks certificate as revoked and logs the action.
   * @name certificates_revoke_certificate
   * @summary Certificates Revoke Certificate
   * @request POST:/routes/subscriptions/certificates/certificate/{cert_id}/revoke
   */
  export namespace certificates_revoke_certificate {
    export type RequestParams = {
      /** Cert Id */
      certId: number;
    };
    export type RequestQuery = {
      /** Reason */
      reason: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CertificatesRevokeCertificateData;
  }

  /**
   * @description Regenerate certificate PDF (admin only). Creates new PDF with same certificate number.
   * @name certificates_regenerate_certificate
   * @summary Certificates Regenerate Certificate
   * @request POST:/routes/subscriptions/certificates/certificate/{cert_id}/regenerate
   */
  export namespace certificates_regenerate_certificate {
    export type RequestParams = {
      /** Cert Id */
      certId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CertificatesRegenerateCertificateData;
  }

  /**
   * @description Sign a certificate with digital signature (admin only). Creates final non-editable PDF with embedded signature.
   * @name certificates_sign_certificate
   * @summary Certificates Sign Certificate
   * @request POST:/routes/subscriptions/certificates/certificate/{cert_id}/sign
   */
  export namespace certificates_sign_certificate {
    export type RequestParams = {
      /** Cert Id */
      certId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = SignCertificateRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CertificatesSignCertificateData;
  }

  /**
   * @description Resend certificate email to shareholder (admin only).
   * @name certificates_resend_email
   * @summary Certificates Resend Email
   * @request POST:/routes/subscriptions/certificates/certificate/{cert_id}/resend-email
   */
  export namespace certificates_resend_email {
    export type RequestParams = {
      /** Cert Id */
      certId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CertificatesResendEmailData;
  }

  /**
   * @description Bulk issue certificates for all completed subscriptions without certificates. Admin only - processes all eligible subscriptions.
   * @name certificates_bulk_issue
   * @summary Certificates Bulk Issue
   * @request POST:/routes/subscriptions/certificates/bulk-issue-certificates
   */
  export namespace certificates_bulk_issue {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CertificatesBulkIssueData;
  }

  /**
   * @description Preview certificate for a subscription using PDF template. Returns the actual certificate PDF file. Requires authentication - user must own the subscription.
   * @name certificates_preview_certificate
   * @summary Certificates Preview Certificate
   * @request GET:/routes/subscriptions/certificates/subscription/{subscription_id}/preview-certificate
   */
  export namespace certificates_preview_certificate {
    export type RequestParams = {
      /** Subscription Id */
      subscriptionId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CertificatesPreviewCertificateData;
  }

  /**
   * @description Resend the QR code email for a certificate. Only accessible by admin and back-office roles.
   * @name certificates_resend_qr
   * @summary Certificates Resend Qr
   * @request POST:/routes/subscriptions/certificates/certificate/{cert_number}/resend-qr
   */
  export namespace certificates_resend_qr {
    export type RequestParams = {
      /** Cert Number */
      certNumber: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CertificatesResendQrData;
  }

  /**
   * @description Initialize the first super administrator. This endpoint can only be used once when no super admin exists, or is protected by a setup token stored in secrets.
   * @name initialize_super_admin
   * @summary Initialize Super Admin
   * @request POST:/routes/admin/initialize-super-admin
   */
  export namespace initialize_super_admin {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = SetupAdminRequest;
    export type RequestHeaders = {};
    export type ResponseBody = InitializeSuperAdminData;
  }

  /**
   * @description Create a new super admin or staff user. Only existing super admins can create new admins.
   * @name create_admin
   * @summary Create Admin
   * @request POST:/routes/admin/create-admin
   */
  export namespace create_admin {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateAdminRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateAdminData;
  }

  /**
   * @description Check if super admin has been set up. Public endpoint to determine if initial setup is needed.
   * @name check_setup_status
   * @summary Check Setup Status
   * @request GET:/routes/admin/check-setup-status
   */
  export namespace check_setup_status {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CheckSetupStatusData;
  }

  /**
   * @description Log a user activity for AI context tracking. Tracks page views, clicks, downloads, form submissions, and searches to provide context to the AI chatbot.
   * @name log_activity
   * @summary Log Activity
   * @request POST:/routes/log-activity
   */
  export namespace log_activity {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ActivityLog;
    export type RequestHeaders = {};
    export type ResponseBody = LogActivityData;
  }

  /**
   * @description Get recent activities for the current user. Returns the most recent N activities (default 5) for AI context.
   * @name get_recent_activities
   * @summary Get Recent Activities
   * @request GET:/routes/recent-activities
   */
  export namespace get_recent_activities {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Limit
       * @default 5
       */
      limit?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetRecentActivitiesData;
  }

  /**
   * @description Get recent activities for a specific user (admin/AI use). This endpoint is used by AI chatbot to understand user context. Only accessible by admins or the AI system.
   * @name get_activities_for_user
   * @summary Get Activities For User
   * @request GET:/routes/activities-for-user/{user_id}
   */
  export namespace get_activities_for_user {
    export type RequestParams = {
      /** User Id */
      userId: string;
    };
    export type RequestQuery = {
      /**
       * Limit
       * @default 5
       */
      limit?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetActivitiesForUserData;
  }

  /**
   * @description Get all board portal dashboard data in a single request. Combines profile, onboarding status, approvals, notifications, and document summary. Access Requirements: - User must have 'board_member' role Auto-creates board_members record if user has role but no record exists.
   * @name get_board_dashboard
   * @summary Get Board Dashboard
   * @request GET:/routes/board/dashboard
   */
  export namespace get_board_dashboard {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetBoardDashboardData;
  }

  /**
   * @description Validate an invitation token (public endpoint - no authentication required).
   * @name validate_invitation
   * @summary Validate Invitation
   * @request GET:/routes/invitations/validate/{token}
   */
  export namespace validate_invitation {
    export type RequestParams = {
      /** Token */
      token: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ValidateInvitationData;
  }

  /**
   * @description Check if user has any pending popups to show. Returns highest severity unread popup respecting DND and frequency limits.
   * @name check_pending_popups
   * @summary Check Pending Popups
   * @request POST:/routes/popups/check-popups
   */
  export namespace check_pending_popups {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CheckPendingPopupsData;
  }

  /**
   * @description Dismiss a popup notification. Optionally snooze instead of permanently dismissing.
   * @name dismiss_popup
   * @summary Dismiss Popup
   * @request PUT:/routes/popups/{notification_id}/dismiss
   */
  export namespace dismiss_popup {
    export type RequestParams = {
      /** Notification Id */
      notificationId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = DismissPopupRequest;
    export type RequestHeaders = {};
    export type ResponseBody = DismissPopupData;
  }

  /**
   * @description Get user's notification preferences.
   * @name get_notification_preferences
   * @summary Get Notification Preferences
   * @request GET:/routes/popups/preferences
   */
  export namespace get_notification_preferences {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetNotificationPreferencesData;
  }

  /**
   * @description Update user's notification preferences.
   * @name update_notification_preferences
   * @summary Update Notification Preferences
   * @request PUT:/routes/popups/preferences
   */
  export namespace update_notification_preferences {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = NotificationPreferencesInput;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateNotificationPreferencesData;
  }

  /**
   * @description Get all pending invitations for the logged-in user.
   * @name get_current_user_pending_invitations
   * @summary Get Current User Pending Invitations
   * @request GET:/routes/user/invitations/pending
   */
  export namespace get_current_user_pending_invitations {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetCurrentUserPendingInvitationsData;
  }

  /**
   * @description Accept an invitation for the logged-in user.
   * @name accept_my_invitation
   * @summary Accept My Invitation
   * @request POST:/routes/user/invitations/accept
   */
  export namespace accept_my_invitation {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = AcceptInvitationRequest;
    export type RequestHeaders = {};
    export type ResponseBody = AcceptMyInvitationData;
  }

  /**
   * @description List all board positions ordered by hierarchy.
   * @name list_board_positions
   * @summary List Board Positions
   * @request GET:/routes/board-positions
   */
  export namespace list_board_positions {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListBoardPositionsData;
  }

  /**
   * @description Create a new board position. Requires admin.
   * @name create_board_position
   * @summary Create Board Position
   * @request POST:/routes/board-positions
   */
  export namespace create_board_position {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreatePositionRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateBoardPositionData;
  }

  /**
   * @description Update a board position. Requires admin.
   * @name update_board_position
   * @summary Update Board Position
   * @request PUT:/routes/board-positions/{position_id}
   */
  export namespace update_board_position {
    export type RequestParams = {
      /** Position Id */
      positionId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdatePositionRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateBoardPositionData;
  }

  /**
   * @description Assign a position to a board member. Requires admin. Ends any current position assignment for this member. Checks investment requirements and sends reminder if needed.
   * @name appoint_board_member
   * @summary Appoint Board Member
   * @request POST:/routes/board-positions/members/{member_id}/assign
   */
  export namespace appoint_board_member {
    export type RequestParams = {
      /** Member Id */
      memberId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = AssignPositionRequest;
    export type RequestHeaders = {};
    export type ResponseBody = AppointBoardMemberData;
  }

  /**
   * @description Get current board composition with all members and their positions.
   * @name get_current_board_composition
   * @summary Get Current Board Composition
   * @request GET:/routes/board-positions/current
   */
  export namespace get_current_board_composition {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetCurrentBoardCompositionData;
  }

  /**
   * @description Get position assignment history.
   * @name get_position_history
   * @summary Get Position History
   * @request GET:/routes/board-positions/history
   */
  export namespace get_position_history {
    export type RequestParams = {};
    export type RequestQuery = {
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
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPositionHistoryData;
  }

  /**
   * @description Get all current board members with their investment compliance status, profile completion, and document compliance. Shows if they meet the minimum investment requirement for their position.
   * @name get_board_members_with_investment_status
   * @summary Get Board Members With Investment Status
   * @request GET:/routes/board-positions/members-with-investment
   */
  export namespace get_board_members_with_investment_status {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetBoardMembersWithInvestmentStatusData;
  }

  /**
   * @description Get current share availability and fundraising progress. Shows real-time data on available shares and amount raised.
   * @name core_get_share_availability
   * @summary Core Get Share Availability
   * @request GET:/routes/subscriptions/core/availability
   */
  export namespace core_get_share_availability {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CoreGetShareAvailabilityData;
  }

  /**
   * @description Submit a share subscription application. Validates availability and creates subscription record. Stores currency used and exchange rate at time of purchase.
   * @name core_create_subscription
   * @summary Core Create Subscription
   * @request POST:/routes/subscriptions/core/subscribe
   */
  export namespace core_create_subscription {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = SubscriptionRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CoreCreateSubscriptionData;
  }

  /**
   * @description Get the current status of a subscription. Shows payment progress and remaining balance.
   * @name core_get_subscription_status
   * @summary Core Get Subscription Status
   * @request GET:/routes/subscriptions/core/subscription/{subscription_id}
   */
  export namespace core_get_subscription_status {
    export type RequestParams = {
      /** Subscription Id */
      subscriptionId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CoreGetSubscriptionStatusData;
  }

  /**
   * @description List all subscriptions with summary statistics. For admin/monitoring purposes.
   * @name core_list_all_subscriptions
   * @summary Core List All Subscriptions
   * @request GET:/routes/subscriptions/core/subscriptions
   */
  export namespace core_list_all_subscriptions {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CoreListAllSubscriptionsData;
  }

  /**
   * @description Get all share subscriptions for the current authenticated user. Public endpoint - accessible by any logged-in user to view their own subscriptions.
   * @name core_get_my_public_subscriptions
   * @summary Core Get My Public Subscriptions
   * @request GET:/routes/subscriptions/core/my-public-subscriptions
   */
  export namespace core_get_my_public_subscriptions {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CoreGetMyPublicSubscriptionsData;
  }

  /**
   * @description Get all share subscriptions for the current user. Accessible by board members, admin and back-office roles. Regular public investors access certificates via QR codes.
   * @name core_get_my_subscriptions
   * @summary Core Get My Subscriptions
   * @request GET:/routes/subscriptions/core/my-subscriptions
   */
  export namespace core_get_my_subscriptions {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CoreGetMySubscriptionsData;
  }

  /**
   * @description Get detailed subscription info with payment history and certificate
   * @name core_get_subscription_details
   * @summary Core Get Subscription Details
   * @request GET:/routes/subscriptions/core/subscription/{subscription_id}/details
   */
  export namespace core_get_subscription_details {
    export type RequestParams = {
      /** Subscription Id */
      subscriptionId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CoreGetSubscriptionDetailsData;
  }

  /**
   * @description Get subscription system configuration
   * @name core_get_subscription_config
   * @summary Core Get Subscription Config
   * @request GET:/routes/subscriptions/core/config
   */
  export namespace core_get_subscription_config {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CoreGetSubscriptionConfigData;
  }

  /**
   * @description Send a message in the AI chat. If conversation_id is null, starts a new conversation. Returns both the user message and AI response.
   * @name send_investor_message
   * @summary Send Investor Message
   * @request POST:/routes/send-message
   */
  export namespace send_investor_message {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = AppApisInvestorChatSendMessageRequest;
    export type RequestHeaders = {};
    export type ResponseBody = SendInvestorMessageData;
  }

  /**
   * @description Get a full conversation with all messages.
   * @name get_investor_conversation
   * @summary Get Investor Conversation
   * @request GET:/routes/conversation/{conversation_id}
   */
  export namespace get_investor_conversation {
    export type RequestParams = {
      /** Conversation Id */
      conversationId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetInvestorConversationData;
  }

  /**
   * @description List all conversations for the current user.
   * @name list_my_conversations
   * @summary List My Conversations
   * @request GET:/routes/my-conversations
   */
  export namespace list_my_conversations {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListMyConversationsData;
  }

  /**
   * @description Update follow-up details. Allows updating the next contact date, notes, and status.
   * @name update_follow_up
   * @summary Update Follow Up
   * @request POST:/routes/lead-follow-ups/update/{follow_up_id}
   */
  export namespace update_follow_up {
    export type RequestParams = {
      /** Follow Up Id */
      followUpId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateFollowUpRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateFollowUpData;
  }

  /**
   * @description Snooze a follow-up for a specified number of days. Moves the next contact date forward by the specified number of days.
   * @name snooze_follow_up
   * @summary Snooze Follow Up
   * @request POST:/routes/lead-follow-ups/snooze/{follow_up_id}
   */
  export namespace snooze_follow_up {
    export type RequestParams = {
      /** Follow Up Id */
      followUpId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = SnoozeFollowUpRequest;
    export type RequestHeaders = {};
    export type ResponseBody = SnoozeFollowUpData;
  }

  /**
   * @description Mark a follow-up as completed. Updates the follow-up status and lead status based on the outcome.
   * @name complete_follow_up
   * @summary Complete Follow Up
   * @request POST:/routes/lead-follow-ups/complete/{follow_up_id}
   */
  export namespace complete_follow_up {
    export type RequestParams = {
      /** Follow Up Id */
      followUpId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = CompleteFollowUpRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CompleteFollowUpData;
  }

  /**
   * @description Get all pending follow-ups assigned to the current user. Returns overdue, due today, and upcoming follow-ups.
   * @name get_my_pending_follow_ups
   * @summary Get My Pending Follow Ups
   * @request GET:/routes/lead-follow-ups/my-pending
   */
  export namespace get_my_pending_follow_ups {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetMyPendingFollowUpsData;
  }

  /**
   * @description Process daily follow-up reminders for all due leads. This endpoint is called by a scheduled job daily at 9 AM. Process: 1. Find all follow-ups due today (next_contact_date <= today, status = pending) 2. Group by assignee 3. Send multi-channel notifications to each assignee 4. Update last_reminder_sent_at 5. Track delivery statistics Args: authorization: Bearer token for scheduler security Returns: DailyReminderResult with execution summary
   * @name process_daily_follow_up_reminders
   * @summary Process Daily Follow Up Reminders
   * @request POST:/routes/lead-follow-ups/process-daily-reminders
   */
  export namespace process_daily_follow_up_reminders {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {
      /** Authorization */
      authorization?: string;
    };
    export type ResponseBody = ProcessDailyFollowUpRemindersData;
  }

  /**
   * @description List all investor leads with filtering and pagination. Requires super_admin or back_office role.
   * @name list_leads
   * @summary List Leads
   * @request GET:/routes/investor-leads/list
   */
  export namespace list_leads {
    export type RequestParams = {};
    export type RequestQuery = {
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
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListLeadsData;
  }

  /**
   * @description Create a new investor lead. Requires super_admin or back_office role.
   * @name create_lead
   * @summary Create Lead
   * @request POST:/routes/investor-leads/create
   */
  export namespace create_lead {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateLeadRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateLeadData;
  }

  /**
   * @description Get detailed information about a specific lead. Requires super_admin or back_office role.
   * @name get_lead_details
   * @summary Get Lead Details
   * @request GET:/routes/investor-leads/details/{lead_id}
   */
  export namespace get_lead_details {
    export type RequestParams = {
      /** Lead Id */
      leadId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetLeadDetailsData;
  }

  /**
   * @description Update an existing lead. Requires super_admin or back_office role.
   * @name update_lead
   * @summary Update Lead
   * @request PUT:/routes/investor-leads/update/{lead_id}
   */
  export namespace update_lead {
    export type RequestParams = {
      /** Lead Id */
      leadId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = UpdateLeadRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateLeadData;
  }

  /**
   * @description Delete a lead (soft delete by marking as deleted in activity log). Requires super_admin or back_office role.
   * @name delete_lead
   * @summary Delete Lead
   * @request DELETE:/routes/investor-leads/delete/{lead_id}
   */
  export namespace delete_lead {
    export type RequestParams = {
      /** Lead Id */
      leadId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteLeadData;
  }

  /**
   * @description Add a note to a lead. Requires super_admin or back_office role.
   * @name add_note_to_lead
   * @summary Add Note To Lead
   * @request POST:/routes/investor-leads/add-note/{lead_id}
   */
  export namespace add_note_to_lead {
    export type RequestParams = {
      /** Lead Id */
      leadId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = AddNoteRequest;
    export type RequestHeaders = {};
    export type ResponseBody = AddNoteToLeadData;
  }

  /**
   * @description Get activity history for a lead. Requires super_admin or back_office role.
   * @name get_lead_activity
   * @summary Get Lead Activity
   * @request GET:/routes/investor-leads/activity/{lead_id}
   */
  export namespace get_lead_activity {
    export type RequestParams = {
      /** Lead Id */
      leadId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetLeadActivityData;
  }

  /**
   * @description Bulk import leads from CSV file. Expected columns: full_name, email, phone, company, country, lead_source, investment_interest_amount, preferred_share_class, notes Requires super_admin or back_office role.
   * @name bulk_import_leads
   * @summary Bulk Import Leads
   * @request POST:/routes/investor-leads/bulk-import
   */
  export namespace bulk_import_leads {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = BodyBulkImportLeads;
    export type RequestHeaders = {};
    export type ResponseBody = BulkImportLeadsData;
  }

  /**
   * @description Get analytics and metrics for investor leads. Requires super_admin or back_office role.
   * @name get_analytics
   * @summary Get Analytics
   * @request GET:/routes/investor-leads/analytics
   */
  export namespace get_analytics {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAnalyticsData;
  }

  /**
   * @description List all certificate templates (admin only)
   * @name list_templates
   * @summary List Templates
   * @request GET:/routes/certificate-templates/list
   */
  export namespace list_templates {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListTemplatesData;
  }

  /**
   * @description Get a specific template by ID (admin only)
   * @name get_template
   * @summary Get Template
   * @request GET:/routes/certificate-templates/{template_id}
   */
  export namespace get_template {
    export type RequestParams = {
      /** Template Id */
      templateId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetTemplateData;
  }

  /**
   * @description Delete a template (cannot delete active template)
   * @name delete_certificate_template
   * @summary Delete Certificate Template
   * @request DELETE:/routes/certificate-templates/{template_id}
   */
  export namespace delete_certificate_template {
    export type RequestParams = {
      /** Template Id */
      templateId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteCertificateTemplateData;
  }

  /**
   * @description Get the currently active template
   * @name get_active_template
   * @summary Get Active Template
   * @request GET:/routes/certificate-templates/active/current
   */
  export namespace get_active_template {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetActiveTemplateData;
  }

  /**
   * @description Upload a PDF fillable form certificate template (admin only)
   * @name upload_pdf_template
   * @summary Upload Pdf Template
   * @request POST:/routes/certificate-templates/upload
   */
  export namespace upload_pdf_template {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = BodyUploadPdfTemplate;
    export type RequestHeaders = {};
    export type ResponseBody = UploadPdfTemplateData;
  }

  /**
   * @description Get fillable field names from a PDF template
   * @name get_pdf_fields
   * @summary Get Pdf Fields
   * @request GET:/routes/certificate-templates/pdf-fields/{template_id}
   */
  export namespace get_pdf_fields {
    export type RequestParams = {
      /** Template Id */
      templateId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPdfFieldsData;
  }

  /**
   * @description Download a PDF template file
   * @name download_certificate_template
   * @summary Download Certificate Template
   * @request GET:/routes/certificate-templates/download/{template_id}
   */
  export namespace download_certificate_template {
    export type RequestParams = {
      /** Template Id */
      templateId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DownloadCertificateTemplateData;
  }

  /**
   * @description Set a template as active (deactivates all others)
   * @name activate_template
   * @summary Activate Template
   * @request POST:/routes/certificate-templates/{template_id}/activate
   */
  export namespace activate_template {
    export type RequestParams = {
      /** Template Id */
      templateId: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ActivateTemplateData;
  }

  /**
   * @description List all crypto wallets (super_admin only)
   * @name list_crypto_wallets
   * @summary List Crypto Wallets
   * @request GET:/routes/back-office/crypto-wallets
   */
  export namespace list_crypto_wallets {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ListCryptoWalletsData;
  }

  /**
   * @description Create or update a crypto wallet (super_admin only) Uses UPSERT - if crypto_type exists, updates it; otherwise creates new
   * @name create_or_update_wallet
   * @summary Create Or Update Wallet
   * @request POST:/routes/back-office/crypto-wallets
   */
  export namespace create_or_update_wallet {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateWalletRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateOrUpdateWalletData;
  }

  /**
   * @description Delete a crypto wallet (super_admin only)
   * @name delete_wallet
   * @summary Delete Wallet
   * @request DELETE:/routes/back-office/crypto-wallets/{crypto_type}
   */
  export namespace delete_wallet {
    export type RequestParams = {
      /** Crypto Type */
      cryptoType: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteWalletData;
  }

  /**
   * @description Get list of active crypto payment options Public endpoint - shows which crypto types are available
   * @name get_available_wallets
   * @summary Get Available Wallets
   * @request GET:/routes/crypto-wallets/available
   */
  export namespace get_available_wallets {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAvailableWalletsData;
  }

  /**
   * @description Get wallet details for a specific crypto type (authenticated users only) Returns wallet address and info for making payment
   * @name get_wallet_details
   * @summary Get Wallet Details
   * @request GET:/routes/crypto-wallets/{crypto_type}/details
   */
  export namespace get_wallet_details {
    export type RequestParams = {
      /** Crypto Type */
      cryptoType: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetWalletDetailsData;
  }
}
