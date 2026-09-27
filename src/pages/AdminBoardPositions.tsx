import { useState, useEffect } from 'react';
import { useUser } from '@stackframe/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResponsiveTable } from 'components/ResponsiveTable';
import { DataCard } from 'components/DataCard';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import brain from 'brain';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Edit, Users, Building2, TrendingUp, History, CheckCircle, XCircle, Clock, Pencil, UserPlus, MoreVertical, Trash2, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { BoardPosition, CurrentBoardMember } from 'types';

// Extended types for enriched data
interface EnrichedBoardMember extends CurrentBoardMember {
  has_invested?: boolean;
  investment_complete?: boolean;
  phone?: string;
  tenure_days?: number;
}

interface PositionHistory {
  id: number;
  position_title: string;
  member_name: string;
  member_email: string;
  appointed_at: string;
  ended_at: string | null;
  is_current: boolean;
  position_level?: number;
  appointed_by_name?: string;
  removed_at?: string | null;
  term_end_date?: string | null;
}

export default function AdminBoardPositions() {
  const user = useUser();
  const navigate = useNavigate();
  const [positions, setPositions] = useState<BoardPosition[]>([]);
  const [composition, setComposition] = useState<EnrichedBoardMember[]>([]);
  const [positionHistory, setPositionHistory] = useState<PositionHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingComposition, setLoadingComposition] = useState(false);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Summary metrics
  const [metrics, setMetrics] = useState({
    totalPositions: 0,
    filledPositions: 0,
    vacantPositions: 0,
    totalMembers: 0,
    membersWithInvestment: 0,
    investmentCompletionRate: 0
  });

  // Create/Edit position modal
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<BoardPosition | null>(null);
  const [positionForm, setPositionForm] = useState({
    title: '',
    description: '',
    hierarchy_level: 1,
    responsibilities: '',
    is_active: true
  });
  const [savingPosition, setSavingPosition] = useState(false);

  // Assign/Edit position assignment modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<EnrichedBoardMember | null>(null);
  const [assignForm, setAssignForm] = useState({
    member_id: '',
    position_id: '',
    term_start_date: new Date().toISOString().split('T')[0], // Today's date
    term_end_date: '', // Optional
  });
  const [savingAssignment, setSavingAssignment] = useState(false);

  // Available board members (from backend)
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    loadAvailableMembers();
  }, []);

  const loadAvailableMembers = async () => {
    try {
      const response = await brain.list_board_members({});
      const data = await response.json();
      setAvailableMembers(data.board_members || []);
    } catch (error) {
      console.error('Failed to load board members:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load composition first
      setLoadingComposition(true);
      const compositionResponse = await brain.get_board_members_with_investment_status();
      const compositionData = await compositionResponse.json();
      // Fix: Use 'members' not 'board_members' and transform field names
      const rawMembers = compositionData.members || [];
      const members = rawMembers.map((m: any) => ({
        ...m,
        // Map backend field names to frontend expectations
        member_name: m.full_name,
        member_email: m.email,
        position_title: m.position_name,
        // Derive investment flags from investment_status object
        has_invested: m.investment_status?.total_shares > 0,
        investment_complete: m.investment_status?.meets_requirement || false,
      }));
      setComposition(members);
      setLoadingComposition(false);

      // Then load positions
      setLoadingPositions(true);
      const positionsResponse = await brain.list_board_positions();
      const positionsData = await positionsResponse.json();
      setPositions(positionsData.positions || []);
      setLoadingPositions(false);

      // Finally load history
      setLoadingHistory(true);
      const historyResponse = await brain.get_position_history({});
      const historyData = await historyResponse.json();
      setPositionHistory(historyData.history || []);
      setLoadingHistory(false);

      // Calculate metrics
      const totalPos = positionsData.positions?.length || 0;
      const filledPos = new Set(members.map((m: EnrichedBoardMember) => m.position_title).filter(Boolean)).size;
      const totalMem = members.length;
      const invested = members.filter((m: EnrichedBoardMember) => m.has_invested).length;
      const investmentComplete = members.filter((m: EnrichedBoardMember) => m.investment_complete).length;
      
      setMetrics({
        totalPositions: totalPos,
        filledPositions: filledPos,
        vacantPositions: totalPos - filledPos,
        totalMembers: totalMem,
        membersWithInvestment: invested,
        investmentCompletionRate: totalMem > 0 ? Math.round((investmentComplete / totalMem) * 100) : 0
      });
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Unable to load board positions. Please try again.');
      setLoadingComposition(false);
      setLoadingPositions(false);
      setLoadingHistory(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePosition = () => {
    setEditingPosition(null);
    setPositionForm({
      title: '',
      description: '',
      hierarchy_level: 1,
      responsibilities: '',
      is_active: true
    });
    setShowPositionModal(true);
  };

  const handleEditPosition = (position: BoardPosition) => {
    setEditingPosition(position);
    setPositionForm({
      title: position.position_name,
      description: position.description || '',
      hierarchy_level: position.position_level,
      responsibilities: '',
      is_active: true
    });
    setShowPositionModal(true);
  };

  const handleSavePosition = async () => {
    if (!positionForm.title.trim()) {
      toast.error('Position title is required');
      return;
    }

    try {
      setSavingPosition(true);
      
      if (editingPosition) {
        // Update existing position
        const response = await brain.update_board_position(
          { positionId: editingPosition.id },
          positionForm
        );
        
        if (response.ok) {
          toast.success('Position updated successfully');
        } else {
          const error = await response.json();
          toast.error(error.detail || 'Failed to update position');
          return;
        }
      } else {
        // Create new position
        const response = await brain.create_board_position(positionForm);
        
        if (response.ok) {
          toast.success('Position created successfully');
        } else {
          const error = await response.json();
          toast.error(error.detail || 'Failed to create position');
          return;
        }
      }

      setShowPositionModal(false);
      loadData();
    } catch (error) {
      console.error('Failed to save position:', error);
      toast.error('Failed to save position');
    } finally {
      setSavingPosition(false);
    }
  };

  const handleAssignPosition = () => {
    setEditingAssignment(null);
    setAssignForm({
      member_id: '',
      position_id: '',
      term_start_date: new Date().toISOString().split('T')[0],
      term_end_date: '',
    });
    setShowAssignModal(true);
  };

  const handleEditAssignment = (member: EnrichedBoardMember) => {
    setEditingAssignment(member);
    // Use the board_member_id directly instead of trying to match by name
    const selectedPosition = positions.find(p => p.position_name === member.position_title);
    setAssignForm({
      member_id: member.board_member_id.toString(),
      position_id: selectedPosition?.id?.toString() || '',
      term_start_date: member.appointed_at ? new Date(member.appointed_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      term_end_date: '', // Allow setting a new end date
    });
    setShowAssignModal(true);
  };

  const handleSaveAssignment = async () => {
    if (!assignForm.member_id || !assignForm.position_id) {
      toast.error('Please select both member and position');
      return;
    }

    if (!assignForm.term_start_date) {
      toast.error('Please select a term start date');
      return;
    }

    try {
      setSavingAssignment(true);
      
      const response = await brain.appoint_board_member(
        { memberId: parseInt(assignForm.member_id) },
        { 
          position_id: parseInt(assignForm.position_id),
          term_start_date: assignForm.term_start_date,
          term_end_date: assignForm.term_end_date || undefined,
        }
      );
      
      if (response.ok) {
        toast.success(editingAssignment ? 'Position reassigned successfully' : 'Position assigned successfully');
        setShowAssignModal(false);
        loadData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to assign position');
      }
    } catch (error) {
      console.error('Failed to assign position:', error);
      toast.error('Failed to assign position');
    } finally {
      setSavingAssignment(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTenure = (days: number | null) => {
    if (days === null) return 'N/A';
    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months > 1 ? 's' : ''}`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return `${years}y ${remainingMonths}m`;
  };

  const calculateTenure = (appointedDate: string | null) => {
    if (!appointedDate) return null;
    const appointed = new Date(appointedDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - appointed.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getPositionMemberCount = (positionTitle: string) => {
    return composition.filter(m => m.position_title === positionTitle).length;
  };

  const getHistoricalAssignmentCount = (positionTitle: string) => {
    return positionHistory.filter(h => h.position_title === positionTitle).length;
  };

  const positionColumns = [
    { 
      key: 'position_name', 
      header: 'Position Title',
      render: (row: BoardPosition) => (
        <div>
          <div className="font-semibold">{row.position_name}</div>
          {row.description && (
            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {row.description}
            </div>
          )}
        </div>
      )
    },
    { 
      key: 'position_level', 
      header: 'Hierarchy',
      render: (row: BoardPosition) => (
        <Badge variant="outline">Level {row.position_level}</Badge>
      )
    },
    { 
      key: 'current_members', 
      header: 'Current Members',
      render: (row: BoardPosition) => {
        const count = getPositionMemberCount(row.position_name);
        return (
          <Badge variant={count > 0 ? "default" : "secondary"}>
            {count} {count === 1 ? 'member' : 'members'}
          </Badge>
        );
      }
    },
    { 
      key: 'historical_count', 
      header: 'Historical Assignments',
      render: (row: BoardPosition) => {
        const count = getHistoricalAssignmentCount(row.position_name);
        return <span className="text-muted-foreground">{count}</span>;
      }
    },
    { 
      key: 'actions', 
      header: 'Actions',
      render: (row: BoardPosition) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleEditPosition(row)}
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
      )
    },
  ];

  const compositionColumns = [
    { 
      key: 'position_title', 
      header: 'Position',
      render: (row: EnrichedBoardMember) => (
        <div>
          <div className="font-semibold">{row.position_title}</div>
          <div className="text-xs text-muted-foreground">Level {row.position_level}</div>
        </div>
      )
    },
    { 
      key: 'member_name', 
      header: 'Board Member',
      render: (row: EnrichedBoardMember) => (
        <div>
          <div className="font-medium">{row.member_name}</div>
          <div className="text-xs text-muted-foreground">{row.member_email}</div>
        </div>
      )
    },
    {
      key: 'tenure',
      header: 'Tenure',
      render: (row: EnrichedBoardMember) => {
        const days = calculateTenure(row.appointed_at);
        return (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{formatTenure(days)}</span>
          </div>
        );
      }
    },
    {
      key: 'investment_status',
      header: 'Investment',
      render: (row: EnrichedBoardMember) => {
        if (row.investment_complete) {
          return (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          );
        } else if (row.has_invested) {
          return (
            <Badge variant="secondary">
              <TrendingUp className="h-3 w-3 mr-1" />
              In Progress
            </Badge>
          );
        } else {
          return (
            <Badge variant="outline">
              <XCircle className="h-3 w-3 mr-1" />
              Pending
            </Badge>
          );
        }
      }
    },
    { 
      key: 'appointed_at', 
      header: 'Appointed Date', 
      render: (row: EnrichedBoardMember) => formatDate(row.appointed_at) 
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: EnrichedBoardMember) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEditAssignment(row)}>
              <Edit className="h-4 w-4 mr-2" />
              Reassign Position
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  ];

  const historyColumns = [
    { key: 'position_title', label: 'Position' },
    { key: 'member_name', label: 'Member' },
    { key: 'member_email', label: 'Email' },
    { key: 'appointed_at', label: 'Start Date', render: (val: string) => formatDate(val) },
    { 
      key: 'ended_at', 
      label: 'End Date', 
      render: (val: string | null) => val ? formatDate(val) : '-'
    },
    { 
      key: 'is_current', 
      label: 'Status',
      render: (val: boolean) => (
        <Badge variant={val ? 'default' : 'secondary'}>
          {val ? 'Current' : 'Past'}
        </Badge>
      )
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="page-container container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Board Position Management</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Manage board hierarchy and member assignments</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate('/admin-dashboard')}
                variant="outline"
                className="text-xs sm:text-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Button onClick={handleCreatePosition}>
                <Plus className="h-4 w-4 mr-2" />
                Create Position
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Positions</CardDescription>
              <CardTitle className="text-3xl">{metrics.totalPositions}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Filled Positions</CardDescription>
              <CardTitle className="text-3xl text-green-600">{metrics.filledPositions}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Vacant Positions</CardDescription>
              <CardTitle className="text-3xl text-orange-600">{metrics.vacantPositions}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Members</CardDescription>
              <CardTitle className="text-3xl">{metrics.totalMembers}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>With Investment</CardDescription>
              <CardTitle className="text-3xl">{metrics.membersWithInvestment}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Investment Rate</CardDescription>
              <CardTitle className="text-3xl text-blue-600">{metrics.investmentCompletionRate}%</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="space-y-6 sm:space-y-8">
          {/* Current Board Composition */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Current Board Composition
                  </CardTitle>
                  <CardDescription>Active board members with investment status and tenure</CardDescription>
                </div>
                <Button onClick={handleAssignPosition} size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign Position
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingComposition ? (
                <div className="text-center py-8 text-muted-foreground">Loading composition...</div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button variant="outline" onClick={loadData}>
                    Try Again
                  </Button>
                </div>
              ) : composition.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No board members assigned</div>
              ) : (
                <ResponsiveTable
                  data={composition}
                  columns={compositionColumns}
                  keyExtractor={(item) => item.board_member_id.toString()}
                  renderCard={(item) => (
                    <DataCard
                      title={item.position_title}
                      subtitle={item.member_name}
                      fields={[
                        { label: 'Email', value: item.member_email },
                        { label: 'Appointed', value: formatDate(item.appointed_at) },
                        { label: 'Tenure', value: formatTenure(calculateTenure(item.appointed_at)) },
                        { 
                          label: 'Investment', 
                          value: item.investment_complete ? (
                            <Badge variant="default" className="bg-green-600">Complete</Badge>
                          ) : item.has_invested ? (
                            <Badge variant="secondary">In Progress</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )
                        },
                      ]}
                    />
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Position Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Board Positions
              </CardTitle>
              <CardDescription>Define and manage available board positions with member counts</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPositions ? (
                <div className="text-center py-8 text-muted-foreground">Loading positions...</div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button variant="outline" onClick={loadData}>
                    Try Again
                  </Button>
                </div>
              ) : positions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No positions defined. Create your first position to get started.
                </div>
              ) : (
                <ResponsiveTable
                  data={positions}
                  columns={positionColumns}
                  keyExtractor={(item) => item.id}
                  renderCard={(item) => (
                    <DataCard
                      title={item.position_name}
                      subtitle={`Level ${item.position_level} • ${getPositionMemberCount(item.position_name)} current members`}
                      fields={[
                        { label: 'Description', value: item.description || 'No description' },
                        { label: 'Total Assigned', value: getHistoricalAssignmentCount(item.position_name) },
                        { label: 'Created', value: formatDate(item.created_at) },
                      ]}
                      onClick={() => handleEditPosition(item)}
                      actions={[
                        {
                          label: 'Edit',
                          onClick: () => handleEditPosition(item),
                          icon: <Edit className="h-4 w-4" />
                        }
                      ]}
                    />
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Tenure/Term Explanation */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                About Board Member Terms & Tenure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-semibold mb-1">What is a Term?</h4>
                <p className="text-muted-foreground">
                  A <strong>term</strong> is the official period for which a board member is appointed to a position. 
                  By default, board members serve for <strong>3 years</strong> unless a different term end date is specified during appointment.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">What is Tenure?</h4>
                <p className="text-muted-foreground">
                  <strong>Tenure</strong> refers to the actual time a member has served in their current position, measured from their appointment date to today.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">How Terms Affect Board Member Status</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                  <li>Board members remain <strong>active</strong> throughout their term</li>
                  <li>When a term ends, the member's position is <strong>automatically removed</strong></li>
                  <li>Members can be <strong>reappointed</strong> to the same or different positions</li>
                  <li>Admins can manually end a term early if needed (e.g., resignation)</li>
                </ul>
              </div>
              <div className="pt-2 border-t border-blue-200">
                <p className="text-xs text-muted-foreground italic">
                  💡 Tip: The position history timeline below shows all appointments with their appointed_by, term dates, and position hierarchy levels.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Position History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Position Assignment History
              </CardTitle>
              <CardDescription>Complete audit trail of all position assignments and changes</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="text-center py-8 text-muted-foreground">Loading history...</div>
              ) : positionHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No position history available</div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm text-muted-foreground">Total Assignments</div>
                      <div className="text-2xl font-bold">{positionHistory.length}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Currently Active</div>
                      <div className="text-2xl font-bold text-green-600">
                        {positionHistory.filter(h => h.is_current).length}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Historical</div>
                      <div className="text-2xl font-bold text-gray-600">
                        {positionHistory.filter(h => !h.is_current).length}
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="relative space-y-4">
                    {/* Vertical timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                    
                    {positionHistory.map((entry) => {
                      const isCurrent = entry.is_current;
                      
                      return (
                        <div key={entry.id} className="relative pl-12">
                          {/* Timeline dot */}
                          <div className={`absolute left-2 w-5 h-5 rounded-full border-4 ${
                            isCurrent 
                              ? 'bg-green-500 border-green-200' 
                              : 'bg-gray-400 border-gray-200'
                          }`} />
                          
                          {/* Event card */}
                          <Card className={isCurrent ? 'border-green-500 bg-green-50' : ''}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <CardTitle className="text-base">
                                      {entry.position_title}
                                    </CardTitle>
                                    {entry.position_level && (
                                      <Badge variant="outline" className="text-xs">
                                        Level {entry.position_level}
                                      </Badge>
                                    )}
                                    {isCurrent && (
                                      <Badge className="bg-green-600">
                                        Current
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {entry.member_name} • {entry.member_email}
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div>
                                  <div className="text-muted-foreground">Appointed</div>
                                  <div className="font-medium">{formatDate(entry.appointed_at)}</div>
                                  {entry.appointed_by_name && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      by {entry.appointed_by_name}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Term End Date</div>
                                  <div className="font-medium">
                                    {entry.term_end_date ? formatDate(entry.term_end_date) : 'Not specified'}
                                  </div>
                                </div>
                                {(entry.removed_at || entry.ended_at) && (
                                  <div>
                                    <div className="text-muted-foreground">Position Ended</div>
                                    <div className="font-medium">
                                      {formatDate(entry.removed_at || entry.ended_at)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create/Edit Position Modal */}
      <Dialog open={showPositionModal} onOpenChange={setShowPositionModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPosition ? 'Edit Position' : 'Create New Position'}</DialogTitle>
            <DialogDescription>
              Define the board position details and hierarchy level
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Position Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Chief Executive Officer"
                value={positionForm.title}
                onChange={(e) => setPositionForm({ ...positionForm, title: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="hierarchy_level">Hierarchy Level *</Label>
              <Select
                value={positionForm.hierarchy_level.toString()}
                onValueChange={(val) => setPositionForm({ ...positionForm, hierarchy_level: parseInt(val) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Level 1 (Highest)</SelectItem>
                  <SelectItem value="2">Level 2</SelectItem>
                  <SelectItem value="3">Level 3</SelectItem>
                  <SelectItem value="4">Level 4</SelectItem>
                  <SelectItem value="5">Level 5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the position..."
                value={positionForm.description}
                onChange={(e) => setPositionForm({ ...positionForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="responsibilities">Key Responsibilities</Label>
              <Textarea
                id="responsibilities"
                placeholder="List key responsibilities (one per line)..."
                value={positionForm.responsibilities}
                onChange={(e) => setPositionForm({ ...positionForm, responsibilities: e.target.value })}
                rows={4}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={positionForm.is_active}
                onChange={(e) => setPositionForm({ ...positionForm, is_active: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Position is active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPositionModal(false)} disabled={savingPosition}>
              Cancel
            </Button>
            <Button onClick={handleSavePosition} disabled={savingPosition}>
              {savingPosition ? 'Saving...' : editingPosition ? 'Update Position' : 'Create Position'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign/Edit Position Assignment Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAssignment ? 'Reassign Position' : 'Assign Position to Member'}</DialogTitle>
            <DialogDescription>
              {editingAssignment 
                ? `Change ${editingAssignment.member_name}'s position assignment`
                : 'Select a board member and assign them a position with tenure dates'
              }
            </DialogDescription>
          </DialogHeader>

          {loadingPositions || loadingComposition ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading...
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" onClick={loadData}>
                Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="member_id">Board Member *</Label>
                <Select
                  value={assignForm.member_id}
                  onValueChange={(val) => setAssignForm({ ...assignForm, member_id: val })}
                  disabled={!!editingAssignment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select board member" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.full_name} ({member.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editingAssignment && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Currently assigned as: {editingAssignment.position_title}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="position_id">Position *</Label>
                <Select
                  value={assignForm.position_id}
                  onValueChange={(val) => setAssignForm({ ...assignForm, position_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.length === 0 ? (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        No positions available
                      </div>
                    ) : (
                      positions.map((position) => (
                        <SelectItem key={position.id} value={position.id.toString()}>
                          {position.position_name} (Level {position.position_level})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="term_start_date">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Term Start Date *
                  </div>
                </Label>
                <Input
                  id="term_start_date"
                  type="date"
                  value={assignForm.term_start_date}
                  onChange={(e) => setAssignForm({ ...assignForm, term_start_date: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  When does this position assignment begin?
                </p>
              </div>

              <div>
                <Label htmlFor="term_end_date">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Term End Date (Optional)
                  </div>
                </Label>
                <Input
                  id="term_end_date"
                  type="date"
                  value={assignForm.term_end_date}
                  min={assignForm.term_start_date}
                  onChange={(e) => setAssignForm({ ...assignForm, term_end_date: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave blank for indefinite term
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignModal(false)} disabled={savingAssignment}>
              Cancel
            </Button>
            <Button onClick={handleSaveAssignment} disabled={savingAssignment || loadingPositions || error !== null}>
              {savingAssignment ? 'Saving...' : editingAssignment ? 'Reassign' : 'Assign Position'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}
