import { useEffect, useState } from 'react';
import { useUserGuardContext } from 'app/auth';
import brain from 'brain';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VotingCard } from 'components/VotingCard';
import { ProxyManager } from 'components/ProxyManager';
import { ApprovalTracker } from 'components/ApprovalTracker';
import { ResultsChart } from 'components/ResultsChart';
import { Vote, FileCheck, Users, Calendar, TrendingUp, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Governance() {
  const { user } = useUserGuardContext();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('active-votes');
  const [loading, setLoading] = useState(true);

  // Data states
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [completedSessions, setCompletedSessions] = useState<any[]>([]);
  const [myVotes, setMyVotes] = useState<any[]>([]);
  const [proxiesGiven, setProxiesGiven] = useState<any[]>([]);
  const [proxiesReceived, setProxiesReceived] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [sessionResults, setSessionResults] = useState<Record<number, any>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all data in parallel
      const [sessionsRes, votesRes, proxiesRes, approvalsRes] = await Promise.all([
        brain.list_sessions({ status: 'active' }),
        brain.get_voting_history(),
        brain.get_my_proxy_assignments(),
        brain.get_pending_actions(),
      ]);

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        console.log('Active sessions loaded:', data.sessions);
        setActiveSessions(data.sessions || []);
      }

      if (votesRes.ok) {
        const data = await votesRes.json();
        setMyVotes(data.votes || []);
      }

      if (proxiesRes.ok) {
        const data = await proxiesRes.json();
        console.log('Proxy data loaded:', {
          proxies_given: data.proxies_given,
          proxies_received: data.proxies_received,
          available_users: data.available_users
        });
        setProxiesGiven(data.proxies_given || []);
        setProxiesReceived(data.proxies_received || []);
        setAvailableUsers(data.available_users || []);
      } else {
        console.error('Failed to load proxy assignments:', proxiesRes.status);
      }

      if (approvalsRes.ok) {
        const data = await approvalsRes.json();
        setPendingApprovals(data.pending_approvals || []);
      }

      // Load completed sessions
      const completedRes = await brain.list_sessions({ 
        status: 'closed',
      });
      if (completedRes.ok) {
        const data = await completedRes.json();
        setCompletedSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error loading governance data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load governance data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (
    sessionId: number,
    itemId: number | null,
    voteValue: string,
    comments?: string,
    votingAsProxyFor?: string
  ) => {
    try {
      const response = await brain.cast_vote({
        session_id: sessionId,
        item_id: itemId,
        vote_value: voteValue,
        comments: comments,
        voting_as_proxy_for: votingAsProxyFor,
      });

      if (response.ok) {
        toast({
          title: 'Vote Submitted',
          description: 'Your vote has been recorded successfully',
        });
        loadData(); // Reload data to reflect new vote
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.detail || 'Failed to submit vote',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error casting vote:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit vote',
        variant: 'destructive',
      });
    }
  };

  const handleAssignProxy = async (
    proxyId: string,
    scopeType: string,
    sessionId?: number,
    validUntil?: string,
    notes?: string
  ) => {
    try {
      const response = await brain.create_proxy_assignment({
        proxy_id: proxyId,
        scope_type: scopeType,
        session_id: sessionId,
        valid_until: validUntil,
        notes: notes,
      });

      if (response.ok) {
        toast({
          title: 'Proxy Assigned',
          description: 'Proxy voter has been assigned successfully',
        });
        loadData();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.detail || 'Failed to assign proxy',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error assigning proxy:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign proxy',
        variant: 'destructive',
      });
    }
  };

  const handleRevokeProxy = async (proxyAssignmentId: number) => {
    try {
      const response = await brain.revoke_proxy(proxyAssignmentId);

      if (response.ok) {
        toast({
          title: 'Proxy Revoked',
          description: 'Proxy assignment has been revoked',
        });
        loadData();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.detail || 'Failed to revoke proxy',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error revoking proxy:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke proxy',
        variant: 'destructive',
      });
    }
  };

  const handleApproveDocument = async (
    documentId: number,
    status: string,
    comments?: string
  ) => {
    try {
      const response = await brain.approve_item({
        item_id: documentId,
        approval_type: 'document_approval',
        status: status,
        comments: comments,
      });

      if (response.ok) {
        toast({
          title: status === 'approved' ? 'Document Approved' : 'Changes Requested',
          description: 'Your review has been submitted',
        });
        loadData();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.detail || 'Failed to submit review',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error approving document:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit review',
        variant: 'destructive',
      });
    }
  };

  const handleViewResults = async (sessionId: number) => {
    try {
      const response = await brain.get_vote_results({ sessionId });
      
      if (response.ok) {
        const data = await response.json();
        setSessionResults(prev => ({ ...prev, [sessionId]: data }));
        setActiveTab('results');
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load results',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading results:', error);
      toast({
        title: 'Error',
        description: 'Failed to load results',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Governance Portal</h1>
        <p className="text-muted-foreground mt-2">
          Vote on resolutions, approve documents, and manage proxy assignments
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="active-votes" className="gap-2">
            <Vote className="h-4 w-4" />
            Active Votes
            {activeSessions.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeSessions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approvals" className="gap-2">
            <FileCheck className="h-4 w-4" />
            Approvals
            {pendingApprovals.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingApprovals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="proxy" className="gap-2">
            <Users className="h-4 w-4" />
            Proxy
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Calendar className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Results
          </TabsTrigger>
        </TabsList>

        {/* Active Votes */}
        <TabsContent value="active-votes" className="space-y-6">
          {activeSessions.length > 0 ? (
            activeSessions.map((session) => (
              <VotingCard
                key={session.id}
                session={session}
                items={session.items || []}
                myVotes={myVotes.filter(v => v.session_id === session.id)}
                proxiesReceived={proxiesReceived}
                onVote={handleVote}
                onViewResults={handleViewResults}
                votingPower={session.my_voting_power || 1}
              />
            ))
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Vote className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No active voting sessions</p>
                  <p className="text-sm mt-1">Check back later for new votes and resolutions</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Approvals */}
        <TabsContent value="approvals" className="space-y-6">
          {pendingApprovals.length > 0 ? (
            pendingApprovals.map((approval) => (
              <ApprovalTracker
                key={approval.document.id}
                document={approval.document}
                approvals={approval.approvals || []}
                currentUserId={user.id}
                onApprove={handleApproveDocument}
              />
            ))
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No pending approvals</p>
                  <p className="text-sm mt-1">You're all caught up!</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Proxy Management */}
        <TabsContent value="proxy">
          <ProxyManager
            proxiesGiven={proxiesGiven}
            proxiesReceived={proxiesReceived}
            availableUsers={availableUsers}
            availableSessions={activeSessions}
            onAssignProxy={handleAssignProxy}
            onRevokeProxy={handleRevokeProxy}
          />
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Voting History</CardTitle>
              <CardDescription>All your past votes and decisions</CardDescription>
            </CardHeader>
            <CardContent>
              {myVotes.length > 0 ? (
                <div className="space-y-4">
                  {myVotes.map((vote, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{vote.session_title || 'Unknown Session'}</p>
                        <p className="text-sm text-muted-foreground">
                          {vote.question || 'General vote'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Voted: {new Date(vote.voted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {vote.vote_value}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No voting history yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results */}
        <TabsContent value="results" className="space-y-6">
          {completedSessions.length > 0 || Object.keys(sessionResults).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(sessionResults).map(([sessionId, results]) => (
                <ResultsChart
                  key={sessionId}
                  session={results.session}
                  totalPossibleVotingPower={results.total_voting_power}
                  results={results.results}
                  showVotingPower={results.session.session_type === 'agm_vote'}
                />
              ))}
              
              {completedSessions.length > 0 && Object.keys(sessionResults).length === 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Completed Sessions</CardTitle>
                    <CardDescription>View results from past voting sessions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {completedSessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{session.title}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {session.session_type.replace('_', ' ')}
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewResults(session.id)}
                          >
                            View Results
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No results available</p>
                  <p className="text-sm mt-1">Results will appear here once voting sessions are closed</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
