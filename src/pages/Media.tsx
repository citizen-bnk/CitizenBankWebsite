import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import brain from 'brain';
import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { AchievementsTimeline } from "components/AchievementsTimeline";
import { ProgressTimeline } from "components/ProgressTimeline";
import { LicenceStatusNote } from "components/LicenceStatusNote";
import { loadPublicPolicies } from "utils/publicContentApi";
import { Newspaper, Calendar, ArrowRight, X, Eye, Award } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { MediaReleaseListItem, MediaReleaseResponse } from 'types';

export default function Media() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [releases, setReleases] = useState<MediaReleaseListItem[]>([]);
  const [selectedRelease, setSelectedRelease] = useState<MediaReleaseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showArticle, setShowArticle] = useState(false);
  const [policies, setPolicies] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    loadPublicPolicies().then(setPolicies);
  }, []);

  useEffect(() => {
    loadReleases();
  }, []);

  // Handle direct article link from URL parameter
  useEffect(() => {
    const articleSlug = searchParams.get('article');
    if (articleSlug) {
      loadArticleBySlug(articleSlug);
    }
  }, [searchParams]);

  const loadReleases = async () => {
    try {
      setLoading(true);
      const response = await brain.list_published_releases({ limit: 20 });
      const data = await response.json();
      setReleases(data);
    } catch (error: any) {
      console.error('Error loading media releases:', error);
      toast.error('Failed to load media releases');
    } finally {
      setLoading(false);
    }
  };

  const loadArticleBySlug = async (slug: string) => {
    try {
      const response = await brain.get_media_release_by_slug({ slug });
      const data = await response.json();
      setSelectedRelease(data);
      setShowArticle(true);
    } catch (error: any) {
      console.error('Error loading article:', error);
      toast.error('Article not found');
      // Clear the URL parameter
      setSearchParams({});
    }
  };

  const handleReadMore = async (release: MediaReleaseListItem) => {
    try {
      const response = await brain.get_media_release_by_slug({ slug: release.slug });
      const data = await response.json();
      setSelectedRelease(data);
      setShowArticle(true);
      // Update URL with article slug
      setSearchParams({ article: release.slug });
    } catch (error: any) {
      console.error('Error loading article:', error);
      toast.error('Failed to load article');
    }
  };

  const handleCloseArticle = () => {
    setShowArticle(false);
    setSelectedRelease(null);
    // Clear URL parameter
    setSearchParams({});
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white py-16 pt-[calc(88px+4rem)] sm:pt-[calc(96px+4rem)] lg:pt-[calc(104px+4rem)]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold mb-4">Media Center</h1>
            <p className="text-xl text-white/90">
              Latest news, press releases and progress updates from Citizen Bank
            </p>
          </div>
        </div>
      </section>

      {/* Two Column Layout: Achievements Tabs (Left) + Latest News (Right) */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Achievements as Tabs */}
          <div className="lg:col-span-7">
            <Tabs defaultValue="achievements" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="achievements" className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Achievements
                </TabsTrigger>
                <TabsTrigger value="timeline" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Timeline
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="achievements" className="mt-0">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Our Achievements</h2>
                  <p className="text-gray-600">
                    Milestones in building Citizen Bank's technology and preparing our licence application
                  </p>
                </div>
                <AchievementsTimeline />
              </TabsContent>
              
              <TabsContent value="timeline" className="mt-0">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Our Journey</h2>
                  <p className="text-gray-600">
                    How the Citizen Bank platform has developed so far
                  </p>
                </div>
                <ProgressTimeline />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Latest News */}
          <div className="lg:col-span-5">
            <div className="sticky top-24">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Latest News</h2>
                <p className="text-gray-600">Stay updated with our latest announcements</p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6d52a2]"></div>
                </div>
              ) : releases.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <Newspaper className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No media releases available yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {releases.slice(0, 5).map((release) => (
                    <div
                      key={release.id}
                      className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg hover:border-[#6d52a2] transition-all group cursor-pointer"
                      onClick={() => handleReadMore(release)}
                    >
                      {/* Featured Image */}
                      {release.featured_image_url && (
                        <div className="relative h-40 overflow-hidden">
                          <img
                            src={release.featured_image_url}
                            alt={release.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}

                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(release.published_at || release.created_at)}
                          </span>
                          {release.view_count > 0 && (
                            <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
                              <Eye className="h-3 w-3" />
                              {release.view_count}
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-[#6d52a2] transition-colors line-clamp-2">
                          {release.title}
                        </h3>

                        {release.excerpt && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{release.excerpt}</p>
                        )}

                        <span className="text-[#6d52a2] text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                          Read More <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {releases.length > 5 && (
                    <div className="text-center pt-4">
                      <p className="text-sm text-gray-500">Showing latest 5 articles</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Media contact: shown only when the contact details are confirmed in the policy settings */}
      {(typeof policies?.['contact.media_email'] === 'string' || typeof policies?.['contact.media_phone'] === 'string') && (
        <section className="bg-white border-y border-gray-200 py-12">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Media Inquiries</h2>
            <p className="text-gray-600 mb-6">For press inquiries and media relations, please contact us</p>
            <div className="flex flex-col items-center gap-2">
              {typeof policies?.['contact.media_email'] === 'string' && (
                <p className="text-gray-900 font-medium">
                  <a href={`mailto:${policies['contact.media_email']}`}>{String(policies['contact.media_email'])}</a>
                </p>
              )}
              {typeof policies?.['contact.media_phone'] === 'string' && (
                <p className="text-gray-900 font-medium">{String(policies['contact.media_phone'])}</p>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="container mx-auto px-4 py-8">
        <LicenceStatusNote policies={policies} className="text-center" />
      </div>

      {/* Article Detail Dialog */}
      <Dialog open={showArticle} onOpenChange={handleCloseArticle}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedRelease && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <DialogTitle className="text-2xl font-bold pr-8">
                    {selectedRelease.title}
                  </DialogTitle>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(selectedRelease.published_at || selectedRelease.created_at)}
                  </span>
                  {selectedRelease.author_name && (
                    <span>By {selectedRelease.author_name}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {selectedRelease.view_count} views
                  </span>
                </div>
              </DialogHeader>

              <div className="mt-6">
                {/* Featured Image */}
                {selectedRelease.featured_image_url && (
                  <img
                    src={selectedRelease.featured_image_url}
                    alt={selectedRelease.title}
                    className="w-full h-auto max-h-96 object-cover rounded-lg mb-6"
                  />
                )}

                {/* Excerpt */}
                {selectedRelease.excerpt && (
                  <div className="bg-gray-50 border-l-4 border-[#6d52a2] p-4 mb-6">
                    <p className="text-lg text-gray-700 italic">{selectedRelease.excerpt}</p>
                  </div>
                )}

                {/* Content */}
                <div className="prose prose-lg max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {selectedRelease.content}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t flex justify-between items-center">
                <Button variant="outline" onClick={handleCloseArticle}>
                  Close
                </Button>
                <div className="text-sm text-gray-500">
                  Published on {formatDate(selectedRelease.published_at || selectedRelease.created_at)}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
