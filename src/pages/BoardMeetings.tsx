import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import brain from 'brain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, Video, Users, FileText, CheckCircle2, Plus } from 'lucide-react';
import { useUserGuardContext } from 'app/auth';
import { MeetingResponse } from 'types';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';

const BoardMeetings = () => {
  const navigate = useNavigate();
  const { user } = useUserGuardContext();
  const [meetings, setMeetings] = useState<MeetingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadMeetings();
  }, [activeTab]);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const status = activeTab === 'all' ? undefined : activeTab;
      const response = await brain.list_meetings({ status });
      const data = await response.json();
      setMeetings(data.meetings || []);
    } catch (error) {
      console.error('Failed to load meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMeetingTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      regular: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      special: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      emergency: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      agm: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      egm: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    };
    return colors[type] || colors.regular;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
      postponed: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    };
    return colors[status] || colors.scheduled;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.slice(0, 5); // HH:MM
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8 pt-[calc(88px+2rem)] sm:pt-[calc(96px+2rem)] lg:pt-[calc(104px+2rem)]">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Board Meetings</h1>
          <p className="text-gray-600 dark:text-gray-400">View and manage all board meetings</p>
        </div>

        {/* Tabs for filtering */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Meetings</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Meetings List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading meetings...</p>
          </div>
        ) : meetings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground">No meetings found</p>
              <p className="text-muted-foreground mt-1">Schedule your first board meeting to get started</p>
              <Button onClick={() => navigate('/create-meeting')} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {meetings.map((meeting) => (
              <Card 
                key={meeting.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/meeting-details?id=${meeting.id}`)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl">{meeting.title}</CardTitle>
                        <Badge className={getMeetingTypeColor(meeting.meeting_type)}>
                          {meeting.meeting_type.toUpperCase()}
                        </Badge>
                        <Badge className={getStatusColor(meeting.status)}>
                          {meeting.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      {meeting.description && (
                        <CardDescription>{meeting.description}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Date & Time */}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{formatDate(meeting.meeting_date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{formatTime(meeting.meeting_time)}</span>
                    </div>

                    {/* Location */}
                    {meeting.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{meeting.location}</span>
                      </div>
                    )}
                    {meeting.virtual_link && (
                      <div className="flex items-center gap-2 text-sm">
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">Virtual Meeting</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex gap-4 mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{meeting.agenda_count} Agenda Items</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{meeting.attendance_count} Attending</span>
                    </div>
                    {meeting.has_minutes && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-foreground">Minutes Recorded</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default BoardMeetings;
