import { useState } from "react";
import { format } from "date-fns";
import { Eye, Copy, Check, MessageSquare, FileText, User, Calendar } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "app";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Props {
  leadId: number;
  leadSource?: string;
  triggerButton?: React.ReactNode;
}

interface LeadStory {
  story_id: number;
  lead_id: number;
  full_transcript: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
  ai_summary: string | null;
  key_points: string[];
  assignee: {
    type: string;
    user_id: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    assigned_at: string;
  } | null;
  follow_up: {
    next_contact_date: string;
    frequency: string;
    notes: string | null;
    status: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export { Props };

export function LeadStoryViewer({ leadId, leadSource, triggerButton }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [story, setStory] = useState<LeadStory | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("summary");

  const loadStory = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get_lead_story_endpoint(leadId);
      const data = await response.json();
      setStory(data);
    } catch (error: any) {
      if (error?.status === 404) {
        toast.error("No story found", {
          description: "This lead was created using the form, not the AI chat."
        });
      } else {
        toast.error("Failed to load story");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !story) {
      loadStory();
    }
  };

  const copyToClipboard = () => {
    if (!story) return;

    const transcript = story.full_transcript
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join("\n\n");

    const text = `
LEAD STORY - ID ${leadId}
${'='.repeat(50)}

SUMMARY:
${story.ai_summary || 'No summary available'}

KEY POINTS:
${story.key_points.map(point => `• ${point}`).join('\n')}

${'='.repeat(50)}

FULL TRANSCRIPT:

${transcript}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTimestamp = (isoString: string) => {
    try {
      return format(new Date(isoString), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return isoString;
    }
  };

  // Don't show viewer for non-AI leads
  if (leadSource && leadSource !== "ai_chat") {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4 mr-1" />
            View Story
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Lead Story
          </DialogTitle>
          <DialogDescription>
            AI-generated conversation and context for Lead #{leadId}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading story...</p>
            </div>
          </div>
        )}

        {!loading && !story && (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Story Available</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              This lead was created using the traditional form. Only leads created through AI chat have conversation stories.
            </p>
          </div>
        )}

        {!loading && story && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="gap-2"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy All"}
              </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="transcript">Full Transcript</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4 mt-4">
                <ScrollArea className="h-[500px] pr-4">
                  {/* AI Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">AI Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {story.ai_summary || "No summary available."}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Key Points */}
                  {story.key_points.length > 0 && (
                    <Card className="mt-4">
                      <CardHeader>
                        <CardTitle className="text-base">Key Highlights</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {story.key_points.map((point, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-orange-600 mt-1">•</span>
                              <span className="text-sm">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Assignee Info */}
                  {story.assignee && (
                    <Card className="mt-4">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Assigned To
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <Badge variant="outline">
                            {story.assignee.type === "back_office_user" ? "Back Office User" : "Custom Contact"}
                          </Badge>
                        </div>
                        {story.assignee.name && (
                          <p className="text-sm">
                            <span className="font-medium">Name:</span> {story.assignee.name}
                          </p>
                        )}
                        {story.assignee.email && (
                          <p className="text-sm">
                            <span className="font-medium">Email:</span> {story.assignee.email}
                          </p>
                        )}
                        {story.assignee.phone && (
                          <p className="text-sm">
                            <span className="font-medium">Phone:</span> {story.assignee.phone}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Assigned on {formatTimestamp(story.assignee.assigned_at)}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Follow-up Info */}
                  {story.follow_up && (
                    <Card className="mt-4">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Follow-up Schedule
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={story.follow_up.status === "pending" ? "default" : "secondary"}
                          >
                            {story.follow_up.status}
                          </Badge>
                          <Badge variant="outline">{story.follow_up.frequency}</Badge>
                        </div>
                        <p className="text-sm">
                          <span className="font-medium">Next Contact:</span>{" "}
                          {format(new Date(story.follow_up.next_contact_date), "MMM d, yyyy")}
                        </p>
                        {story.follow_up.notes && (
                          <p className="text-sm">
                            <span className="font-medium">Notes:</span> {story.follow_up.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Metadata */}
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-base">Story Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm text-muted-foreground">
                      <p>Created: {formatTimestamp(story.created_at)}</p>
                      <p>Last Updated: {formatTimestamp(story.updated_at)}</p>
                      <p>Messages: {story.full_transcript.length}</p>
                    </CardContent>
                  </Card>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="transcript" className="mt-4">
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {story.full_transcript.map((message, idx) => (
                      <div key={idx}>
                        <div
                          className={`p-4 rounded-lg ${
                            message.role === "user"
                              ? "bg-orange-50 dark:bg-orange-950/20 ml-8"
                              : "bg-muted mr-8"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant={message.role === "user" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {message.role === "user" ? "User" : "AI Assistant"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(message.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>
                        {idx < story.full_transcript.length - 1 && (
                          <Separator className="my-4" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
