import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import brain from 'brain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Calendar, Clock, MapPin, Video, Save, Users, Mail } from 'lucide-react';
import { useUserGuardContext } from 'app/auth';
import { toast } from 'sonner';
import type { BoardMemberOption } from 'types';

const CreateMeeting = () => {
  const navigate = useNavigate();
  const { user } = useUserGuardContext();
  const [loading, setLoading] = useState(false);
  const [boardMembers, setBoardMembers] = useState<BoardMemberOption[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [sendInvitations, setSendInvitations] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    meeting_type: 'regular',
    meeting_date: '',
    meeting_time: '',
    location: '',
    virtual_link: '',
    description: '',
  });

  // Load board members on mount
  useEffect(() => {
    const loadBoardMembers = async () => {
      try {
        const response = await brain.get_board_members_for_invitation();
        if (response.ok) {
          const data = await response.json();
          setBoardMembers(data);
        }
      } catch (error) {
        console.error('Error loading board members:', error);
      }
    };
    loadBoardMembers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.meeting_date || !formData.meeting_time) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      // Create the meeting
      const response = await brain.create_meeting({
        title: formData.title,
        meeting_type: formData.meeting_type,
        meeting_date: formData.meeting_date,
        meeting_time: formData.meeting_time,
        location: formData.location || null,
        virtual_link: formData.virtual_link || null,
        description: formData.description || null,
      });

      if (response.ok) {
        const data = await response.json();
        
        // Send invitations if members are selected
        if (selectedMembers.length > 0) {
          try {
            const inviteResponse = await brain.invite_members(
              { meetingId: data.id },
              {
                board_member_ids: selectedMembers,
                send_email: sendInvitations,
              }
            );
            
            if (inviteResponse.ok) {
              const inviteData = await inviteResponse.json();
              toast.success(`Meeting scheduled! ${inviteData.invited_count} member(s) invited.`);
            } else {
              toast.warning('Meeting created but failed to send some invitations');
            }
          } catch (inviteError) {
            console.error('Error sending invitations:', inviteError);
            toast.warning('Meeting created but failed to send invitations');
          }
        } else {
          toast.success('Meeting scheduled successfully!');
        }
        
        navigate(`/meeting-details?id=${data.id}`);
      } else {
        toast.error('Failed to schedule meeting');
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error('An error occurred while scheduling the meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllMembers = () => {
    if (selectedMembers.length === boardMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(boardMembers.map(m => m.user_id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8 pt-[calc(88px+2rem)] sm:pt-[calc(96px+2rem)] lg:pt-[calc(104px+2rem)]">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/board-meetings')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Meetings
          </Button>
        </div>
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Meeting Details</CardTitle>
              <CardDescription>Enter the details for the board meeting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Meeting Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Q4 Board Meeting"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  required
                />
              </div>

              {/* Meeting Type */}
              <div className="space-y-2">
                <Label htmlFor="meeting_type">Meeting Type *</Label>
                <Select
                  value={formData.meeting_type}
                  onValueChange={(value) => handleChange('meeting_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="special">Special</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="agm">Annual General Meeting (AGM)</SelectItem>
                    <SelectItem value="egm">Extraordinary General Meeting (EGM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meeting_date">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Date *
                  </Label>
                  <Input
                    id="meeting_date"
                    type="date"
                    value={formData.meeting_date}
                    onChange={(e) => handleChange('meeting_date', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting_time">
                    <Clock className="h-4 w-4 inline mr-2" />
                    Time *
                  </Label>
                  <Input
                    id="meeting_time"
                    type="time"
                    value={formData.meeting_time}
                    onChange={(e) => handleChange('meeting_time', e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">
                  <MapPin className="h-4 w-4 inline mr-2" />
                  Physical Location
                </Label>
                <Input
                  id="location"
                  placeholder="e.g., Boardroom, 3rd Floor"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                />
              </div>

              {/* Virtual Link */}
              <div className="space-y-2">
                <Label htmlFor="virtual_link">
                  <Video className="h-4 w-4 inline mr-2" />
                  Virtual Meeting Link
                </Label>
                <Input
                  id="virtual_link"
                  type="url"
                  placeholder="e.g., https://zoom.us/j/..."
                  value={formData.virtual_link}
                  onChange={(e) => handleChange('virtual_link', e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Meeting objectives, key topics, etc."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Attendees Section */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Users className="h-5 w-5 inline mr-2" />
                Invite Board Members
              </CardTitle>
              <CardDescription>
                Select board members to invite to this meeting. Email invitations with calendar attachments will be sent automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Select All / Send Email Options */}
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedMembers.length === boardMembers.length && boardMembers.length > 0}
                    onCheckedChange={selectAllMembers}
                  />
                  <Label htmlFor="select-all" className="cursor-pointer">
                    Select All ({boardMembers.length} members)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="send-invitations"
                    checked={sendInvitations}
                    onCheckedChange={(checked) => setSendInvitations(checked as boolean)}
                  />
                  <Label htmlFor="send-invitations" className="cursor-pointer">
                    <Mail className="h-4 w-4 inline mr-1" />
                    Send email invitations
                  </Label>
                </div>
              </div>

              {/* Board Members List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {boardMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No active board members found
                  </p>
                ) : (
                  boardMembers.map((member) => (
                    <div
                      key={member.user_id}
                      className="flex items-center space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        id={`member-${member.user_id}`}
                        checked={selectedMembers.includes(member.user_id)}
                        onCheckedChange={() => toggleMemberSelection(member.user_id)}
                      />
                      <Label
                        htmlFor={`member-${member.user_id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium">{member.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {member.position && <span>{member.position} • </span>}
                          {member.email}
                        </div>
                      </Label>
                    </div>
                  ))
                )}
              </div>

              {/* Selection Summary */}
              {selectedMembers.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    {selectedMembers.length} member(s) selected
                    {sendInvitations && ' - Email invitations will be sent with calendar attachments'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/board-meetings')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Scheduling...' : 'Schedule Meeting'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMeeting;
