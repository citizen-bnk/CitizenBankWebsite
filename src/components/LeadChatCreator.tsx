import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, X, CheckCircle2, Circle, MessageSquare, TrendingUp, AlertCircle, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { apiClient } from "app";
import type { AppApisLeadChatSendMessageResponse, ExtractedData as ApiExtractedData } from "types";

export interface Props {
  open: boolean;
  onClose: () => void;
  onLeadCreated: (leadId: number) => void;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface ExtractedData {
  full_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  country?: string;
  investment_interest_amount?: number;
  preferred_share_class?: string;
  lead_source?: string;
  notes?: string;
}

const STAGE_INFO: Record<string, { label: string; color: string }> = {
  STAGE_1_GREETING: { label: "Greeting & Qualification", color: "bg-blue-500" },
  STAGE_2_ASSESSMENT: { label: "Interest Assessment", color: "bg-purple-500" },
  STAGE_3_RECOMMENDATION: { label: "Product Recommendation", color: "bg-indigo-500" },
  STAGE_4_CONTACT_DETAILS: { label: "Contact Details", color: "bg-green-500" },
  STAGE_5_ASSIGNMENT: { label: "Assignment & Follow-up", color: "bg-yellow-500" },
  STAGE_6_CONFIRMATION: { label: "Confirmation", color: "bg-orange-600" },
};

export const LeadChatCreator = ({ open, onClose, onLeadCreated }: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData>({});
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [completionPercentage, setCompletionPercentage] = useState<number>(0);
  const [readyToCreate, setReadyToCreate] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Initialize conversation when dialog opens
  useEffect(() => {
    if (open && messages.length === 0) {
      initializeConversation();
    }
  }, [open]);

  const initializeConversation = async () => {
    try {
      setIsLoading(true);
      
      const response = await apiClient.start_conversation();
      const data = await response.json();
      
      setConversationId(data.conversation_id);
      
      const greeting: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: data.initial_message,
        timestamp: new Date(),
      };
      
      setMessages([greeting]);
      setCurrentStage("STAGE_1_GREETING");
      setCompletionPercentage(0);
    } catch (error) {
      console.error("Error initializing conversation:", error);
      toast.error("Failed to start conversation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !conversationId) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await apiClient.send_message({
        conversation_id: conversationId,
        message: userMessage.content,
      });
      
      const data: AppApisLeadChatSendMessageResponse = await response.json();
      
      const aiResponse: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: data.ai_response,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, aiResponse]);
      
      // Update extracted data
      const newExtractedData: ExtractedData = {
        full_name: data.extracted_data.full_name,
        email: data.extracted_data.email,
        phone: data.extracted_data.phone,
        company: data.extracted_data.company,
        country: data.extracted_data.country,
        investment_interest_amount: data.extracted_data.investment_interest_amount,
        preferred_share_class: data.extracted_data.preferred_share_class,
        lead_source: data.extracted_data.lead_source,
        notes: data.extracted_data.notes,
      };
      setExtractedData(newExtractedData);
      
      // Update stage and progress
      if (data.current_stage) {
        setCurrentStage(data.current_stage);
      }
      if (data.completion_percentage !== null && data.completion_percentage !== undefined) {
        setCompletionPercentage(data.completion_percentage);
      }
      setReadyToCreate(data.ready_to_create);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCreateLead = async () => {
    if (!conversationId || !readyToCreate) return;
    
    try {
      setIsLoading(true);
      
      const response = await apiClient.complete_conversation_and_create_lead({
        conversation_id: conversationId,
        extracted_data: extractedData as any,
      });
      
      const data = await response.json();
      
      toast.success("Lead created successfully!");
      onLeadCreated(data.lead_id);
      handleClose();
    } catch (error) {
      console.error("Error creating lead:", error);
      toast.error("Failed to create lead");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setMessages([]);
    setExtractedData({});
    setConversationId(null);
    setCurrentStage(null);
    setCompletionPercentage(0);
    setReadyToCreate(false);
    onClose();
  };

  const stageInfo = currentStage && STAGE_INFO[currentStage] ? STAGE_INFO[currentStage] : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Create Lead with AI
              </DialogTitle>
              <DialogDescription className="mt-1">
                Have a natural conversation to capture lead information
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {readyToCreate ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Ready to Create
                </Badge>
              ) : (
                <Badge variant="outline">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {completionPercentage}% Complete
                </Badge>
              )}
            </div>
          </div>
          
          {/* Progress Bar and Stage */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {stageInfo ? stageInfo.label : "Initializing..."}
              </span>
              <span className="font-medium">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>
        </DialogHeader>

        <div className="flex-1 flex gap-4 px-6 pb-6 overflow-hidden">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col gap-4">
            <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === "user"
                          ? "bg-orange-600 dark:bg-orange-500 text-white"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          message.role === "user"
                            ? "text-orange-100"
                            : "text-muted-foreground"
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        AI is typing...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Type your message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Extracted Data Sidebar */}
          <Card className="w-80 flex flex-col">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Extracted Information</span>
                {readyToCreate && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Information collected from the conversation
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              <div className="space-y-4">
                {/* Core Contact Fields */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    Contact Information
                    {extractedData.full_name && extractedData.email && (
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    )}
                  </h4>
                  <div className="space-y-2">
                    {[
                      { key: "full_name", label: "Full Name", required: true },
                      { key: "email", label: "Email", required: true },
                      { key: "phone", label: "Phone", required: false },
                      { key: "company", label: "Company", required: false },
                      { key: "country", label: "Country", required: false },
                    ].map((field) => {
                      const value = extractedData[field.key as keyof ExtractedData];
                      const hasValue = !!value;
                      return (
                        <div
                          key={field.key}
                          className="flex items-start gap-2 text-sm p-2 rounded hover:bg-muted/50 transition-colors"
                        >
                          {hasValue ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          ) : field.required ? (
                            <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs text-muted-foreground">
                              {field.label}
                              {field.required && <span className="text-orange-600 ml-1">*</span>}
                            </p>
                            <p
                              className={`text-sm truncate ${
                                hasValue ? "font-medium" : "text-muted-foreground italic"
                              }`}
                            >
                              {value?.toString() || "Not collected yet"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Investment Details */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    Investment Interest
                    {extractedData.investment_interest_amount && (
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    )}
                  </h4>
                  <div className="space-y-2">
                    {[
                      { key: "investment_interest_amount", label: "Investment Amount", required: true, format: (v: any) => v ? `LSL ${Number(v).toLocaleString()}` : null },
                      { key: "preferred_share_class", label: "Preferred Share Class", required: false },
                    ].map((field) => {
                      const value = extractedData[field.key as keyof ExtractedData];
                      const displayValue = field.format && value ? field.format(value) : value;
                      const hasValue = !!value;
                      return (
                        <div
                          key={field.key}
                          className="flex items-start gap-2 text-sm p-2 rounded hover:bg-muted/50 transition-colors"
                        >
                          {hasValue ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          ) : field.required ? (
                            <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs text-muted-foreground">
                              {field.label}
                              {field.required && <span className="text-orange-600 ml-1">*</span>}
                            </p>
                            <p
                              className={`text-sm truncate ${
                                hasValue ? "font-medium" : "text-muted-foreground italic"
                              }`}
                            >
                              {displayValue?.toString() || "Not collected yet"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>

            {/* Action Buttons */}
            <div className="p-4 border-t space-y-2">
              {!readyToCreate && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded mb-2">
                  <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>
                    Continue the conversation to collect all required information
                  </span>
                </div>
              )}
              <Button
                onClick={handleCreateLead}
                disabled={!readyToCreate || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Create Lead
                  </>
                )}
              </Button>
              <Button
                onClick={handleClose}
                variant="outline"
                className="w-full"
                disabled={isLoading}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
