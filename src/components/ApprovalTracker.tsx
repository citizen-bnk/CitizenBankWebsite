import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle2, Clock, XCircle, FileText, Download } from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

export interface Approval {
  approver_id: string;
  approver_name?: string;
  approver_email?: string;
  status: string;
  approved_at?: string;
  comments?: string;
}

export interface ApprovalTrackerProps {
  document: {
    id: number;
    file_name: string;
    file_url: string;
    description?: string | null;
    uploaded_by?: string;
    uploaded_at?: string;
  };
  approvals: Approval[];
  currentUserId: string;
  onApprove: (documentId: number, status: string, comments?: string) => void;
  onDownload?: (url: string, filename: string) => void;
  disabled?: boolean;
}

export function ApprovalTracker({ 
  document, 
  approvals, 
  currentUserId, 
  onApprove,
  onDownload,
  disabled = false 
}: ApprovalTrackerProps) {
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const myApproval = approvals.find(a => a.approver_id === currentUserId);
  const hasApproved = myApproval?.status === 'approved';
  const hasRejected = myApproval?.status === 'rejected';
  const hasPending = myApproval?.status === 'pending';

  const approvedCount = approvals.filter(a => a.status === 'approved').length;
  const totalApprovers = approvals.length;
  const allApproved = approvedCount === totalApprovers && totalApprovers > 0;
  const anyRejected = approvals.some(a => a.status === 'rejected');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200';
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-200';
    }
  };

  const handleApprove = async (status: 'approved' | 'rejected') => {
    setIsSubmitting(true);
    try {
      await onApprove(document.id, status, comments || undefined);
      setComments('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload(document.file_url, document.file_name);
    } else {
      window.open(document.file_url, '_blank');
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">{document.file_name}</CardTitle>
            </div>
            {document.description && (
              <CardDescription>{document.description}</CardDescription>
            )}
            {document.uploaded_at && (
              <p className="text-xs text-muted-foreground">
                Uploaded {formatDistanceToNow(new Date(document.uploaded_at), { addSuffix: true })}
              </p>
            )}
          </div>
          <Button onClick={handleDownload} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Status */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <div className="text-sm font-medium">Approval Progress</div>
            <div className="text-2xl font-bold mt-1">
              {approvedCount} / {totalApprovers}
            </div>
          </div>
          <div>
            {allApproved && (
              <Badge className="bg-green-600 text-white">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                All Approved
              </Badge>
            )}
            {anyRejected && (
              <Badge className="bg-red-600 text-white">
                <XCircle className="h-4 w-4 mr-1" />
                Changes Requested
              </Badge>
            )}
            {!allApproved && !anyRejected && (
              <Badge className="bg-amber-600 text-white">
                <Clock className="h-4 w-4 mr-1" />
                Pending
              </Badge>
            )}
          </div>
        </div>

        {/* Approvers List */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Approvers</h4>
          <div className="space-y-2">
            {approvals.map((approval) => (
              <div 
                key={approval.approver_id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  approval.approver_id === currentUserId ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' : 'bg-background'
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(approval.approver_name, approval.approver_email)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {approval.approver_name || approval.approver_email || 'Unknown'}
                      {approval.approver_id === currentUserId && (
                        <span className="text-blue-600 ml-1">(You)</span>
                      )}
                    </p>
                    {getStatusIcon(approval.status)}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={getStatusColor(approval.status)}>
                      {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                    </Badge>
                    {approval.approved_at && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(approval.approved_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  
                  {approval.comments && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      "{approval.comments}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Area for Current User */}
        {hasPending && (
          <div className="border-t pt-6 space-y-4">
            <h4 className="text-sm font-medium">Your Review</h4>
            <Textarea
              placeholder="Add comments (optional)"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={disabled || isSubmitting}
              rows={3}
            />
            <div className="flex gap-3">
              <Button
                onClick={() => handleApprove('approved')}
                disabled={disabled || isSubmitting}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Approving...' : 'Approve'}
              </Button>
              <Button
                onClick={() => handleApprove('rejected')}
                disabled={disabled || isSubmitting}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Submitting...' : 'Request Changes'}
              </Button>
            </div>
          </div>
        )}

        {hasApproved && (
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">You have approved this document</span>
            </div>
            {myApproval.comments && (
              <p className="text-sm text-muted-foreground mt-2 italic">
                Your comments: "{myApproval.comments}"
              </p>
            )}
          </div>
        )}

        {hasRejected && (
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">You have requested changes</span>
            </div>
            {myApproval.comments && (
              <p className="text-sm text-muted-foreground mt-2 italic">
                Your comments: "{myApproval.comments}"
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
