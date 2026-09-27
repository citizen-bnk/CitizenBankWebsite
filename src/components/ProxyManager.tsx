import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserPlus, UserMinus, ArrowRight, Calendar, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';

export interface ProxyAssignment {
  id: number;
  assignor_id?: string;
  assignor_name?: string;
  assignor_email?: string;
  proxy_id: string;
  proxy_name?: string;
  proxy_email?: string;
  scope_type: string;
  session_id?: number | null;
  session_title?: string;
  valid_until?: string | null;
  notes?: string | null;
  status: string;
  assigned_at?: string;
}

export interface ProxyManagerProps {
  proxiesGiven: ProxyAssignment[];
  proxiesReceived: ProxyAssignment[];
  availableUsers?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  availableSessions?: Array<{
    id: number;
    title: string;
    session_type: string;
  }>;
  onAssignProxy: (proxyId: string, scopeType: string, sessionId?: number, validUntil?: string, notes?: string) => void;
  onRevokeProxy: (proxyAssignmentId: number) => void;
  disabled?: boolean;
}

export function ProxyManager({ 
  proxiesGiven, 
  proxiesReceived,
  availableUsers = [],
  availableSessions = [],
  onAssignProxy,
  onRevokeProxy,
  disabled = false
}: ProxyManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProxy, setSelectedProxy] = useState('');
  const [scopeType, setScopeType] = useState('all_votes');
  const [selectedSession, setSelectedSession] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAssignProxy = async () => {
    if (!selectedProxy) return;

    setIsSubmitting(true);
    try {
      await onAssignProxy(
        selectedProxy,
        scopeType,
        selectedSession ? parseInt(selectedSession) : undefined,
        validUntil || undefined,
        notes || undefined
      );
      
      // Reset form
      setSelectedProxy('');
      setScopeType('all_votes');
      setSelectedSession('');
      setValidUntil('');
      setNotes('');
      setIsDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (proxyId: number) => {
    if (window.confirm('Are you sure you want to revoke this proxy assignment?')) {
      await onRevokeProxy(proxyId);
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return '??';
  };

  const getScopeLabel = (scopeType: string, sessionTitle?: string) => {
    if (scopeType === 'all_votes') {
      return 'All Votes';
    }
    if (scopeType === 'specific_session' && sessionTitle) {
      return sessionTitle;
    }
    return 'Specific Session';
  };

  return (
    <div className="space-y-6">
      {/* Assign New Proxy */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Proxy Voting</CardTitle>
              <CardDescription>
                Delegate your voting rights to another shareholder or board member
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={disabled}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign Proxy
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Assign Proxy Voter</DialogTitle>
                  <DialogDescription>
                    Choose someone to vote on your behalf
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="proxy">Proxy Voter *</Label>
                    <Select value={selectedProxy} onValueChange={setSelectedProxy}>
                      <SelectTrigger id="proxy">
                        <SelectValue placeholder="Select a person" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scope">Scope *</Label>
                    <Select value={scopeType} onValueChange={setScopeType}>
                      <SelectTrigger id="scope">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_votes">All Votes</SelectItem>
                        <SelectItem value="specific_session">Specific Session</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {scopeType === 'specific_session' && (
                    <div className="space-y-2">
                      <Label htmlFor="session">Session *</Label>
                      <Select value={selectedSession} onValueChange={setSelectedSession}>
                        <SelectTrigger id="session">
                          <SelectValue placeholder="Select a session" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSessions.map((session) => (
                            <SelectItem key={session.id} value={session.id.toString()}>
                              {session.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="valid-until">Valid Until (Optional)</Label>
                    <Input
                      id="valid-until"
                      type="datetime-local"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty for no expiration
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any notes or instructions"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAssignProxy} 
                    disabled={!selectedProxy || isSubmitting || (scopeType === 'specific_session' && !selectedSession)}
                  >
                    {isSubmitting ? 'Assigning...' : 'Assign Proxy'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        {(proxiesGiven.length > 0 || proxiesReceived.length > 0) && (
          <CardContent className="space-y-6">
            {/* Proxies Given */}
            {proxiesGiven.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium">Proxies You've Assigned</h4>
                  <Badge variant="outline">{proxiesGiven.length}</Badge>
                </div>
                <div className="space-y-2">
                  {proxiesGiven.map((proxy) => (
                    <div key={proxy.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-sm">
                          {getInitials(proxy.proxy_name, proxy.proxy_email)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {proxy.proxy_name || proxy.proxy_email || 'Unknown'}
                          </p>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            {getScopeLabel(proxy.scope_type, proxy.session_title)}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          {proxy.assigned_at && (
                            <span>Assigned {formatDistanceToNow(new Date(proxy.assigned_at), { addSuffix: true })}</span>
                          )}
                          {proxy.valid_until && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Expires {format(new Date(proxy.valid_until), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                        
                        {proxy.notes && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            {proxy.notes}
                          </p>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(proxy.id)}
                        disabled={disabled}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Proxies Received */}
            {proxiesReceived.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium">Proxies You've Received</h4>
                  <Badge variant="outline">{proxiesReceived.length}</Badge>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      You can vote on behalf of the following people. Select their name when voting.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {proxiesReceived.map((proxy) => (
                    <div key={proxy.id} className="flex items-start gap-3 p-3 rounded-lg border bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-sm bg-green-200 dark:bg-green-800">
                          {getInitials(proxy.assignor_name, proxy.assignor_email)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate text-green-900 dark:text-green-100">
                            {proxy.assignor_name || proxy.assignor_email || 'Unknown'}
                          </p>
                          <ArrowRight className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-700 dark:text-green-300">You</span>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            {getScopeLabel(proxy.scope_type, proxy.session_title)}
                          </Badge>
                          {proxy.valid_until && (
                            <span className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Until {format(new Date(proxy.valid_until), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                        
                        {proxy.notes && (
                          <p className="text-xs text-green-700 dark:text-green-300 mt-2 italic">
                            {proxy.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}

        {proxiesGiven.length === 0 && proxiesReceived.length === 0 && (
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No proxy assignments yet</p>
              <p className="text-xs mt-1">Click "Assign Proxy" to delegate your voting rights</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
