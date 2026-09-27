import { useState, useEffect } from 'react';
import { Calendar, Award, Building2, Trophy, Users, Handshake, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { apiClient } from "app";
import { toast } from 'sonner';

interface Achievement {
  id: number;
  title: string;
  description: string;
  achievement_date: string;
  category: string;
  image_url: string | null;
  display_order: number;
  is_published: boolean;
}

interface Props {
  filterCategory?: string;
}

const categoryConfig = {
  regulatory: {
    icon: CheckCircle2,
    label: 'Regulatory Compliance',
    color: 'bg-blue-100 text-blue-700 border-blue-300'
  },
  award: {
    icon: Trophy,
    label: 'Award',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300'
  },
  expansion: {
    icon: Building2,
    label: 'Expansion',
    color: 'bg-green-100 text-green-700 border-green-300'
  },
  milestone: {
    icon: Award,
    label: 'Milestone',
    color: 'bg-purple-100 text-purple-700 border-purple-300'
  },
  community: {
    icon: Users,
    label: 'Community Impact',
    color: 'bg-pink-100 text-pink-700 border-pink-300'
  },
  partnership: {
    icon: Handshake,
    label: 'Partnership',
    color: 'bg-orange-100 text-orange-700 border-orange-300'
  }
};

export function AchievementsTimeline({ filterCategory }: Props) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(filterCategory || null);

  useEffect(() => {
    loadAchievements();
  }, [selectedCategory]);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const params = selectedCategory ? { category: selectedCategory } : {};
      const response = await apiClient.get_timeline(params);
      const data = await response.json();
      setAchievements(data.achievements);
    } catch (error: any) {
      console.error('Error loading achievements:', error);
      toast.error('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const groupByYear = (achievements: Achievement[]) => {
    const groups: { [key: string]: Achievement[] } = {};
    achievements.forEach(achievement => {
      const year = new Date(achievement.achievement_date).getFullYear().toString();
      if (!groups[year]) {
        groups[year] = [];
      }
      groups[year].push(achievement);
    });
    return groups;
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6d52a2]"></div>
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div className="text-center py-12">
        <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No achievements to display.</p>
      </div>
    );
  }

  const groupedAchievements = groupByYear(achievements);
  const years = Object.keys(groupedAchievements).sort((a, b) => parseInt(b) - parseInt(a));

  return (
    <div className="space-y-8">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          All Categories
        </Button>
        {Object.entries(categoryConfig).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <Button
              key={key}
              variant={selectedCategory === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(key)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {config.label}
            </Button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="relative">
        {years.map((year, yearIndex) => (
          <div key={year} className="mb-12 last:mb-0">
            {/* Year Header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-[#6d52a2] text-white px-6 py-2 rounded-full font-bold text-lg">
                {year}
              </div>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>

            {/* Achievements for this year */}
            <div className="space-y-6 ml-4 md:ml-8">
              {groupedAchievements[year].map((achievement, index) => {
                const config = categoryConfig[achievement.category as keyof typeof categoryConfig] || categoryConfig.milestone;
                const Icon = config.icon;
                const isExpanded = expandedId === achievement.id;
                const isLongDescription = achievement.description.length > 200;
                const displayDescription = isExpanded || !isLongDescription
                  ? achievement.description
                  : achievement.description.slice(0, 200) + '...';

                return (
                  <div key={achievement.id} className="relative pl-8 md:pl-12">
                    {/* Timeline dot and line */}
                    <div className="absolute left-0 top-2">
                      <div className="w-4 h-4 rounded-full bg-[#6d52a2] border-4 border-white shadow-md"></div>
                      {index < groupedAchievements[year].length - 1 && (
                        <div className="absolute left-1/2 top-4 w-0.5 h-full bg-gray-300 -translate-x-1/2"></div>
                      )}
                    </div>

                    {/* Achievement Card */}
                    <Card className="hover:shadow-lg transition-all duration-300 group">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-4">
                          {/* Content */}
                          <div className="flex-1">
                            <div className="flex items-start gap-3 mb-3">
                              <div className={`p-2 rounded-lg ${config.color.split(' ')[0]}`}>
                                <Icon className={`h-5 w-5 ${config.color.split(' ')[1]}`} />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#6d52a2] transition-colors">
                                  {achievement.title}
                                </h3>
                                <div className="flex items-center gap-3 mb-3">
                                  <Badge variant="outline" className={config.color}>
                                    {config.label}
                                  </Badge>
                                  <span className="flex items-center gap-1 text-sm text-gray-500">
                                    <Calendar className="h-4 w-4" />
                                    {formatDate(achievement.achievement_date)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                              {displayDescription}
                            </p>

                            {isLongDescription && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpand(achievement.id)}
                                className="mt-2 text-[#6d52a2] hover:text-[#5a4289]"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="h-4 w-4 mr-1" />
                                    Show Less
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-4 w-4 mr-1" />
                                    Read More
                                  </>
                                )}
                              </Button>
                            )}
                          </div>

                          {/* Image */}
                          {achievement.image_url && (
                            <div className="md:w-48 flex-shrink-0">
                              <img
                                src={achievement.image_url}
                                alt={achievement.title}
                                className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setSelectedImage(achievement.image_url)}
                              />
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
        ))}
      </div>

      {/* Image Lightbox */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0">
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Achievement"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
