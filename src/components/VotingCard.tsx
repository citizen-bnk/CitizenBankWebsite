import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Users, CheckCircle, XCircle, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

export interface VotingCardProps {
  session: {
    id: number;
    session_type: string;
    title: string;
    description: string | null;
    status: string;
    opens_at: string | null;
    closes_at: string | null;
    created_at: string;
  };
  items?: Array<{
    id: number;
    question: string;
    description: string | null;
    options: string[];
  }>;
  myVotes?: Array<{
    item_id: number | null;
    vote_value: string;
  }>;
  proxiesReceived?: Array<{
    id: number;
    assignor_id: string;
    assignor_name?: string;
    assignor_email?: string;
    scope_type: string;
    session_id?: number | null;
  }>;
  onVote: (sessionId: number, itemId: number | null, voteValue: string, comments?: string, votingAsProxyFor?: string) => void;
  onViewResults?: (sessionId: number) => void;
  disabled?: boolean;
  votingPower?: number;
}

export function VotingCard({ 
  session, 
  items = [], 
  myVotes = [], 
  proxiesReceived = [],
  onVote, 
  onViewResults,
  disabled = false,
  votingPower = 1
}: VotingCardProps) {
  const [selectedVotes, setSelectedVotes] = useState<Record<number, string>>({});
  const [comments, setComments] = useState<Record<number, string>>({});
  const [votingAsProxyFor, setVotingAsProxyFor] = useState<string>('self');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter proxies relevant to this session
  const relevantProxies = proxiesReceived.filter(proxy => 
    proxy.scope_type === 'all_votes' || 
    (proxy.scope_type === 'specific_session' && proxy.session_id === session.id)
  );

  // Debug logging
  console.log('VotingCard Debug:', {
    sessionId: session.id,
    sessionType: session.session_type,
    totalProxiesReceived: proxiesReceived.length,
    relevantProxies: relevantProxies.length,
    proxiesReceivedData: proxiesReceived,
    relevantProxiesData: relevantProxies
  });

  const getSessionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      agm_vote: 'AGM Vote',
      board_resolution: 'Board Resolution',
      board_meeting: 'Board Meeting'
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-500',
      active: 'bg-green-500',
      closed: 'bg-red-500',
      finalized: 'bg-blue-500',
      cancelled: 'bg-gray-400'
    };
    return colors[status] || 'bg-gray-500';
  };

  const hasVoted = (itemId: number | null) => {
    return myVotes.some(v => v.item_id === itemId);
  };

  const getMyVote = (itemId: number | null) => {
    return myVotes.find(v => v.item_id === itemId)?.vote_value;
  };

  const isVotingOpen = session.status === 'active';
  const isClosed = session.status === 'closed' || session.status === 'finalized';

  const handleVoteSubmit = async (itemId: number | null) => {
    const voteValue = selectedVotes[itemId || 0];
    if (!voteValue) return;

    setIsSubmitting(true);
    try {
      const proxyUserId = votingAsProxyFor === 'self' ? undefined : votingAsProxyFor;
      await onVote(session.id, itemId, voteValue, comments[itemId || 0], proxyUserId);
      setSelectedVotes(prev => ({ ...prev, [itemId || 0]: '' }));
      setComments(prev => ({ ...prev, [itemId || 0]: '' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // For simple resolutions (no items)
  const renderSimpleVote = () => {
    const myVote = getMyVote(null);
    const hasVotedOnThis = hasVoted(null);

    if (hasVotedOnThis) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">You voted: {myVote?.toUpperCase()}</span>
          </div>
          {isClosed && onViewResults && (
            <Button onClick={() => onViewResults(session.id)} variant="outline" className="w-full">
              View Results
            </Button>
          )}
        </div>
      );
    }

    if (!isVotingOpen) {
      return (
        <div className="text-sm text-muted-foreground">
          Voting is currently {session.status}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {relevantProxies.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="voter-select" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Voting as
            </Label>
            <Select value={votingAsProxyFor} onValueChange={setVotingAsProxyFor}>
              <SelectTrigger id="voter-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self">Myself</SelectItem>
                {relevantProxies
                  .filter(proxy => proxy.assignor_id && proxy.assignor_id.trim() !== "")
                  .map((proxy) => (
                    <SelectItem key={proxy.id} value={proxy.assignor_id!}>
                      On behalf of {proxy.assignor_name || proxy.assignor_email}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <RadioGroup 
          value={selectedVotes[0] || ''}
          onValueChange={(value) => setSelectedVotes({ ...selectedVotes, 0: value })}
          disabled={disabled || isSubmitting}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="approve" id="approve" />
            <Label htmlFor="approve" className="cursor-pointer">Approve</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="reject" id="reject" />
            <Label htmlFor="reject" className="cursor-pointer">Reject</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="abstain" id="abstain" />
            <Label htmlFor="abstain" className="cursor-pointer">Abstain</Label>
          </div>
        </RadioGroup>

        <Textarea
          placeholder="Comments (optional)"
          value={comments[0] || ''}
          onChange={(e) => setComments({ ...comments, 0: e.target.value })}
          disabled={disabled || isSubmitting}
          rows={2}
        />

        <Button 
          onClick={() => handleVoteSubmit(null)}
          disabled={!selectedVotes[0] || disabled || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Vote'}
        </Button>
      </div>
    );
  };

  // For AGM votes with multiple items
  const renderItemVotes = () => {
    return (
      <div className="space-y-6">
        {relevantProxies.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="voter-select-items" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Voting as
            </Label>
            <Select value={votingAsProxyFor} onValueChange={setVotingAsProxyFor}>
              <SelectTrigger id="voter-select-items">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self">Myself</SelectItem>
                {relevantProxies
                  .filter(proxy => proxy.assignor_id && proxy.assignor_id.trim() !== "")
                  .map((proxy) => (
                    <SelectItem key={proxy.id} value={proxy.assignor_id!}>
                      On behalf of {proxy.assignor_name || proxy.assignor_email}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {items.map((item, index) => {
          const myVote = getMyVote(item.id);
          const hasVotedOnThis = hasVoted(item.id);

          return (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="text-base">Question {index + 1}</CardTitle>
                <CardDescription>{item.question}</CardDescription>
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
                )}
              </CardHeader>
              <CardContent>
                {hasVotedOnThis ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">You voted: {myVote?.toUpperCase()}</span>
                  </div>
                ) : isVotingOpen ? (
                  <div className="space-y-4">
                    <RadioGroup 
                      value={selectedVotes[item.id] || ''}
                      onValueChange={(value) => setSelectedVotes({ ...selectedVotes, [item.id]: value })}
                      disabled={disabled || isSubmitting}
                    >
                      {item.options.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`${item.id}-${option}`} />
                          <Label htmlFor={`${item.id}-${option}`} className="cursor-pointer capitalize">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>

                    <Textarea
                      placeholder="Comments (optional)"
                      value={comments[item.id] || ''}
                      onChange={(e) => setComments({ ...comments, [item.id]: e.target.value })}
                      disabled={disabled || isSubmitting}
                      rows={2}
                    />

                    <Button 
                      onClick={() => handleVoteSubmit(item.id)}
                      disabled={!selectedVotes[item.id] || disabled || isSubmitting}
                      size="sm"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Vote'}
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Voting is currently {session.status}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {isClosed && items.length > 0 && onViewResults && (
          <Button onClick={() => onViewResults(session.id)} variant="outline" className="w-full">
            View Results
          </Button>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle>{session.title}</CardTitle>
              <Badge className={getStatusColor(session.status)}>
                {session.status.toUpperCase()}
              </Badge>
            </div>
            <CardDescription>{getSessionTypeLabel(session.session_type)}</CardDescription>
          </div>
        </div>
        {session.description && (
          <p className="text-sm text-muted-foreground mt-2">{session.description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Voting info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {session.opens_at && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Opens</div>
                <div className="text-muted-foreground">
                  {formatDistanceToNow(new Date(session.opens_at), { addSuffix: true })}
                </div>
              </div>
            </div>
          )}
          {session.closes_at && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Closes</div>
                <div className="text-muted-foreground">
                  {formatDistanceToNow(new Date(session.closes_at), { addSuffix: true })}
                </div>
              </div>
            </div>
          )}
        </div>

        {votingPower > 1 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">
              Your voting power: {votingPower} shares
            </span>
          </div>
        )}

        <div className="border-t pt-4">
          {items.length > 0 ? renderItemVotes() : renderSimpleVote()}
        </div>
      </CardContent>
    </Card>
  );
}
