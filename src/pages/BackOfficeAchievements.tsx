import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import brain from 'brain';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { BackOfficeNav } from 'components/BackOfficeNav';
import { ImagePicker } from 'components/ImagePicker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Award, Plus, Edit, Trash2, Upload, ArrowLeft, Calendar, Image as ImageIcon, Trophy, Star } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Achievement, CreateAchievementRequest, UpdateAchievementRequest } from 'types';

export default function BackOfficeAchievements() {
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPublished, setFilterPublished] = useState<string>('all');
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    achievement_date: string;
    category: string;
    image_url: string;
    display_order: number;
    is_published: boolean;
  }>({
    title: '',
    description: '',
    achievement_date: '',
    category: 'milestone',
    image_url: '',
    display_order: 0,
    is_published: false
  });

  useEffect(() => {
    loadAchievements();
  }, [filterCategory, filterPublished]);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterCategory !== 'all') params.category = filterCategory;
      if (filterPublished !== 'all') params.published = filterPublished === 'published';
      
      const response = await brain.list_all_achievements(params);
      const data = await response.json();
      setAchievements(data.achievements);
    } catch (error: any) {
      console.error('Error loading achievements:', error);
      toast.error('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.title || !formData.description || !formData.achievement_date) {
        toast.error('Title, description, and date are required');
        return;
      }

      const request: CreateAchievementRequest = {
        title: formData.title,
        description: formData.description,
        achievement_date: formData.achievement_date,
        category: formData.category,
        display_order: formData.display_order,
        is_published: formData.is_published
      };

      const response = await brain.create_achievement(request);
      if (response.ok) {
        toast.success('Achievement created successfully');
        setShowCreateDialog(false);
        resetForm();
        loadAchievements();
      } else {
        toast.error('Failed to create achievement');
      }
    } catch (error: any) {
      console.error('Error creating achievement:', error);
      toast.error('Failed to create achievement');
    }
  };

  const handleEdit = async () => {
    try {
      if (!selectedAchievement) return;
      
      if (!formData.title || !formData.description || !formData.achievement_date) {
        toast.error('Title, description, and date are required');
        return;
      }

      const request: UpdateAchievementRequest = {
        title: formData.title,
        description: formData.description,
        achievement_date: formData.achievement_date,
        category: formData.category,
        display_order: formData.display_order,
        is_published: formData.is_published
      };

      const response = await brain.update_achievement(
        { achievementId: selectedAchievement.id },
        request
      );
      
      if (response.ok) {
        toast.success('Achievement updated successfully');
        setShowEditDialog(false);
        resetForm();
        loadAchievements();
      } else {
        toast.error('Failed to update achievement');
      }
    } catch (error: any) {
      console.error('Error updating achievement:', error);
      toast.error('Failed to update achievement');
    }
  };

  const handleDelete = async () => {
    try {
      if (!selectedAchievement) return;

      const response = await brain.delete_achievement({
        achievementId: selectedAchievement.id
      });
      
      if (response.ok) {
        toast.success('Achievement deleted successfully');
        setShowDeleteDialog(false);
        setSelectedAchievement(null);
        loadAchievements();
      } else {
        toast.error('Failed to delete achievement');
      }
    } catch (error: any) {
      console.error('Error deleting achievement:', error);
      toast.error('Failed to delete achievement');
    }
  };

  const handleImageUpload = async (achievementId: number, file: File) => {
    try {
      setUploading(true);
      const response = await brain.upload_achievement_image(
        { achievementId },
        { file }
      );
      
      if (response.ok) {
        toast.success('Image uploaded successfully');
        loadAchievements();
      } else {
        toast.error('Failed to upload image');
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const openEditDialog = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setFormData({
      title: achievement.title,
      description: achievement.description,
      achievement_date: achievement.achievement_date,
      category: achievement.category,
      display_order: achievement.display_order,
      is_published: achievement.is_published
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setShowDeleteDialog(true);
  };

  const resetForm = () => {
    setFormData({
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

  const getCategoryBadge = (category: string) => {
    const variants: Record<string, { color: string; icon: any }> = {
      regulatory: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: Trophy },
      award: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: Award },
      expansion: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: Star },
      milestone: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: Calendar },
      community: { color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200', icon: Award },
      partnership: { color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200', icon: Trophy }
    };

    const variant = variants[category] || variants.milestone;
    const Icon = variant.icon;

    return (
      <Badge className={variant.color}>
        <Icon className="w-3 h-3 mr-1" />
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <BackOfficeNav />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/back-office-dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                Achievements Management
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Manage historical milestones and achievements
              </p>
            </div>
            
            <Button onClick={() => setShowCreateDialog(true)} size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Add Achievement
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Category</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="regulatory">Regulatory</SelectItem>
                    <SelectItem value="award">Awards</SelectItem>
                    <SelectItem value="expansion">Expansion</SelectItem>
                    <SelectItem value="milestone">Milestones</SelectItem>
                    <SelectItem value="community">Community</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <Label>Status</Label>
                <Select value={filterPublished} onValueChange={setFilterPublished}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievements Table */}
        <Card>
          <CardHeader>
            <CardTitle>Achievements ({achievements.length})</CardTitle>
            <CardDescription>
              Manage and organize historical achievements
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                Loading achievements...
              </div>
            ) : achievements.length === 0 ? (
              <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                No achievements found. Create your first achievement!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {achievements.map((achievement) => (
                      <TableRow key={achievement.id}>
                        <TableCell className="font-medium max-w-md">
                          {achievement.title}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {formatDate(achievement.achievement_date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getCategoryBadge(achievement.category)}
                        </TableCell>
                        <TableCell>{achievement.display_order}</TableCell>
                        <TableCell>
                          {achievement.is_published ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Published
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Draft</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {achievement.image_url ? (
                              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                <ImageIcon className="w-3 h-3 mr-1" />
                                Has Image
                              </Badge>
                            ) : (
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageUpload(achievement.id, file);
                                  }}
                                  disabled={uploading}
                                />
                                <Badge variant="outline" className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                                  <Upload className="w-3 h-3 mr-1" />
                                  Upload
                                </Badge>
                              </label>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(achievement)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(achievement)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Achievement</DialogTitle>
            <DialogDescription>
              Add a new historical milestone or achievement
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Lesotho Central Bank License Acquired"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of the achievement..."
                rows={4}
              />
            </div>
            
            <ImagePicker
              value={formData.image_url}
              onChange={(url) => setFormData({ ...formData, image_url: url })}
              label="Achievement Image"
              placeholder="Enter image URL, upload, or search"
            />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Achievement Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.achievement_date}
                  onChange={(e) => setFormData({ ...formData, achievement_date: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regulatory">Regulatory</SelectItem>
                    <SelectItem value="award">Awards</SelectItem>
                    <SelectItem value="expansion">Expansion</SelectItem>
                    <SelectItem value="milestone">Milestones</SelectItem>
                    <SelectItem value="community">Community</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="order">Display Order</Label>
              <Input
                id="order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
              <p className="text-xs text-slate-500 mt-1">
                Lower numbers appear first within the same date
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="published"
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
              />
              <Label htmlFor="published" className="cursor-pointer">
                Publish immediately
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              Create Achievement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Achievement</DialogTitle>
            <DialogDescription>
              Update achievement details
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Achievement title"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description..."
                rows={4}
              />
            </div>
            
            <ImagePicker
              value={formData.image_url}
              onChange={(url) => setFormData({ ...formData, image_url: url })}
              label="Achievement Image"
              placeholder="Enter image URL, upload, or search"
            />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-date">Achievement Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formData.achievement_date}
                  onChange={(e) => setFormData({ ...formData, achievement_date: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regulatory">Regulatory</SelectItem>
                    <SelectItem value="award">Awards</SelectItem>
                    <SelectItem value="expansion">Expansion</SelectItem>
                    <SelectItem value="milestone">Milestones</SelectItem>
                    <SelectItem value="community">Community</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-order">Display Order</Label>
              <Input
                id="edit-order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="edit-published"
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
              />
              <Label htmlFor="edit-published" className="cursor-pointer">
                Published
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Achievement</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedAchievement?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeleteDialog(false);
              setSelectedAchievement(null);
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Achievement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
}
