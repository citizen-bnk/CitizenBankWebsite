import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import brain from 'brain';
import { Header } from 'components/Header';
import { BackOfficeNav } from 'components/BackOfficeNav';
import { Footer } from 'components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Newspaper, Plus, Edit, Trash2, Send, Eye, Calendar, Mail, ArrowLeft, Clock, TrendingUp, Award } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import type { MediaReleaseListItem, MediaReleaseResponse, TimelineItemResponse } from 'types';
import { ImagePicker } from 'components/ImagePicker';

export default function BackOfficeMediaReleases() {
  const navigate = useNavigate();
  
  // Media Releases state
  const [releases, setReleases] = useState<MediaReleaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<MediaReleaseListItem | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    featured_image_url: '',
    status: 'draft'
  });
  
  // Timeline state
  const [timelineItems, setTimelineItems] = useState<TimelineItemResponse[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [showTimelineDialog, setShowTimelineDialog] = useState(false);
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineItemResponse | null>(null);
  const [timelineFormData, setTimelineFormData] = useState({
    title: '',
    short_story: '',
    achievement_date: '',
    image_url: '',
    status: 'upcoming',
    display_order: 0,
    is_published: false
  });
  const [activeTab, setActiveTab] = useState('releases');

  // Achievements state
  const [achievements, setAchievements] = useState<any[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState(false);
  const [showAchievementDialog, setShowAchievementDialog] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<any | null>(null);
  const [achievementFormData, setAchievementFormData] = useState({
    title: '',
    description: '',
    achievement_date: '',
    category: 'milestone',
    image_url: '',
    display_order: 0,
    is_published: false
  });

  useEffect(() => {
    loadReleases();
  }, [filterStatus]);

  const loadReleases = async () => {
    try {
      setLoading(true);
      const params = filterStatus === 'all' ? {} : { status: filterStatus };
      const response = await brain.list_media_releases(params);
      const data = await response.json();
      setReleases(data);
    } catch (error: any) {
      console.error('Error loading releases:', error);
      toast.error('Failed to load media releases');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.title || !formData.content) {
        toast.error('Title and content are required');
        return;
      }

      const response = await brain.create_media_release({
        title: formData.title,
        excerpt: formData.excerpt || null,
        content: formData.content,
        featured_image_url: formData.featured_image_url || null,
        status: formData.status,
        published_at: formData.status === 'published' ? new Date().toISOString() : null
      });

      if (response.ok) {
        toast.success('Media release created successfully');
        setShowCreateDialog(false);
        resetForm();
        loadReleases();
      } else {
        toast.error('Failed to create media release');
      }
    } catch (error: any) {
      console.error('Error creating release:', error);
      toast.error('Failed to create media release');
    }
  };

  const handleUpdate = async () => {
    try {
      if (!selectedRelease) return;

      const response = await brain.update_media_release(
        { releaseId: selectedRelease.id },
        {
          title: formData.title || null,
          excerpt: formData.excerpt || null,
          content: formData.content || null,
          featured_image_url: formData.featured_image_url || null,
          status: formData.status || null,
          published_at: null
        }
      );

      if (response.ok) {
        toast.success('Media release updated successfully');
        setShowEditDialog(false);
        resetForm();
        loadReleases();
      } else {
        toast.error('Failed to update media release');
      }
    } catch (error: any) {
      console.error('Error updating release:', error);
      toast.error('Failed to update media release');
    }
  };

  const handleDelete = async () => {
    try {
      if (!selectedRelease) return;

      const response = await brain.delete_media_release({ releaseId: selectedRelease.id });

      if (response.ok) {
        toast.success('Media release deleted successfully');
        setShowDeleteDialog(false);
        setSelectedRelease(null);
        loadReleases();
      } else {
        toast.error('Failed to delete media release');
      }
    } catch (error: any) {
      console.error('Error deleting release:', error);
      toast.error('Failed to delete media release');
    }
  };

  const handlePublish = async () => {
    try {
      if (!selectedRelease) return;

      setPublishing(true);
      const response = await brain.publish_media_release({ releaseId: selectedRelease.id });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Published! Newsletter sent to ${result.emails_sent} board members`);
        setShowPublishDialog(false);
        setSelectedRelease(null);
        loadReleases();
      } else {
        toast.error('Failed to publish media release');
      }
    } catch (error: any) {
      console.error('Error publishing release:', error);
      toast.error('Failed to publish media release');
    } finally {
      setPublishing(false);
    }
  };

  const openEditDialog = async (release: MediaReleaseListItem) => {
    try {
      // Get full release details
      const response = await brain.get_media_release({ releaseId: release.id });
      const data: MediaReleaseResponse = await response.json();

      setSelectedRelease(release);
      setFormData({
        title: data.title,
        excerpt: data.excerpt || '',
        content: data.content,
        featured_image_url: data.featured_image_url || '',
        status: data.status
      });
      setShowEditDialog(true);
    } catch (error: any) {
      console.error('Error loading release:', error);
      toast.error('Failed to load release details');
    }
  };

  const openPublishDialog = (release: MediaReleaseListItem) => {
    setSelectedRelease(release);
    setShowPublishDialog(true);
  };

  const openDeleteDialog = (release: MediaReleaseListItem) => {
    setSelectedRelease(release);
    setShowDeleteDialog(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      featured_image_url: '',
      status: 'draft'
    });
    setSelectedRelease(null);
  };
  
  // Timeline functions
  const loadTimelineItems = async () => {
    try {
      setTimelineLoading(true);
      const response = await brain.list_all_timeline_items();
      const data = await response.json();
      setTimelineItems(data);
    } catch (error: any) {
      console.error('Error loading timeline items:', error);
      toast.error('Failed to load timeline items');
    } finally {
      setTimelineLoading(false);
    }
  };
  
  const handleCreateTimeline = async () => {
    try {
      if (!timelineFormData.title || !timelineFormData.short_story || !timelineFormData.achievement_date) {
        toast.error('Title, story, and date are required');
        return;
      }

      const response = await brain.create_timeline_item({
        title: timelineFormData.title,
        short_story: timelineFormData.short_story,
        achievement_date: new Date(timelineFormData.achievement_date).toISOString(),
        image_url: timelineFormData.image_url || null,
        status: timelineFormData.status,
        display_order: timelineFormData.display_order,
        is_published: timelineFormData.is_published
      });

      if (response.ok) {
        toast.success('Timeline item created successfully');
        setShowTimelineDialog(false);
        resetTimelineForm();
        loadTimelineItems();
      } else {
        toast.error('Failed to create timeline item');
      }
    } catch (error: any) {
      console.error('Error creating timeline item:', error);
      toast.error('Failed to create timeline item');
    }
  };
  
  const handleUpdateTimeline = async () => {
    try {
      if (!selectedTimeline) return;

      const response = await brain.update_timeline_item(
        { itemId: selectedTimeline.id },
        {
          title: timelineFormData.title || null,
          short_story: timelineFormData.short_story || null,
          achievement_date: timelineFormData.achievement_date ? new Date(timelineFormData.achievement_date).toISOString() : null,
          image_url: timelineFormData.image_url || null,
          status: timelineFormData.status || null,
          display_order: timelineFormData.display_order,
          is_published: timelineFormData.is_published
        }
      );

      if (response.ok) {
        toast.success('Timeline item updated successfully');
        setShowTimelineDialog(false);
        resetTimelineForm();
        loadTimelineItems();
      } else {
        toast.error('Failed to update timeline item');
      }
    } catch (error: any) {
      console.error('Error updating timeline item:', error);
      toast.error('Failed to update timeline item');
    }
  };
  
  const handleDeleteTimeline = async (itemId: number) => {
    try {
      const response = await brain.delete_timeline_item({ itemId });
      if (response.ok) {
        toast.success('Timeline item deleted successfully');
        loadTimelineItems();
      } else {
        toast.error('Failed to delete timeline item');
      }
    } catch (error: any) {
      console.error('Error deleting timeline item:', error);
      toast.error('Failed to delete timeline item');
    }
  };
  
  const openTimelineDialog = (item?: TimelineItemResponse) => {
    if (item) {
      setSelectedTimeline(item);
      setTimelineFormData({
        title: item.title,
        short_story: item.short_story,
        achievement_date: new Date(item.achievement_date).toISOString().slice(0, 16),
        image_url: item.image_url || '',
        status: item.status,
        display_order: item.display_order,
        is_published: item.is_published
      });
    }
    setShowTimelineDialog(true);
  };

  const openTimelineEditDialog = (item: TimelineItemResponse) => {
    setSelectedTimeline(item);
    setTimelineFormData({
      title: item.title,
      short_story: item.short_story,
      achievement_date: new Date(item.achievement_date).toISOString().slice(0, 16),
      image_url: item.image_url || '',
      status: item.status,
      display_order: item.display_order,
      is_published: item.is_published
    });
    setShowTimelineDialog(true);
  };

  const openTimelineDeleteDialog = async (item: TimelineItemResponse) => {
    if (confirm(`Are you sure you want to delete "${item.title}"?`)) {
      await handleDeleteTimeline(item.id);
    }
  };
  
  const resetTimelineForm = () => {
    setTimelineFormData({
      title: '',
      short_story: '',
      achievement_date: '',
      image_url: '',
      status: 'upcoming',
      display_order: 0,
      is_published: false
    });
    setSelectedTimeline(null);
  };
  
  // Load timeline when tab switches
  useEffect(() => {
    if (activeTab === 'timeline') {
      loadTimelineItems();
    } else if (activeTab === 'achievements') {
      loadAchievements();
    }
  }, [activeTab]);

  // Achievements functions
  const loadAchievements = async () => {
    try {
      setAchievementsLoading(true);
      const response = await brain.list_all_achievements({});
      const data = await response.json();
      setAchievements(data.achievements);
    } catch (error: any) {
      console.error('Error loading achievements:', error);
      toast.error('Failed to load achievements');
    } finally {
      setAchievementsLoading(false);
    }
  };

  const handleCreateAchievement = async () => {
    try {
      if (!achievementFormData.title || !achievementFormData.description || !achievementFormData.achievement_date) {
        toast.error('Title, description, and date are required');
        return;
      }

      const response = await brain.create_achievement({
        title: achievementFormData.title,
        description: achievementFormData.description,
        achievement_date: new Date(achievementFormData.achievement_date).toISOString().split('T')[0],
        category: achievementFormData.category,
        image_url: achievementFormData.image_url || null,
        display_order: achievementFormData.display_order,
        is_published: achievementFormData.is_published
      });

      if (response.ok) {
        toast.success('Achievement created successfully');
        setShowAchievementDialog(false);
        resetAchievementForm();
        loadAchievements();
      } else {
        toast.error('Failed to create achievement');
      }
    } catch (error: any) {
      console.error('Error creating achievement:', error);
      toast.error('Failed to create achievement');
    }
  };

  const handleUpdateAchievement = async () => {
    try {
      if (!selectedAchievement) return;

      const response = await brain.update_achievement(
        { achievementId: selectedAchievement.id },
        {
          title: achievementFormData.title || null,
          description: achievementFormData.description || null,
          achievement_date: achievementFormData.achievement_date ? new Date(achievementFormData.achievement_date).toISOString().split('T')[0] : null,
          category: achievementFormData.category || null,
          image_url: achievementFormData.image_url || null,
          display_order: achievementFormData.display_order,
          is_published: achievementFormData.is_published
        }
      );

      if (response.ok) {
        toast.success('Achievement updated successfully');
        setShowAchievementDialog(false);
        resetAchievementForm();
        loadAchievements();
      } else {
        toast.error('Failed to update achievement');
      }
    } catch (error: any) {
      console.error('Error updating achievement:', error);
      toast.error('Failed to update achievement');
    }
  };

  const handleDeleteAchievement = async (achievementId: number) => {
    if (!confirm('Are you sure you want to delete this achievement?')) return;

    try {
      const response = await brain.delete_achievement({ achievementId });
      if (response.ok) {
        toast.success('Achievement deleted successfully');
        loadAchievements();
      } else {
        toast.error('Failed to delete achievement');
      }
    } catch (error: any) {
      console.error('Error deleting achievement:', error);
      toast.error('Failed to delete achievement');
    }
  };

  const openAchievementDialog = (achievement?: any) => {
    if (achievement) {
      setSelectedAchievement(achievement);
      setAchievementFormData({
        title: achievement.title,
        description: achievement.description,
        achievement_date: new Date(achievement.achievement_date).toISOString().split('T')[0],
        category: achievement.category,
        image_url: achievement.image_url || '',
        display_order: achievement.display_order,
        is_published: achievement.is_published
      });
    }
    setShowAchievementDialog(true);
  };

  const resetAchievementForm = () => {
    setAchievementFormData({
      title: '',
      description: '',
      achievement_date: '',
      category: 'milestone',
      image_url: '',
      display_order: 0,
      is_published: false
    });
    setSelectedAchievement(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      draft: { variant: 'secondary', label: 'Draft' },
      published: { variant: 'default', label: 'Published' },
      archived: { variant: 'outline', label: 'Archived' }
    };

    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <BackOfficeNav currentPage="Media & Communications" />
      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/back-office-dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="releases">
                <Newspaper className="h-4 w-4 mr-2" />
                Media Releases
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <TrendingUp className="h-4 w-4 mr-2" />
                Progress Timeline
              </TabsTrigger>
              <TabsTrigger value="achievements">
                <Award className="h-4 w-4 mr-2" />
                Achievements
              </TabsTrigger>
            </TabsList>

            <TabsContent value="releases">
              <div className="space-y-6">
                {/* Filter */}
                <div className="flex items-center justify-between">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Releases</SelectItem>
                      <SelectItem value="draft">Drafts</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Release
                  </Button>
                </div>

                {/* Releases List */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6d52a2]"></div>
                  </div>
                ) : releases.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Newspaper className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">No media releases found</p>
                      <Button onClick={() => setShowCreateDialog(true)} variant="outline">
                        Create Your First Release
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {releases.map((release) => (
                      <Card key={release.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-semibold text-gray-900">{release.title}</h3>
                                {getStatusBadge(release.status)}
                                {release.email_sent && (
                                  <Badge variant="outline" className="text-green-700 border-green-300">
                                    <Mail className="h-3 w-3 mr-1" />
                                    Sent
                                  </Badge>
                                )}
                              </div>

                              {release.excerpt && (
                                <p className="text-gray-600 mb-3 line-clamp-2">{release.excerpt}</p>
                              )}

                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {release.published_at ? formatDate(release.published_at) : `Created ${formatDate(release.created_at)}`}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Eye className="h-4 w-4" />
                                  {release.view_count} views
                                </span>
                              </div>
                            </div>

                            {/* Featured Image Thumbnail */}
                            {release.featured_image_url && (
                              <img
                                src={release.featured_image_url}
                                alt={release.title}
                                className="w-32 h-24 object-cover rounded-lg"
                              />
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(release)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>

                            {release.status !== 'published' && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => openPublishDialog(release)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Publish & Send
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/media?article=${release.slug}`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Preview
                            </Button>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openDeleteDialog(release)}
                              className="ml-auto"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="timeline">
              <div className="space-y-6">
                {/* Timeline management UI will go here */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Progress Timeline</h2>
                    <p className="text-gray-600 dark:text-gray-400">Manage key achievements and milestones</p>
                  </div>
                  <Button onClick={() => setShowTimelineDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Milestone
                  </Button>
                </div>

                {timelineLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6d52a2]"></div>
                  </div>
                ) : timelineItems.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">No timeline items yet</p>
                      <Button onClick={() => setShowTimelineDialog(true)} variant="outline">
                        Create First Milestone
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {timelineItems.map((item) => (
                      <Card key={item.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                                <Badge variant={item.is_published ? 'default' : 'secondary'}>
                                  {item.is_published ? 'Published' : 'Draft'}
                                </Badge>
                              </div>
                              <p className="text-gray-600 dark:text-gray-400 mb-3">{item.short_story}</p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {formatDate(item.achievement_date)}
                                </span>
                                <span>Order: {item.display_order}</span>
                              </div>
                            </div>
                            {item.image_url && (
                              <img
                                src={item.image_url}
                                alt={item.title}
                                className="w-32 h-24 object-cover rounded-lg"
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openTimelineEditDialog(item)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openTimelineDeleteDialog(item)}
                              className="ml-auto"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="achievements">
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Achievements</h2>
                    <p className="text-gray-600 dark:text-gray-400">Manage bank achievements and milestones</p>
                  </div>
                  <Button onClick={() => openAchievementDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Achievement
                  </Button>
                </div>

                {achievementsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6d52a2]"></div>
                  </div>
                ) : achievements.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">No achievements yet</p>
                      <Button onClick={() => openAchievementDialog()} variant="outline">
                        Create First Achievement
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {achievements.map((achievement: any) => (
                      <Card key={achievement.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{achievement.title}</h3>
                                <Badge variant={achievement.is_published ? 'default' : 'secondary'}>
                                  {achievement.is_published ? 'Published' : 'Draft'}
                                </Badge>
                                <Badge variant="outline">{achievement.category}</Badge>
                              </div>
                              <p className="text-gray-600 dark:text-gray-400 mb-3">{achievement.description}</p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(achievement.achievement_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                                <span>Order: {achievement.display_order}</span>
                              </div>
                            </div>
                            {achievement.image_url && (
                              <img
                                src={achievement.image_url}
                                alt={achievement.title}
                                className="w-32 h-24 object-cover rounded-lg"
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAchievementDialog(achievement)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteAchievement(achievement.id)}
                              className="ml-auto"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Create Dialog */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Media Release</DialogTitle>
                <DialogDescription>
                  Create a news article or announcement for Citizen Bank
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter release title"
                  />
                </div>

                <div>
                  <Label htmlFor="excerpt">Excerpt (Summary)</Label>
                  <Textarea
                    id="excerpt"
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    placeholder="Short summary of the release (optional)"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Full article content"
                    rows={12}
                  />
                </div>

                <ImagePicker
                  value={formData.featured_image_url}
                  onChange={(url) => setFormData({ ...formData, featured_image_url: url })}
                  label="Featured Image"
                  placeholder="Enter image URL, upload, or search"
                />

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft (save without publishing)</SelectItem>
                      <SelectItem value="published">Published (immediately visible)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} className="bg-[#6d52a2] hover:bg-[#5a4289]">
                  Create Release
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Media Release</DialogTitle>
                <DialogDescription>
                  Update the media release details
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-excerpt">Excerpt</Label>
                  <Textarea
                    id="edit-excerpt"
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-content">Content</Label>
                  <Textarea
                    id="edit-content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={12}
                  />
                </div>

                <ImagePicker
                  value={formData.featured_image_url}
                  onChange={(url) => setFormData({ ...formData, featured_image_url: url })}
                  label="Featured Image"
                  placeholder="Enter image URL, upload, or search"
                />

                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowEditDialog(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleUpdate} className="bg-[#6d52a2] hover:bg-[#5a4289]">
                  Update Release
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Publish Confirmation Dialog */}
          <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Publish & Send Newsletter?</DialogTitle>
                <DialogDescription>
                  This will publish the release and send a newsletter email to all board members.
                </DialogDescription>
              </DialogHeader>

              {selectedRelease && (
                <div className="py-4">
                  <p className="font-semibold mb-2">{selectedRelease.title}</p>
                  <p className="text-sm text-gray-600">
                    The newsletter will be sent to all active board members with a preview and link to read the full article.
                  </p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPublishDialog(false)} disabled={publishing}>
                  Cancel
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {publishing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Publish & Send
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Media Release?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. The release will be permanently deleted.
                </DialogDescription>
              </DialogHeader>

              {selectedRelease && (
                <div className="py-4">
                  <p className="font-semibold">{selectedRelease.title}</p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Timeline Dialog */}
          <Dialog open={showTimelineDialog} onOpenChange={(open) => {
            setShowTimelineDialog(open);
            if (!open) resetTimelineForm();
          }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{selectedTimeline ? 'Edit Milestone' : 'Add New Milestone'}</DialogTitle>
                <DialogDescription>
                  Create or update a milestone for the progress timeline
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="timeline-title">Title *</Label>
                  <Input
                    id="timeline-title"
                    value={timelineFormData.title}
                    onChange={(e) => setTimelineFormData({ ...timelineFormData, title: e.target.value })}
                    placeholder="Enter milestone title"
                  />
                </div>
                <div>
                  <Label htmlFor="timeline-story">Story *</Label>
                  <Textarea
                    id="timeline-story"
                    value={timelineFormData.short_story}
                    onChange={(e) => setTimelineFormData({ ...timelineFormData, short_story: e.target.value })}
                    placeholder="Describe the milestone"
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="timeline-date">Achievement Date *</Label>
                  <Input
                    id="timeline-date"
                    type="datetime-local"
                    value={timelineFormData.achievement_date}
                    onChange={(e) => setTimelineFormData({ ...timelineFormData, achievement_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="timeline-image">Image URL</Label>
                  <Input
                    id="timeline-image"
                    value={timelineFormData.image_url}
                    onChange={(e) => setTimelineFormData({ ...timelineFormData, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timeline-status">Status</Label>
                    <Select value={timelineFormData.status} onValueChange={(value) => setTimelineFormData({ ...timelineFormData, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="timeline-order">Display Order</Label>
                    <Input
                      id="timeline-order"
                      type="number"
                      value={timelineFormData.display_order}
                      onChange={(e) => setTimelineFormData({ ...timelineFormData, display_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={timelineFormData.is_published}
                    onCheckedChange={(checked) => setTimelineFormData({ ...timelineFormData, is_published: checked })}
                  />
                  <Label>Published (visible to public)</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowTimelineDialog(false)}>Cancel</Button>
                <Button onClick={selectedTimeline ? handleUpdateTimeline : handleCreateTimeline}>
                  {selectedTimeline ? 'Update' : 'Create'} Milestone
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Achievement Dialog */}
          <Dialog open={showAchievementDialog} onOpenChange={(open) => {
            setShowAchievementDialog(open);
            if (!open) resetAchievementForm();
          }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{selectedAchievement ? 'Edit Achievement' : 'Add New Achievement'}</DialogTitle>
                <DialogDescription>
                  Record a significant milestone or achievement for Citizen Bank
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="achievement-title">Title *</Label>
                  <Input
                    id="achievement-title"
                    value={achievementFormData.title}
                    onChange={(e) => setAchievementFormData({ ...achievementFormData, title: e.target.value })}
                    placeholder="Enter achievement title"
                  />
                </div>
                <div>
                  <Label htmlFor="achievement-description">Description *</Label>
                  <Textarea
                    id="achievement-description"
                    value={achievementFormData.description}
                    onChange={(e) => setAchievementFormData({ ...achievementFormData, description: e.target.value })}
                    placeholder="Describe the achievement in detail"
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="achievement-date">Achievement Date *</Label>
                    <Input
                      id="achievement-date"
                      type="date"
                      value={achievementFormData.achievement_date}
                      onChange={(e) => setAchievementFormData({ ...achievementFormData, achievement_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="achievement-category">Category</Label>
                    <Select value={achievementFormData.category} onValueChange={(value) => setAchievementFormData({ ...achievementFormData, category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regulatory">Regulatory Compliance</SelectItem>
                        <SelectItem value="award">Award</SelectItem>
                        <SelectItem value="expansion">Expansion</SelectItem>
                        <SelectItem value="milestone">Milestone</SelectItem>
                        <SelectItem value="community">Community Impact</SelectItem>
                        <SelectItem value="partnership">Partnership</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="achievement-image">Certificate/Photo URL</Label>
                  <Input
                    id="achievement-image"
                    value={achievementFormData.image_url}
                    onChange={(e) => setAchievementFormData({ ...achievementFormData, image_url: e.target.value })}
                    placeholder="https://example.com/certificate.jpg (optional)"
                  />
                </div>
                <div>
                  <Label htmlFor="achievement-order">Display Order</Label>
                  <Input
                    id="achievement-order"
                    type="number"
                    value={achievementFormData.display_order}
                    onChange={(e) => setAchievementFormData({ ...achievementFormData, display_order: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={achievementFormData.is_published}
                    onCheckedChange={(checked) => setAchievementFormData({ ...achievementFormData, is_published: checked })}
                  />
                  <Label>Published (visible on public timeline)</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAchievementDialog(false)}>Cancel</Button>
                <Button onClick={selectedAchievement ? handleUpdateAchievement : handleCreateAchievement}>
                  {selectedAchievement ? 'Update' : 'Create'} Achievement
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
