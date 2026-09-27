import { useState, useEffect, useMemo } from "react";
import { Sparkles, RefreshCw, Send, CheckCircle, XCircle, Mail, Users, TrendingUp, Zap, Clock, Calendar, Check, Edit, Trash, X, Eye, Copy, Loader2, DollarSign, Play, Pause, Plus, Repeat, Archive, Lightbulb, Wand2, Settings, Bell, Smartphone, Search, AlertCircle, ArrowUp, ArrowDown } from "lucide-react";
import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { BackOfficeNav } from "components/BackOfficeNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { apiClient } from "app";
import { useUserGuardContext } from "app/auth";
import type {
  DraftListItem,
  EmailDraft,
  EngagementStats,
  FeatureHighlight,
  EngagementConfigModel
} from "types";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const BackOfficeEngagement = () => {
  const { user } = useUserGuardContext();
  
  // AI Model Options with metadata and pricing
  const AI_MODELS = {
    openai: [
      { 
        value: "gpt-4o-mini", 
        label: "GPT-4o Mini", 
        speed: "Fast", 
        cost: "Low", 
        quality: "Good",
        pricing: { input: 0.15, output: 0.60 } // per 1M tokens (USD)
      },
      { 
        value: "gpt-4o", 
        label: "GPT-4o", 
        speed: "Medium", 
        cost: "Medium", 
        quality: "Excellent",
        pricing: { input: 2.50, output: 10.00 }
      },
      { 
        value: "gpt-4-turbo", 
        label: "GPT-4 Turbo", 
        speed: "Medium", 
        cost: "High", 
        quality: "Excellent",
        pricing: { input: 10.00, output: 30.00 }
      }
    ],
    gemini: [
      { 
        value: "gemini-1.5-flash", 
        label: "Gemini 1.5 Flash", 
        speed: "Fast", 
        cost: "Low", 
        quality: "Good",
        pricing: { input: 0.075, output: 0.30 }
      },
      { 
        value: "gemini-1.5-pro", 
        label: "Gemini 1.5 Pro", 
        speed: "Medium", 
        cost: "Medium", 
        quality: "Excellent",
        pricing: { input: 1.25, output: 5.00 }
      }
    ],
    anthropic: [
      { 
        value: "claude-3-5-sonnet-20241022", 
        label: "Claude 3.5 Sonnet", 
        speed: "Medium", 
        cost: "Medium", 
        quality: "Excellent",
        pricing: { input: 3.00, output: 15.00 }
      },
      { 
        value: "claude-3-opus-20240229", 
        label: "Claude 3 Opus", 
        speed: "Slow", 
        cost: "High", 
        quality: "Premium",
        pricing: { input: 15.00, output: 75.00 }
      }
    ]
  };
  
  const [activeTab, setActiveTab] = useState("overview");
  const [drafts, setDrafts] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [nextFeature, setNextFeature] = useState<any>(null);
  const [showCreateFeatureDialog, setShowCreateFeatureDialog] = useState(false);
  const [showGenerateFeatureDialog, setShowGenerateFeatureDialog] = useState(false);
  const [showEditFeatureDialog, setShowEditFeatureDialog] = useState(false);
  const [editingFeature, setEditingFeature] = useState<any>(null);
  const [creatingFeature, setCreatingFeature] = useState(false);
  const [generatingFeature, setGeneratingFeature] = useState(false);
  const [featureForm, setFeatureForm] = useState({
    name: '',
    description: '',
    detailed_explanation: '',
    cta_text: '',
    cta_url: '',
    category: 'platform',
    feature_image_url: ''
  });
  const [aiPrompt, setAiPrompt] = useState('');
  const [featureAiProvider, setFeatureAiProvider] = useState<'openai' | 'anthropic' | 'gemini'>('openai');
  const [featureAiModel, setFeatureAiModel] = useState('gpt-4o-mini');

  // AI provider and progress tracking
  const [aiProvider, setAiProvider] = useState<"openai" | "anthropic" | "gemini">("openai");
  const [batchSize, setBatchSize] = useState<number | "all">("all");
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o-mini");
  const [nextFeaturePreview, setNextFeaturePreview] = useState<any>(null);
  const [showFeaturePreview, setShowFeaturePreview] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{
    current: number;
    total: number;
    currentRecipient: string;
    status: 'idle' | 'generating' | 'complete' | 'error';
    message: string;
    error?: {
      type: string;
      message: string;
      action: string;
    };
    summary?: {
      created: number;
      failed: number;
      failedRecipients: Array<{ name: string; error: string }>;
    };
  }>({
    current: 0,
    total: 0,
    currentRecipient: '',
    status: 'idle',
    message: ''
  });

  // Missing core state variables
  const [stats, setStats] = useState<EngagementStats | null>(null);
  const [config, setConfig] = useState<EngagementConfigModel | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [updatingConfig, setUpdatingConfig] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<EmailDraft | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Automation states
  const [automationStats, setAutomationStats] = useState<any>(null);
  const [automationRules, setAutomationRules] = useState<any[]>([]);
  const [executingAction, setExecutingAction] = useState<string | null>(null);

  // Sent emails filters
  const [sentSearchQuery, setSentSearchQuery] = useState("");
  const [sentFeatureFilter, setSentFeatureFilter] = useState<string>("all");
  const [sentSortBy, setSentSortBy] = useState<"date" | "recipient" | "feature">("date");
  const [sentSortOrder, setSentSortOrder] = useState<"asc" | "desc">("desc");

  // Drafts tab filters
  const [draftsSearch, setDraftsSearch] = useState<string>("");
  const [draftsFilter, setDraftsFilter] = useState<string>("");
  const [draftsSort, setDraftsSort] = useState<{ field: string; direction: 'asc' | 'desc' }>({
    field: 'created_at',
    direction: 'desc'
  });

  // Approved tab filters  
  const [approvedSearch, setApprovedSearch] = useState<string>("");
  const [approvedFilter, setApprovedFilter] = useState<string>("");
  const [approvedSort, setApprovedSort] = useState<{ field: string; direction: 'asc' | 'desc' }>({
    field: 'approved_at',
    direction: 'desc'
  });

  // Features tab filters
  const [featuresSearch, setFeaturesSearch] = useState<string>("");
  const [featuresFilter, setFeaturesFilter] = useState<string>("");
  const [featuresSort, setFeaturesSort] = useState<{ field: string; direction: 'asc' | 'desc' }>({
    field: 'times_sent',
    direction: 'asc'
  });

  // Scheduling state
  const [schedules, setSchedules] = useState<any[]>([]);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [scheduleForm, setScheduleForm] = useState({
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    time: '09:00',
    days: [1, 3, 5] as number[], // Monday, Wednesday, Friday
    aiProvider: 'openai' as 'openai' | 'anthropic' | 'gemini',
    aiModel: 'gpt-4o-mini',
    batchSize: 'all' as number | 'all'
  });

  // Load data
  useEffect(() => {
    loadStats();
    loadDrafts();
    loadFeatures();
    loadConfig();
    loadAutomationData();
    // loadSchedules(); // Removed - endpoint doesn't exist yet
  }, []);
  
  const loadAutomationData = async () => {
    try {
      const [statsRes, rulesRes] = await Promise.all([
        apiClient.get_automation_stats(),
        apiClient.get_automation_rules()
      ]);
      const statsData = await statsRes.json();
      const rulesData = await rulesRes.json();
      setAutomationStats(statsData);
      setAutomationRules(rulesData.rules || []);
    } catch (error) {
      console.error("Failed to load automation data:", error);
    }
  };
  
  const handleExecuteAutomation = async (action: string) => {
    setExecutingAction(action);
    try {
      const response = await apiClient.execute_automation_action({
        action,
        queue_ids: null,
        config_override: null
      });
      const data = await response.json();
      toast.success(data.message);
      await loadAutomationData();
    } catch (error: any) {
      const errorText = await error.text?.() || error.message;
      toast.error(`Action failed: ${errorText}`);
    } finally {
      setExecutingAction(null);
    }
  };
  
  const handleToggleRule = async (ruleId: number, currentEnabled: boolean) => {
    const rule = automationRules.find(r => r.id === ruleId);
    if (!rule) return;
    
    try {
      await apiClient.update_automation_rule(
        { ruleId },
        {
          rule_type: rule.rule_type,
          enabled: !currentEnabled,
          config: rule.config
        }
      );
      toast.success(`Rule ${currentEnabled ? 'disabled' : 'enabled'}`);
      await loadAutomationData();
    } catch (error) {
      toast.error("Failed to update rule");
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiClient.get_engagement_stats();
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const loadDrafts = async () => {
    try {
      const response = await apiClient.list_drafts();
      const data = await response.json();
      setDrafts(data);
    } catch (error) {
      console.error("Failed to load drafts:", error);
    }
  };

  const loadFeatures = async () => {
    try {
      // Load all features for management
      const response = await apiClient.list_feature_highlights({ active_only: false });
      const data = await response.json();
      setFeatures(data.features || []);
      
      // Load next feature for preview
      try {
        const nextRes = await apiClient.get_next_feature();
        const nextData = await nextRes.json();
        setNextFeature(nextData);
      } catch (err) {
        console.log('No next feature available');
        setNextFeature(null);
      }
    } catch (error) {
      console.error('Failed to load features:', error);
      toast.error('Failed to load features');
    }
  };

  const loadNextFeature = async () => {
    try {
      const response = await apiClient.get_next_feature();
      const data = await response.json();
      setNextFeaturePreview(data);
    } catch (error) {
      console.error("Failed to load next feature:", error);
      toast.error("Failed to load feature preview");
    }
  };

  const handleToggleFeaturePreview = async () => {
    if (!showFeaturePreview && !nextFeaturePreview) {
      await loadNextFeature();
    }
    setShowFeaturePreview(!showFeaturePreview);
  };

  const loadConfig = async () => {
    try {
      const response = await apiClient.get_engagement_config();
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error("Failed to load config:", error);
    }
  };

  const handleUpdateConfig = async (newConfig: Partial<EngagementConfigModel>) => {
    if (!config) return;
    
    setUpdatingConfig(true);
    try {
      const updatedConfig = { ...config, ...newConfig };
      const response = await apiClient.update_engagement_config(updatedConfig);
      const data = await response.json();
      setConfig(data);
      toast.success("Configuration updated");
    } catch (error) {
      toast.error("Failed to update configuration");
    } finally {
      setUpdatingConfig(false);
    }
  };

  const toggleChannel = (channel: string) => {
    if (!config) return;
    
    const currentChannels = config.default_channels || ["email"];
    let newChannels;
    
    if (currentChannels.includes(channel)) {
      newChannels = currentChannels.filter(c => c !== channel);
      // Ensure at least one channel is selected
      if (newChannels.length === 0) newChannels = ["email"];
    } else {
      newChannels = [...currentChannels, channel];
    }
    
    handleUpdateConfig({ default_channels: newChannels });
  };

  const handleGenerateDrafts = async () => {
    setGenerating(true);
    setGenerationProgress({
      current: 0,
      total: 0,
      currentRecipient: '',
      status: 'generating',
      message: 'Starting draft generation...'
    });

    try {
      // Use the apiClient streaming method for proper authentication and path
      const stream = apiClient.generate_email_drafts({
        force_regenerate: false,
        ai_provider: aiProvider,
        ai_model: selectedModel,
        batch_size: batchSize === "all" ? null : batchSize
      });

      for await (const chunk of stream) {
        if (!chunk) continue;

        try {
          const update = JSON.parse(chunk);

          switch (update.type) {
            case 'progress':
              setGenerationProgress(prev => ({
                ...prev,
                message: update.message,
                current: update.step || prev.current,
                total: update.total_steps || prev.total
              }));
              break;

            case 'generating':
              setGenerationProgress(prev => ({
                ...prev,
                current: update.current,
                total: update.total,
                currentRecipient: update.recipient_name,
                message: update.message,
                status: 'generating'
              }));
              break;

            case 'draft_created':
              setGenerationProgress(prev => ({
                ...prev,
                current: update.current,
                total: update.total,
                currentRecipient: update.recipient_name,
                message: update.message
              }));
              break;

            case 'draft_failed':
              setGenerationProgress(prev => ({
                ...prev,
                current: update.current,
                total: update.total,
                message: update.message
              }));
              
              if (update.error === 'rate_limit') {
                toast.error(update.details || 'AI rate limit reached');
              }
              break;

            case 'error':
              setGenerationProgress(prev => ({
                ...prev,
                status: 'error',
                error: {
                  type: update.error,
                  message: update.message,
                  action: update.action
                }
              }));
              toast.error(update.message);
              break;

            case 'complete':
              setGenerationProgress(prev => ({
                ...prev,
                status: 'complete',
                message: update.message,
                summary: {
                    created: update.drafts_created,
                    failed: update.drafts_failed,
                    failedRecipients: update.failed_recipients || []
                  }
                }));
                
                if (update.drafts_created > 0) {
                  toast.success(update.message);
                  await loadDrafts();
                } else {
                  toast.warning('No drafts were created');
                }
                break;
          }
        } catch (e) {
          console.error('Failed to parse progress update:', e);
        }
      }
    } catch (error: any) {
      console.error('Draft generation error:', error);
      setGenerationProgress(prev => ({
        ...prev,
        status: 'error',
        error: {
          type: 'network_error',
          message: error.message || 'An unexpected error occurred',
          action: 'Please check your connection and try again.'
        }
      }));
      toast.error(`Failed to generate drafts: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleViewDraft = async (draftId: number) => {
    setLoading(true);
    try {
      const response = await apiClient.get_draft({ draftId });
      const data = await response.json();
      setSelectedDraft(data);
      setShowPreview(true);
    } catch (error) {
      toast.error("Failed to load draft");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDrafts = async (draftIds: number[]) => {
    setLoading(true);
    try {
      const response = await apiClient.approve_drafts({
        draft_ids: draftIds,
        approved_by_user_id: user.id
      });
      const data = await response.json();
      toast.success(data.message);
      loadDrafts();
    } catch (error) {
      toast.error("Failed to approve drafts");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmails = async (draftIds?: number[]) => {
    setSending(true);
    try {
      const response = await apiClient.send_emails({
        draft_ids: draftIds,
        send_immediately: true
      });
      const data = await response.json();
      toast.success(data.message);
      await loadDrafts();
      await loadStats();
    } catch (error) {
      toast.error("Failed to send emails");
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "approved":
        return <Badge variant="default">Approved</Badge>;
      case "sent":
        return <Badge className="bg-green-600">Sent</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const draftsByStatus = {
    all: drafts,
    draft: drafts.filter(d => d.status === "draft"),
    approved: drafts.filter(d => d.status === "approved"),
    sent: drafts.filter(d => d.status === "sent")
  };

  // Get unique features from sent emails for filter dropdown
  const uniqueFeatures = useMemo(() => Array.from(
    new Set(
      draftsByStatus.sent
        .map(d => d.feature_name)
        .filter(Boolean)
    )
  ).sort(), [drafts]);

  // Filter and sort sent emails - using existing data structure
  const filteredAndSortedSentEmails = useMemo(() => {
    let filtered = [...draftsByStatus.sent];

    // Apply search filter
    if (sentSearchQuery) {
      const query = sentSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (draft) =>
          draft.recipient_name?.toLowerCase().includes(query) ||
          draft.recipient_email?.toLowerCase().includes(query) ||
          draft.subject_line?.toLowerCase().includes(query)
      );
    }

    // Apply feature filter
    if (sentFeatureFilter !== "all") {
      filtered = filtered.filter(
        (draft) => draft.feature_name === sentFeatureFilter
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sentSortBy) {
        case "date":
          comparison = new Date(a.sent_at || 0).getTime() - new Date(b.sent_at || 0).getTime();
          break;
        case "recipient":
          comparison = (a.recipient_name || "").localeCompare(b.recipient_name || "");
          break;
        case "feature":
          comparison = (a.feature_name || "").localeCompare(b.feature_name || "");
          break;
      }

      return sentSortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [drafts, sentSearchQuery, sentFeatureFilter, sentSortBy, sentSortOrder]);

  // Filter and sort drafts
  const filteredAndSortedDrafts = useMemo(() => {
    let filtered = [...draftsByStatus.draft];

    // Apply search filter
    if (draftsSearch) {
      const query = draftsSearch.toLowerCase();
      filtered = filtered.filter(
        (draft) =>
          draft.recipient_name?.toLowerCase().includes(query) ||
          draft.recipient_email?.toLowerCase().includes(query) ||
          draft.subject_line?.toLowerCase().includes(query)
      );
    }

    // Apply feature filter
    if (draftsFilter !== "") {
      filtered = filtered.filter(
        (draft) => draft.feature_name === draftsFilter
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      const aValue = a[draftsSort.field as keyof typeof a];
      const bValue = b[draftsSort.field as keyof typeof b];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        comparison = aValue > bValue ? 1 : -1;
      }

      return draftsSort.direction === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [drafts, draftsSearch, draftsFilter, draftsSort]);

  // Filter and sort approved
  const filteredAndSortedApproved = useMemo(() => {
    let filtered = [...draftsByStatus.approved];

    // Apply search filter
    if (approvedSearch) {
      const query = approvedSearch.toLowerCase();
      filtered = filtered.filter(
        (draft) =>
          draft.recipient_name?.toLowerCase().includes(query) ||
          draft.recipient_email?.toLowerCase().includes(query) ||
          draft.subject_line?.toLowerCase().includes(query)
      );
    }

    // Apply feature filter
    if (approvedFilter !== "") {
      filtered = filtered.filter(
        (draft) => draft.feature_name === approvedFilter
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      const aValue = a[approvedSort.field as keyof typeof a];
      const bValue = b[approvedSort.field as keyof typeof b];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        comparison = aValue > bValue ? 1 : -1;
      }

      return approvedSort.direction === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [drafts, approvedSearch, approvedFilter, approvedSort]);

  // Filter and sort features
  const filteredAndSortedFeatures = useMemo(() => {
    let filtered = [...features];

    // Apply search filter
    if (featuresSearch) {
      const query = featuresSearch.toLowerCase();
      filtered = filtered.filter(
        (feature) =>
          feature.title?.toLowerCase().includes(query) ||
          feature.description?.toLowerCase().includes(query) ||
          feature.category?.toLowerCase().includes(query)
      );
    }

    // Apply filter
    if (featuresFilter) {
      if (featuresFilter === "active") {
        filtered = filtered.filter((f) => f.is_active);
      } else if (featuresFilter === "inactive") {
        filtered = filtered.filter((f) => !f.is_active);
      } else {
        filtered = filtered.filter((f) => f.category === featuresFilter);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      const aValue = a[featuresSort.field as keyof typeof a];
      const bValue = b[featuresSort.field as keyof typeof b];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = aValue > bValue ? 1 : -1;
      }

      return featuresSort.direction === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [features, featuresSearch, featuresFilter, featuresSort]);

  // Cost estimation calculator
  const calculateCostEstimate = () => {
    const model = AI_MODELS[aiProvider].find(m => m.value === selectedModel);
    if (!model) return null;

    // Estimate tokens per draft
    // Typical prompt: ~1000 tokens (system + user prompt with feature details)
    // Typical output: ~800 tokens (subject + personalized email content)
    const estimatedInputTokens = 1000;
    const estimatedOutputTokens = 800;

    // Calculate recipients count
    let recipientsCount = 0;
    if (batchSize === "all") {
      // Use stats to get actual count of eligible board members
      recipientsCount = stats?.total_eligible_recipients || 50; // fallback estimate
    } else {
      recipientsCount = Number(batchSize);
    }

    // Calculate total tokens
    const totalInputTokens = estimatedInputTokens * recipientsCount;
    const totalOutputTokens = estimatedOutputTokens * recipientsCount;

    // Calculate costs (pricing is per 1M tokens)
    const inputCost = (totalInputTokens / 1000000) * model.pricing.input;
    const outputCost = (totalOutputTokens / 1000000) * model.pricing.output;
    const totalCost = inputCost + outputCost;

    return {
      recipientsCount,
      totalInputTokens,
      totalOutputTokens,
      inputCost,
      outputCost,
      totalCost,
      model: model.label,
      costLevel: model.cost
    };
  };

  const costEstimate = useMemo(() => calculateCostEstimate(), [aiProvider, selectedModel, batchSize, stats]);

  const handleResendEmail = async (draft: any) => {
    if (!confirm(`Resend this email to ${draft.recipient_name}?`)) {
      return;
    }

    setSending(true);
    try {
      // Create a new draft based on the sent email
      const response = await apiClient.send_emails({
        draft_ids: [draft.id],
        send_immediately: true
      });
      const data = await response.json();
      toast.success(`Email resent to ${draft.recipient_name}`);
      await loadStats();
    } catch (error) {
      toast.error("Failed to resend email");
    } finally {
      setSending(false);
    }
  };

  // Convert schedule form to cron expression
  const formToCron = (form: typeof scheduleForm): string => {
    const [hour, minute] = form.time.split(':');
    // Convert SAST (UTC+2) to UTC for cron
    const utcHour = (parseInt(hour) - 2 + 24) % 24;

    if (form.frequency === 'daily') {
      return `${minute} ${utcHour} * * *`;
    } else if (form.frequency === 'weekly') {
      // Days are 0-6 (Mon-Sun), cron uses 0-6 (Sun-Sat), so shift by 1
      const cronDays = form.days.map(d => (d + 1) % 7).sort().join(',');
      return `${minute} ${utcHour} * * ${cronDays}`;
    } else if (form.frequency === 'monthly') {
      return `${minute} ${utcHour} 1 * *`;
    }
    return `${minute} ${utcHour} * * *`; // fallback to daily
  };

  // Load schedules (mock for now - will integrate with backend)
  const loadSchedules = async () => {
    try {
      const response = await apiClient.list_schedules();
      const data = await response.json();
      // Filter for draft generation schedules only
      const draftSchedules = data.filter((s: any) => 
        s.endpoint === '/scheduled-draft-generation'
      );
      setSchedules(draftSchedules);
    } catch (error) {
      console.error('Failed to load schedules:', error);
      toast.error('Failed to load schedules');
    }
  };

  // Feature management handlers
  const handleCreateFeature = async () => {
    if (!featureForm.name || !featureForm.description) {
      toast.error('Name and description are required');
      return;
    }

    setCreatingFeature(true);
    try {
      await apiClient.create_feature(featureForm);
      toast.success('Feature created successfully');
      setShowCreateFeatureDialog(false);
      resetFeatureForm();
      await loadFeatures();
    } catch (error: any) {
      console.error('Failed to create feature:', error);
      toast.error(error.message || 'Failed to create feature');
    } finally {
      setCreatingFeature(false);
    }
  };

  const handleGenerateFeature = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please provide a description of the feature to generate');
      return;
    }

    setGeneratingFeature(true);
    try {
      const response = await apiClient.generate_feature_with_ai({
        prompt: aiPrompt,
        ai_provider: featureAiProvider,
        ai_model: featureAiModel
      });
      const generatedFeature = await response.json();
      
      // Pre-fill the form with AI-generated content
      setFeatureForm({
        name: generatedFeature.name,
        description: generatedFeature.description,
        detailed_explanation: generatedFeature.detailed_explanation,
        cta_text: generatedFeature.cta_text || '',
        cta_url: generatedFeature.cta_url || '',
        category: generatedFeature.category || 'platform',
        feature_image_url: generatedFeature.feature_image_url || ''
      });
      
      toast.success('Feature generated! Review and save.');
      setShowGenerateFeatureDialog(false);
      setShowCreateFeatureDialog(true);
    } catch (error: any) {
      console.error('Failed to generate feature:', error);
      toast.error(error.message || 'Failed to generate feature');
    } finally {
      setGeneratingFeature(false);
    }
  };

  const handleEditFeature = async () => {
    if (!editingFeature || !featureForm.name || !featureForm.description) {
      toast.error('Name and description are required');
      return;
    }

    setCreatingFeature(true);
    try {
      await apiClient.update_feature(editingFeature.id, featureForm);
      toast.success('Feature updated successfully');
      setShowEditFeatureDialog(false);
      setEditingFeature(null);
      resetFeatureForm();
      await loadFeatures();
    } catch (error: any) {
      console.error('Failed to update feature:', error);
      toast.error(error.message || 'Failed to update feature');
    } finally {
      setCreatingFeature(false);
    }
  };

  const handleDeleteFeature = async (featureId: string) => {
    if (!confirm('Are you sure you want to delete this feature?')) {
      return;
    }

    try {
      await apiClient.delete_feature(featureId);
      toast.success('Feature deleted successfully');
      await loadFeatures();
    } catch (error: any) {
      console.error('Failed to delete feature:', error);
      toast.error(error.message || 'Failed to delete feature');
    }
  };

  const handleToggleFeatureActive = async (feature: any) => {
    try {
      await apiClient.update_feature(feature.id, {
        is_active: !feature.is_active
      });
      toast.success(`Feature ${!feature.is_active ? 'activated' : 'deactivated'}`);
      await loadFeatures();
    } catch (error: any) {
      console.error('Failed to toggle feature:', error);
      toast.error(error.message || 'Failed to update feature');
    }
  };

  const resetFeatureForm = () => {
    setFeatureForm({
      name: '',
      description: '',
      detailed_explanation: '',
      cta_text: '',
      cta_url: '',
      category: 'platform',
      feature_image_url: ''
    });
    setAiPrompt('');
  };

  const openEditFeatureDialog = (feature: any) => {
    setEditingFeature(feature);
    setFeatureForm({
      name: feature.name,
      description: feature.description,
      detailed_explanation: feature.detailed_explanation || '',
      cta_text: feature.cta_text || '',
      cta_url: feature.cta_url || '',
      category: feature.category || 'platform',
      feature_image_url: feature.feature_image_url || ''
    });
    setShowEditFeatureDialog(true);
  };

  const handleSaveSchedule = async () => {
    try {
      const cronExpr = formToCron(scheduleForm);
      
      const title = `Draft Generation - ${scheduleForm.frequency} at ${scheduleForm.time}`;
      const description = `Generates ${scheduleForm.batchSize === 'all' ? 'all' : scheduleForm.batchSize} drafts using ${scheduleForm.aiProvider} ${scheduleForm.aiModel}`;

      // Build endpoint URL with query params for AI configuration
      const queryParams = new URLSearchParams({
        ai_provider: scheduleForm.aiProvider,
        ai_model: scheduleForm.aiModel,
      });
      
      // Add batch_size only if not 'all'
      if (scheduleForm.batchSize !== 'all') {
        queryParams.append('batch_size', scheduleForm.batchSize.toString());
      }
      
      const endpointWithParams = `/scheduled-draft-generation?${queryParams.toString()}`;

      if (editingSchedule) {
        // Update existing schedule
        await apiClient.update_schedule(
          { scheduleId: editingSchedule.id },
          {
            title,
            description,
            cronExpr,
            pause: undefined
          }
        );
        toast.success('Schedule updated successfully');
      } else {
        // Create new schedule
        await apiClient.create_schedule({
          title,
          description,
          endpoint: endpointWithParams,
          cronExpr,
          uiMetadata: {
            sources: [
              {
                description: `Board members eligible for engagement emails`,
              }
            ],
            destinations: [
              {
                serviceName: 'resend.com',
                description: `Email drafts via ${scheduleForm.aiProvider} ${scheduleForm.aiModel}`
              }
            ]
          }
        });
        toast.success('Schedule created successfully');
      }

      setShowScheduleDialog(false);
      setEditingSchedule(null);
      setScheduleForm({
        frequency: 'weekly',
        time: '09:00',
        days: [1, 3, 5],
        aiProvider: 'openai',
        aiModel: 'gpt-4o-mini',
        batchSize: 'all'
      });
      await loadSchedules();
    } catch (error: any) {
      console.error('Failed to save schedule:', error);
      toast.error(`Failed to save schedule: ${error.message || 'Unknown error'}`);
    }
  };

  const handleToggleSchedule = async (scheduleId: string, isPaused: boolean) => {
    try {
      await apiClient.update_schedule(
        { scheduleId },
        {
          pause: !isPaused
        }
      );
      toast.success(isPaused ? 'Schedule resumed' : 'Schedule paused');
      await loadSchedules();
    } catch (error: any) {
      console.error('Failed to toggle schedule:', error);
      toast.error(`Failed to toggle schedule: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) {
      return;
    }

    try {
      await apiClient.delete_schedule({ scheduleId });
      toast.success('Schedule deleted successfully');
      await loadSchedules();
    } catch (error: any) {
      console.error('Failed to delete schedule:', error);
      toast.error(`Failed to delete schedule: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="flex gap-8">
            {/*<BackOfficeNav />*/}
          
          <div className="flex-1">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Board Engagement Emails</h1>
              <p className="text-muted-foreground">
                Manage AI-powered engagement emails sent to board members 3x per week
              </p>
            </div>

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Total Sent
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total_sent}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Open Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.open_rate}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.total_opened} opened
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Click Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.click_rate}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.total_clicked} clicked
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Avg Opens
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.avg_opens_per_email}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      per email
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 mb-6 items-start">
              <div className="flex gap-2 items-center flex-wrap">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <Button 
                      onClick={handleGenerateDrafts}
                      disabled={generating}
                      className="gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      {generating ? "Generating..." : "Generate Drafts"}
                    </Button>

                    {/* Cost Estimate Badge */}
                    {costEstimate && (
                      <Badge 
                        variant="outline" 
                        className="gap-2 px-3 py-1.5 text-xs font-mono"
                      >
                        <span className="text-muted-foreground">Est. cost:</span>
                        <span className="font-bold">
                          ${costEstimate.totalCost.toFixed(4)}
                        </span>
                      </Badge>
                    )}
                  </div>

                  {/* Cost Breakdown */}
                  {costEstimate && (
                    <div className="text-xs text-muted-foreground flex gap-3">
                      <span>{costEstimate.recipientsCount} recipients</span>
                      <span>•</span>
                      <span>{((costEstimate.totalInputTokens + costEstimate.totalOutputTokens) / 1000).toFixed(1)}k tokens</span>
                      <span>•</span>
                      <span>{costEstimate.model}</span>
                    </div>
                  )}
                </div>

                {/* AI Provider Selector */}
                <Select
                  value={aiProvider}
                  onValueChange={(value) => {
                    setAiProvider(value as "openai" | "anthropic" | "gemini");
                    // Set default model for selected provider
                    setSelectedModel(AI_MODELS[value as keyof typeof AI_MODELS][0].value);
                  }}
                  disabled={generating}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        OpenAI
                      </div>
                    </SelectItem>
                    <SelectItem value="gemini">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Google Gemini
                      </div>
                    </SelectItem>
                    <SelectItem value="anthropic">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Anthropic
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Model Selector */}
                <Select
                  value={selectedModel}
                  onValueChange={setSelectedModel}
                  disabled={generating}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Select Model" />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODELS[aiProvider].map(model => (
                      <SelectItem key={model.value} value={model.value}>
                        <div className="flex flex-col">
                          <div className="font-medium">{model.label}</div>
                          <div className="text-xs text-muted-foreground flex gap-2">
                            <span className={model.speed === "Fast" ? "text-green-600" : model.speed === "Slow" ? "text-amber-600" : "text-blue-600"}>
                              {model.speed}
                            </span>
                            <span>•</span>
                            <span className={model.cost === "Low" ? "text-green-600" : model.cost === "High" ? "text-red-600" : "text-amber-600"}>
                              {model.cost} cost
                            </span>
                            <span>•</span>
                            <span>{model.quality}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Batch Size Selector */}
                <Select
                  value={batchSize.toString()}
                  onValueChange={(value) => setBatchSize(value === "all" ? "all" : parseInt(value))}
                  disabled={generating}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Batch Size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 members</SelectItem>
                    <SelectItem value="10">10 members</SelectItem>
                    <SelectItem value="20">20 members</SelectItem>
                    <SelectItem value="50">50 members</SelectItem>
                    <SelectItem value="all">All members</SelectItem>
                  </SelectContent>
                </Select>

                {/* Feature Preview Button */}
                <Button
                  onClick={() => setShowFeaturePreview(!showFeaturePreview)}
                  variant="outline"
                  className="gap-2"
                  disabled={generating}
                >
                  <Eye className="h-4 w-4" />
                  {showFeaturePreview ? "Hide Preview" : "Preview Feature"}
                </Button>
              </div>

              {/* Approve and Send Buttons */}
              <div className="flex gap-2 ml-auto">
                {draftsByStatus.draft.length > 0 && (
                  <Button 
                    onClick={() => handleApproveDrafts(draftsByStatus.draft.map(d => d.id))}
                    disabled={loading}
                    variant="outline"
                    className="gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve All ({draftsByStatus.draft.length})
                  </Button>
                )}

                {draftsByStatus.approved.length > 0 && (
                  <Button 
                    onClick={() => handleSendEmails(draftsByStatus.approved.map(d => d.id))}
                    disabled={sending}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Send className="h-4 w-4" />
                    {sending ? "Sending..." : `Send ${draftsByStatus.approved.length} Emails`}
                  </Button>
                )}
              </div>
            </div>

            {/* Feature Preview Panel */}
            {showFeaturePreview && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                      Next Feature to Highlight
                    </div>
                    {nextFeaturePreview && (
                      <Badge variant="outline">
                        {nextFeaturePreview.times_sent || 0} times sent
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    This feature will be highlighted in the next batch of drafts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!nextFeaturePreview ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-lg mb-2">{nextFeaturePreview.name}</h3>
                          <p className="text-muted-foreground">{nextFeaturePreview.description}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm mb-1">What they'll learn:</h4>
                          <p className="text-sm text-muted-foreground">{nextFeaturePreview.detailed_explanation}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm mb-1">Call to Action:</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{nextFeaturePreview.cta_text}</span>
                            <span className="text-xs text-muted-foreground">→ {nextFeaturePreview.cta_url}</span>
                          </div>
                        </div>
                        <div className="pt-4">
                          <div className="text-sm font-medium mb-2">Will be sent to:</div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-2xl font-bold">{batchSize === "all" ? "All" : batchSize}</span>
                            <span className="text-muted-foreground">board members</span>
                          </div>
                        </div>
                      </div>
                      {nextFeaturePreview.feature_image_url && (
                        <div>
                          <img 
                            src={nextFeaturePreview.feature_image_url} 
                            alt={nextFeaturePreview.name}
                            className="w-full h-64 object-cover rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Generation Progress */}
            {generationProgress.status !== 'idle' && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {generationProgress.status === 'generating' && (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    )}
                    {generationProgress.status === 'complete' && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {generationProgress.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                    Draft Generation Progress
                  </CardTitle>
                  <CardDescription>
                    {generationProgress.message}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  {generationProgress.total > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">
                          {generationProgress.current} of {generationProgress.total}
                        </span>
                      </div>
                      <Progress 
                        value={(generationProgress.current / generationProgress.total) * 100} 
                        className="h-2"
                      />
                    </div>
                  )}

                  {/* Current Recipient */}
                  {generationProgress.currentRecipient && generationProgress.status === 'generating' && (
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-muted-foreground">Generating for:</span>
                      <span className="font-medium">{generationProgress.currentRecipient}</span>
                    </div>
                  )}

                  {/* Error Alert */}
                  {generationProgress.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>{generationProgress.error.type === 'rate_limit' ? 'AI Rate Limit Reached' : 'Generation Error'}</AlertTitle>
                      <AlertDescription>
                        <p className="mb-2">{generationProgress.error.message}</p>
                        <p className="text-sm font-medium">{generationProgress.error.action}</p>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Summary */}
                  {generationProgress.summary && generationProgress.status === 'complete' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">
                            <span className="font-bold text-green-600">{generationProgress.summary.created}</span> drafts created
                          </span>
                        </div>
                        {generationProgress.summary.failed > 0 && (
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-destructive" />
                            <span className="text-sm">
                              <span className="font-bold text-destructive">{generationProgress.summary.failed}</span> failed
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Failed Recipients */}
                      {generationProgress.summary.failedRecipients && generationProgress.summary.failedRecipients.length > 0 && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Failed Recipients</AlertTitle>
                          <AlertDescription>
                            <ul className="mt-2 space-y-1">
                              {generationProgress.summary.failedRecipients.map((failed, idx) => (
                                <li key={idx} className="text-sm">
                                  <span className="font-medium">{failed.name}:</span> {failed.error}
                                </li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="drafts">Drafts ({draftsByStatus.draft.length})</TabsTrigger>
                <TabsTrigger value="approved">Approved ({draftsByStatus.approved.length})</TabsTrigger>
                <TabsTrigger value="sent">Sent ({draftsByStatus.sent.length})</TabsTrigger>
                <TabsTrigger value="features">Features ({features.length})</TabsTrigger>
                <TabsTrigger value="automation">
                  <Zap className="h-4 w-4 mr-1" />
                  Automation
                </TabsTrigger>
                <TabsTrigger value="schedules">
                  <Clock className="h-4 w-4 mr-1" />
                  Schedules
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Automation Config Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Automation Settings
                      </CardTitle>
                      <CardDescription>Configure how engagement messages are sent</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {config ? (
                        <>
                          <div className="flex items-center justify-between space-x-2">
                            <div className="space-y-1">
                              <Label htmlFor="auto-send" className="font-medium">Auto-Send Enabled</Label>
                              <p className="text-sm text-muted-foreground">
                                Automatically send emails when scheduled without manual approval
                              </p>
                            </div>
                            <Switch
                              id="auto-send"
                              checked={config.auto_send_enabled}
                              onCheckedChange={(checked) => handleUpdateConfig({ auto_send_enabled: checked })}
                              disabled={updatingConfig}
                            />
                          </div>
                          
                          <div className="space-y-3">
                            <Label className="font-medium">Delivery Channels</Label>
                            <div className="grid grid-cols-1 gap-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  id="channel-email" 
                                  checked={config.default_channels?.includes("email")}
                                  onCheckedChange={() => toggleChannel("email")}
                                  disabled={updatingConfig}
                                />
                                <Label htmlFor="channel-email" className="flex items-center gap-2 cursor-pointer">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  Email (Resend)
                                </Label>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  id="channel-push" 
                                  checked={config.default_channels?.includes("push")}
                                  onCheckedChange={() => toggleChannel("push")}
                                  disabled={updatingConfig}
                                />
                                <Label htmlFor="channel-push" className="flex items-center gap-2 cursor-pointer">
                                  <Bell className="h-4 w-4 text-muted-foreground" />
                                  Web Push (Pushwoosh)
                                </Label>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  id="channel-sms" 
                                  checked={config.default_channels?.includes("sms")}
                                  onCheckedChange={() => toggleChannel("sms")}
                                  disabled={updatingConfig}
                                />
                                <Label htmlFor="channel-sms" className="flex items-center gap-2 cursor-pointer">
                                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                                  SMS (Pushwoosh)
                                </Label>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Messages will be sent via all selected channels simultaneously.
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center py-4">
                          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Scheduler Status</CardTitle>
                      <CardDescription>Automated email schedule information</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Frequency</span>
                          <Badge variant="outline">3x per week</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Days</span>
                          <span className="text-sm text-muted-foreground">Monday, Wednesday, Friday</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Time</span>
                          <span className="text-sm text-muted-foreground">9:00 AM SAST</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Next Run</span>
                          <Badge className="bg-blue-600">Check Automations Tab</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Sends</CardTitle>
                    <CardDescription>Latest engagement emails sent to board members</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {stats && stats.recent_sends.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Recipient</TableHead>
                            <TableHead>Feature</TableHead>
                            <TableHead>Sent</TableHead>
                            <TableHead>Opens</TableHead>
                            <TableHead>Clicks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stats.recent_sends.map((send: any) => (
                            <TableRow key={send.id}>
                              <TableCell className="font-medium">{send.recipient_name}</TableCell>
                              <TableCell>{send.feature_name}</TableCell>
                              <TableCell>{formatDate(send.sent_at)}</TableCell>
                              <TableCell>{send.opened_count}</TableCell>
                              <TableCell>{send.clicked_count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No emails sent yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Drafts Tab */}
              <TabsContent value="drafts">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Draft Emails</CardTitle>
                        <CardDescription>Review and approve drafts before sending</CardDescription>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {filteredAndSortedDrafts.length} draft{filteredAndSortedDrafts.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Search and Filters */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                      {/* Search */}
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search by recipient name, email, or subject..."
                            value={draftsSearch}
                            onChange={(e) => setDraftsSearch(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      
                      {/* Feature Filter */}
                      <select
                        value={draftsFilter}
                        onChange={(e) => setDraftsFilter(e.target.value)}
                        className="px-3 py-2 border rounded-md bg-background"
                      >
                        <option value="">All Features</option>
                        {uniqueFeatures.map((feature) => (
                          <option key={feature} value={feature}>
                            {feature}
                          </option>
                        ))}
                      </select>

                      {/* Sort */}
                      <select
                        value={draftsSort.field}
                        onChange={(e) => setDraftsSort({ ...draftsSort, field: e.target.value })}
                        className="px-3 py-2 border rounded-md bg-background"
                      >
                        <option value="created_at">Sort by Created Date</option>
                        <option value="scheduled_send_date">Sort by Scheduled Date</option>
                        <option value="recipient_name">Sort by Recipient</option>
                        <option value="feature_name">Sort by Feature</option>
                      </select>

                      {/* Sort Order */}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDraftsSort({ ...draftsSort, direction: draftsSort.direction === 'asc' ? 'desc' : 'asc' })}
                      >
                        {draftsSort.direction === 'asc' ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Table */}
                    {filteredAndSortedDrafts.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Recipient</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Feature</TableHead>
                            <TableHead>Scheduled</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAndSortedDrafts.map((draft) => (
                            <TableRow key={draft.id}>
                              <TableCell className="font-medium">{draft.recipient_name}</TableCell>
                              <TableCell className="max-w-xs truncate">{draft.subject_line}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{draft.feature_name}</Badge>
                              </TableCell>
                              <TableCell>{formatDate(draft.scheduled_send_date)}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewDraft(draft.id)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveDrafts([draft.id])}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No drafts available. Click "Generate Drafts" to create new ones.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Approved Tab */}
              <TabsContent value="approved">
                <Card>
                  <CardHeader>
                    <CardTitle>Approved Emails</CardTitle>
                    <CardDescription>Ready to send to board members</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Search and Filters */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                      {/* Search */}
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search by recipient name, email, or subject..."
                            value={approvedSearch}
                            onChange={(e) => setApprovedSearch(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      
                      {/* Feature Filter */}
                      <select
                        value={approvedFilter}
                        onChange={(e) => setApprovedFilter(e.target.value)}
                        className="px-3 py-2 border rounded-md bg-background"
                      >
                        <option value="">All Features</option>
                        {uniqueFeatures.map((feature) => (
                          <option key={feature} value={feature}>
                            {feature}
                          </option>
                        ))}
                      </select>

                      {/* Sort */}
                      <select
                        value={approvedSort.field}
                        onChange={(e) => setApprovedSort({ ...approvedSort, field: e.target.value })}
                        className="px-3 py-2 border rounded-md bg-background"
                      >
                        <option value="approved_at">Approved Date</option>
                        <option value="recipient_name">Recipient</option>
                        <option value="feature_name">Feature</option>
                      </select>

                      {/* Sort Order */}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setApprovedSort({ ...approvedSort, direction: approvedSort.direction === 'asc' ? 'desc' : 'asc' })}
                      >
                        {approvedSort.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                      </Button>
                    </div>

                    {filteredAndSortedApproved.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Recipient</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Feature</TableHead>
                            <TableHead>Scheduled</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAndSortedApproved.map((draft) => (
                            <TableRow key={draft.id}>
                              <TableCell className="font-medium">{draft.recipient_name}</TableCell>
                              <TableCell className="max-w-xs truncate">{draft.subject_line}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{draft.feature_name}</Badge>
                              </TableCell>
                              <TableCell>{formatDate(draft.scheduled_send_date)}</TableCell>
                              <TableCell>
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewDraft(draft.id)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleSendEmails([draft.id])}
                                    disabled={sending}
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        {draftsByStatus.approved.length > 0 ? 'No approved emails match your filters.' : 'No approved emails. Approve drafts to send them.'}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Sent Tab */}
              <TabsContent value="sent">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Sent Emails</CardTitle>
                        <CardDescription>Successfully delivered engagement emails</CardDescription>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {filteredAndSortedSentEmails.length} email{filteredAndSortedSentEmails.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Search and Filters */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                      {/* Search */}
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search by recipient name, email, or subject..."
                            value={sentSearchQuery}
                            onChange={(e) => setSentSearchQuery(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      
                      {/* Feature Filter */}
                      <select
                        value={sentFeatureFilter}
                        onChange={(e) => setSentFeatureFilter(e.target.value)}
                        className="px-3 py-2 border rounded-md bg-background"
                      >
                        <option value="all">All Features</option>
                        {uniqueFeatures.map((feature) => (
                          <option key={feature} value={feature}>
                            {feature}
                          </option>
                        ))}
                      </select>

                      {/* Sort */}
                      <select
                        value={sentSortBy}
                        onChange={(e) => setSentSortBy(e.target.value as any)}
                        className="px-3 py-2 border rounded-md bg-background"
                      >
                        <option value="date">Sort by Date</option>
                        <option value="recipient">Sort by Recipient</option>
                        <option value="feature">Sort by Feature</option>
                      </select>

                      {/* Sort Order */}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setSentSortOrder(sentSortOrder === "asc" ? "desc" : "asc")}
                      >
                        {sentSortOrder === "asc" ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Table */}
                    {filteredAndSortedSentEmails.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Recipient</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Feature</TableHead>
                            <TableHead>Sent Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAndSortedSentEmails.map((draft) => (
                            <TableRow key={draft.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{draft.recipient_name}</div>
                                  <div className="text-sm text-muted-foreground">{draft.recipient_email}</div>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">{draft.subject_line}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{draft.feature_name}</Badge>
                              </TableCell>
                              <TableCell>{formatDate(draft.sent_at)}</TableCell>
                              <TableCell>
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewDraft(draft.id)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleResendEmail(draft)}
                                    disabled={sending}
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        {sentSearchQuery || sentFeatureFilter !== "all" 
                          ? "No emails match your filters"
                          : "No emails sent yet"}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Features Tab */}
              <TabsContent value="features">
                <Card>
                  <CardHeader>
                    <CardTitle>Feature Highlights</CardTitle>
                    <CardDescription>Platform features rotated in engagement emails</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Search and Filters */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                      {/* Search */}
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search by name, description, or category..."
                            value={featuresSearch}
                            onChange={(e) => setFeaturesSearch(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      
                      {/* Status Filter */}
                      <select
                        value={featuresFilter}
                        onChange={(e) => setFeaturesFilter(e.target.value)}
                        className="px-3 py-2 border rounded-md bg-background"
                      >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>

                      {/* Sort */}
                      <select
                        value={featuresSort.field}
                        onChange={(e) => setFeaturesSort({ ...featuresSort, field: e.target.value })}
                        className="px-3 py-2 border rounded-md bg-background"
                      >
                        <option value="times_sent">Sort by Times Sent</option>
                        <option value="name">Sort by Name</option>
                        <option value="category">Sort by Category</option>
                        <option value="last_sent_at">Sort by Last Sent</option>
                      </select>

                      {/* Sort Order */}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setFeaturesSort({ ...featuresSort, direction: featuresSort.direction === 'asc' ? 'desc' : 'asc' })}
                      >
                        {featuresSort.direction === 'asc' ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Table */}
                    {features.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Feature</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Times Sent</TableHead>
                            <TableHead>Last Sent</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAndSortedFeatures.map((feature) => (
                            <TableRow key={feature.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{feature.name}</div>
                                  <div className="text-sm text-muted-foreground">{feature.description}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{feature.category}</Badge>
                              </TableCell>
                              <TableCell>{feature.times_sent}</TableCell>
                              <TableCell>{formatDate(feature.last_sent_at)}</TableCell>
                              <TableCell>
                                {feature.is_active ? (
                                  <Badge className="bg-green-600">Active</Badge>
                                ) : (
                                  <Badge variant="secondary">Inactive</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        {featuresSearch || featuresFilter
                          ? "No features match your filters"
                          : "No feature highlights configured. Seed data to get started."}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Automation Tab */}
              <TabsContent value="automation" className="space-y-6">
                {/* Stats Cards */}
                {automationStats && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Repeat className="h-4 w-4" />
                          Eligible for Resend
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{automationStats.eligible_now?.resend_unopened || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Unopened emails &gt; 3 days old
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          Eligible for Follow-up
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{automationStats.eligible_now?.followup_engaged || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Opened but not clicked
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Archive className="h-4 w-4" />
                          Eligible for Archive
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{automationStats.eligible_now?.archive_old || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Sent emails &gt; 30 days old
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Repeat className="h-5 w-5" />
                        Auto-Resend Unopened
                      </CardTitle>
                      <CardDescription>
                        Automatically resend emails that haven't been opened after 3 days
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        {automationRules.find(r => r.rule_type === 'auto_resend_unopened')?.enabled ? (
                          <Badge className="bg-green-600">Enabled</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleExecuteAutomation('resend_unopened')}
                          disabled={executingAction === 'resend_unopened' || !automationStats?.eligible_now?.resend_unopened}
                          className="flex-1"
                        >
                          {executingAction === 'resend_unopened' ? (
                            <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Running...</>
                          ) : (
                            <><Repeat className="h-4 w-4 mr-2" /> Run Now</>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const rule = automationRules.find(r => r.rule_type === 'auto_resend_unopened');
                            if (rule) handleToggleRule(rule.id, rule.enabled);
                          }}
                        >
                          {automationRules.find(r => r.rule_type === 'auto_resend_unopened')?.enabled ? 'Disable' : 'Enable'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Send className="h-5 w-5" />
                        Auto-Followup Engaged
                      </CardTitle>
                      <CardDescription>
                        Send follow-ups to users who opened but didn't click after 2 days
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        {automationRules.find(r => r.rule_type === 'auto_followup_engaged')?.enabled ? (
                          <Badge className="bg-green-600">Enabled</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleExecuteAutomation('followup_engaged')}
                          disabled={executingAction === 'followup_engaged' || !automationStats?.eligible_now?.followup_engaged}
                          className="flex-1"
                          variant="outline"
                        >
                          {executingAction === 'followup_engaged' ? (
                            <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Running...</>
                          ) : (
                            <><Send className="h-4 w-4 mr-2" /> Run Now</>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const rule = automationRules.find(r => r.rule_type === 'auto_followup_engaged');
                            if (rule) handleToggleRule(rule.id, rule.enabled);
                          }}
                        >
                          {automationRules.find(r => r.rule_type === 'auto_followup_engaged')?.enabled ? 'Disable' : 'Enable'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Archive className="h-5 w-5" />
                        Auto-Archive Old Emails
                      </CardTitle>
                      <CardDescription>
                        Archive sent emails older than 30 days to keep queue clean
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        {automationRules.find(r => r.rule_type === 'auto_archive')?.enabled ? (
                          <Badge className="bg-green-600">Enabled</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleExecuteAutomation('archive_old')}
                          disabled={executingAction === 'archive_old' || !automationStats?.eligible_now?.archive_old}
                          className="flex-1"
                          variant="outline"
                        >
                          {executingAction === 'archive_old' ? (
                            <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Running...</>
                          ) : (
                            <><Archive className="h-4 w-4 mr-2" /> Run Now</>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const rule = automationRules.find(r => r.rule_type === 'auto_archive');
                            if (rule) handleToggleRule(rule.id, rule.enabled);
                          }}
                        >
                          {automationRules.find(r => r.rule_type === 'auto_archive')?.enabled ? 'Disable' : 'Enable'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Schedule at Optimal Time
                      </CardTitle>
                      <CardDescription>
                        Queue pending emails to send at optimal times (9 AM default)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        {automationRules.find(r => r.rule_type === 'schedule_optimal')?.enabled ? (
                          <Badge className="bg-green-600">Enabled</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleExecuteAutomation('schedule_optimal')}
                          disabled={executingAction === 'schedule_optimal'}
                          className="flex-1"
                          variant="outline"
                        >
                          {executingAction === 'schedule_optimal' ? (
                            <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Running...</>
                          ) : (
                            <><Clock className="h-4 w-4 mr-2" /> Run Now</>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const rule = automationRules.find(r => r.rule_type === 'schedule_optimal');
                            if (rule) handleToggleRule(rule.id, rule.enabled);
                          }}
                        >
                          {automationRules.find(r => r.rule_type === 'schedule_optimal')?.enabled ? 'Disable' : 'Enable'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Execution History */}
                {automationStats?.execution_stats && automationStats.execution_stats.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Execution History (Last 30 Days)</CardTitle>
                      <CardDescription>Recent automation runs and their results</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Rule Type</TableHead>
                            <TableHead>Total Runs</TableHead>
                            <TableHead>Successful</TableHead>
                            <TableHead>Failed</TableHead>
                            <TableHead>Last Executed</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {automationStats.execution_stats.map((stat: any) => (
                            <TableRow key={stat.rule_type}>
                              <TableCell className="font-medium">
                                {stat.rule_type.replace('auto_', '').replace(/_/g, ' ')}
                              </TableCell>
                              <TableCell>{stat.total_executions}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  {stat.successful}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <XCircle className="h-4 w-4 text-red-600" />
                                  {stat.failed}
                                </div>
                              </TableCell>
                              <TableCell>{stat.last_executed ? formatDate(stat.last_executed) : 'Never'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Schedules Tab */}
              <TabsContent value="schedules" className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">Automated Draft Generation Schedules</h3>
                    <p className="text-sm text-muted-foreground">Create and manage scheduled draft generation runs</p>
                  </div>
                  <Button onClick={() => setShowScheduleDialog(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Schedule
                  </Button>
                </div>

                {/* Schedules List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Active Schedules</CardTitle>
                    <CardDescription>Automated runs will generate drafts based on these schedules</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {schedules.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p>No schedules configured yet</p>
                        <p className="text-sm">Create your first schedule to automate draft generation</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Schedule</TableHead>
                            <TableHead>AI Model</TableHead>
                            <TableHead>Batch Size</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {schedules.map((schedule) => (
                            <TableRow key={schedule.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{schedule.frequency}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {schedule.time} {schedule.frequency === 'weekly' && `on ${schedule.days.map((d: number) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d]).join(', ')}`}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>{schedule.aiProvider}</div>
                                  <div className="text-xs text-muted-foreground">{schedule.aiModel}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{schedule.batchSize === 'all' ? 'All members' : `${schedule.batchSize} members`}</Badge>
                              </TableCell>
                              <TableCell>
                                {schedule.paused ? (
                                  <Badge variant="secondary">Paused</Badge>
                                ) : (
                                  <Badge className="bg-green-600">Active</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleToggleSchedule(schedule.id, schedule.paused)}
                                  >
                                    {schedule.paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingSchedule(schedule);
                                      setScheduleForm(schedule);
                                      setShowScheduleDialog(true);
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteSchedule(schedule.id)}
                                  >
                                    <Trash className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              {selectedDraft?.recipient_name} - {selectedDraft?.subject_line}
            </DialogDescription>
          </DialogHeader>
          {selectedDraft && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">To:</span> {selectedDraft.recipient_email}
                </div>
                <div>
                  <span className="font-medium">Feature:</span> {selectedDraft.feature_name}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {getStatusBadge(selectedDraft.status)}
                </div>
                <div>
                  <span className="font-medium">Scheduled:</span> {formatDate(selectedDraft.scheduled_send_date)}
                </div>
              </div>
              <div className="border rounded-lg p-4 bg-white">
                <div dangerouslySetInnerHTML={{ __html: selectedDraft.email_html }} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Creation/Edit Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}</DialogTitle>
            <DialogDescription>
              Configure automated draft generation with AI model and batch settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Frequency Selection */}
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={scheduleForm.frequency}
                onValueChange={(value) => setScheduleForm({ ...scheduleForm, frequency: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly (1st of month)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Selection */}
            <div className="space-y-2">
              <Label>Time (SAST)</Label>
              <Input
                type="time"
                value={scheduleForm.time}
                onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
              />
            </div>

            {/* Days Selection (Weekly only) */}
            {scheduleForm.frequency === 'weekly' && (
              <div className="space-y-2">
                <Label>Days of Week</Label>
                <div className="flex gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                    <Button
                      key={day}
                      type="button"
                      variant={scheduleForm.days.includes(idx) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const days = scheduleForm.days.includes(idx)
                          ? scheduleForm.days.filter(d => d !== idx)
                          : [...scheduleForm.days, idx].sort();
                        setScheduleForm({ 
                          ...scheduleForm, 
                          days });
                      }}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* AI Provider */}
            <div className="space-y-2">
              <Label>AI Provider</Label>
              <Select
                value={scheduleForm.aiProvider}
                onValueChange={(value) => {
                  const provider = value as 'openai' | 'anthropic' | 'gemini';
                  setScheduleForm({ 
                    ...scheduleForm, 
                    aiProvider: provider,
                    aiModel: AI_MODELS[provider][0].value
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* AI Model */}
            <div className="space-y-2">
              <Label>AI Model</Label>
              <Select
                value={scheduleForm.aiModel}
                onValueChange={(value) => setScheduleForm({ ...scheduleForm, aiModel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODELS[scheduleForm.aiProvider].map(model => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Batch Size */}
            <div className="space-y-2">
              <Label>Batch Size</Label>
              <Select
                value={scheduleForm.batchSize.toString()}
                onValueChange={(value) => setScheduleForm({ 
                  ...scheduleForm, 
                  batchSize: value === 'all' ? 'all' : parseInt(value)
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 members</SelectItem>
                  <SelectItem value="10">10 members</SelectItem>
                  <SelectItem value="20">20 members</SelectItem>
                  <SelectItem value="50">50 members</SelectItem>
                  <SelectItem value="all">All members</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowScheduleDialog(false);
                  setEditingSchedule(null);
                  setScheduleForm({
                    frequency: 'weekly',
                    time: '09:00',
                    days: [1, 3, 5],
                    aiProvider: 'openai',
                    aiModel: 'gpt-4o-mini',
                    batchSize: 'all'
                  });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveSchedule}>
                {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Feature Dialog */}
      <Dialog open={showCreateFeatureDialog} onOpenChange={setShowCreateFeatureDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Feature</DialogTitle>
            <DialogDescription>Add a new feature highlight for board member engagement emails</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="feature-name">Feature Name *</Label>
              <Input
                id="feature-name"
                placeholder="e.g., Real-Time Board Portal Dashboard"
                value={featureForm.name}
                onChange={(e) => setFeatureForm({ ...featureForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feature-description">Short Description *</Label>
              <Input
                id="feature-description"
                placeholder="Brief one-liner about the feature"
                value={featureForm.description}
                onChange={(e) => setFeatureForm({ ...featureForm, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feature-detailed">Detailed Explanation *</Label>
              <Textarea
                id="feature-detailed"
                placeholder="Full description of the feature, benefits, and how it helps board members"
                value={featureForm.detailed_explanation}
                onChange={(e) => setFeatureForm({ ...featureForm, detailed_explanation: e.target.value })}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="feature-cta">Call-to-Action Text *</Label>
                <Input
                  id="feature-cta"
                  placeholder="e.g., View Dashboard"
                  value={featureForm.cta_text}
                  onChange={(e) => setFeatureForm({ ...featureForm, cta_text: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feature-url">CTA URL *</Label>
                <Input
                  id="feature-url"
                  placeholder="https://..."
                  value={featureForm.cta_url}
                  onChange={(e) => setFeatureForm({ ...featureForm, cta_url: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="feature-category">Category</Label>
                <Select
                  value={featureForm.category}
                  onValueChange={(value) => setFeatureForm({ ...featureForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform">Platform</SelectItem>
                    <SelectItem value="governance">Governance</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                    <SelectItem value="communication">Communication</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feature-image">Image URL (Optional)</Label>
                <Input
                  id="feature-image"
                  placeholder="https://..."
                  value={featureForm.feature_image_url}
                  onChange={(e) => setFeatureForm({ ...featureForm, feature_image_url: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateFeatureDialog(false);
                  resetFeatureForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateFeature} disabled={creatingFeature}>
                {creatingFeature ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  <><Plus className="h-4 w-4 mr-2" /> Create Feature</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Feature with AI Dialog */}
      <Dialog open={showGenerateFeatureDialog} onOpenChange={setShowGenerateFeatureDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Generate Feature with AI
            </DialogTitle>
            <DialogDescription>
              Describe the feature you want to highlight, and AI will generate comprehensive content
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-prompt">Feature Prompt *</Label>
              <Textarea
                id="ai-prompt"
                placeholder="e.g., Create a feature about our new investment portfolio tracking system that shows real-time performance metrics and dividend history"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Be specific about the feature's purpose, benefits, and target audience
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>AI Provider</Label>
                <Select
                  value={featureAiProvider}
                  onValueChange={(value: any) => {
                    setFeatureAiProvider(value);
                    setFeatureAiModel(AI_MODELS[value][0].value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>AI Model</Label>
                <Select value={featureAiModel} onValueChange={setFeatureAiModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODELS[featureAiProvider].map(model => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowGenerateFeatureDialog(false);
                  setAiPrompt('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleGenerateFeature} disabled={generatingFeature}>
                {generatingFeature ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><Wand2 className="h-4 w-4 mr-2" /> Generate Feature</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Feature Dialog */}
      <Dialog open={showEditFeatureDialog} onOpenChange={setShowEditFeatureDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Feature</DialogTitle>
            <DialogDescription>Update feature highlight information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-feature-name">Feature Name *</Label>
              <Input
                id="edit-feature-name"
                value={featureForm.name}
                onChange={(e) => setFeatureForm({ ...featureForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-feature-description">Short Description *</Label>
              <Input
                id="edit-feature-description"
                value={featureForm.description}
                onChange={(e) => setFeatureForm({ ...featureForm, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-feature-detailed">Detailed Explanation *</Label>
              <Textarea
                id="edit-feature-detailed"
                value={featureForm.detailed_explanation}
                onChange={(e) => setFeatureForm({ ...featureForm, detailed_explanation: e.target.value })}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-feature-cta">Call-to-Action Text *</Label>
                <Input
                  id="edit-feature-cta"
                  value={featureForm.cta_text}
                  onChange={(e) => setFeatureForm({ ...featureForm, cta_text: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-feature-url">CTA URL *</Label>
                <Input
                  id="edit-feature-url"
                  value={featureForm.cta_url}
                  onChange={(e) => setFeatureForm({ ...featureForm, cta_url: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-feature-category">Category</Label>
                <Select
                  value={featureForm.category}
                  onValueChange={(value) => setFeatureForm({ ...featureForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform">Platform</SelectItem>
                    <SelectItem value="governance">Governance</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                    <SelectItem value="communication">Communication</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-feature-image">Image URL (Optional)</Label>
                <Input
                  id="edit-feature-image"
                  value={featureForm.feature_image_url}
                  onChange={(e) => setFeatureForm({ ...featureForm, feature_image_url: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditFeatureDialog(false);
                  setEditingFeature(null);
                  resetFeatureForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleEditFeature} disabled={creatingFeature}>
                {creatingFeature ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating...</>
                ) : (
                  <><Check className="h-4 w-4 mr-2" /> Update Feature</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default BackOfficeEngagement;
