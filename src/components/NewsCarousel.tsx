import { useState, useEffect, useRef } from 'react';
import { apiClient } from 'app';
import { ArrowRight, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { MediaReleaseListItem, Achievement } from 'types';

interface NewsItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  date: string;
  type: 'media' | 'achievement';
  link: string;
}

export function NewsCarousel() {
  const navigate = useNavigate();
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNewsItems();
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    if (isHovering || newsItems.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % newsItems.length);
    }, 5000); // Auto-scroll every 5 seconds

    return () => clearInterval(interval);
  }, [isHovering, newsItems.length]);

  // Scroll to current index
  useEffect(() => {
    if (scrollContainerRef.current && newsItems.length > 0) {
      const container = scrollContainerRef.current;
      const cardWidth = container.scrollWidth / newsItems.length;
      container.scrollTo({
        left: currentIndex * cardWidth,
        behavior: 'smooth',
      });
    }
  }, [currentIndex, newsItems.length]);

  const loadNewsItems = async () => {
    try {
      setLoading(true);

      // Fetch both media releases and achievements
      const [mediaResponse, achievementsResponse] = await Promise.all([
        apiClient.list_published_releases({ limit: 10 }),
        apiClient.list_all_achievements({ published: true }),
      ]);

      const mediaData: MediaReleaseListItem[] = await mediaResponse.json();
      const achievementsData = await achievementsResponse.json();

      // Transform and combine data
      const mediaItems: NewsItem[] = mediaData.map((item) => ({
        id: `media-${item.id}`,
        title: item.title,
        description: item.excerpt || '',
        imageUrl: item.featured_image_url,
        date: item.published_at || item.created_at,
        type: 'media' as const,
        link: `/media?article=${item.slug}`,
      }));

      const achievementItems: NewsItem[] = achievementsData.achievements.map(
        (item: Achievement) => ({
          id: `achievement-${item.id}`,
          title: item.title,
          description: item.description,
          imageUrl: item.image_url,
          date: item.achievement_date.toString(),
          type: 'achievement' as const,
          link: '/media#achievements',
        })
      );

      // Combine and sort by date (most recent first)
      const combined = [...mediaItems, ...achievementItems]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 6); // Show 6 most recent

      setNewsItems(combined);
    } catch (error) {
      console.error('Error loading news items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? newsItems.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % newsItems.length);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  if (loading) {
    return (
      <div className="relative w-full h-[250px] sm:h-[220px] md:h-[250px] overflow-hidden">
        <div className="flex gap-4 h-full px-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)] h-full bg-gray-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (newsItems.length === 0) {
    return null; // Don't show anything if no news
  }

  return (
    <div
      className="relative w-full h-[250px] sm:h-[220px] md:h-[250px] group"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Scroll Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 h-full overflow-x-auto scrollbar-hide snap-x snap-mandatory px-4 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {newsItems.map((item, index) => (
          <div
            key={item.id}
            className="flex-shrink-0 w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)] h-full snap-center"
          >
            <div
              onClick={() => navigate(item.link)}
              className="relative h-full rounded-xl overflow-hidden cursor-pointer group/card transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
            >
              {/* Background Image */}
              <div className="absolute inset-0">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#6d52a2] via-[#5a4289] to-[#4a3570]" />
                )}
                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
              </div>

              {/* Content */}
              <div className="relative h-full flex flex-col justify-end p-6">
                {/* Date Badge */}
                <div className="absolute top-4 right-4">
                  <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 text-white text-xs font-medium">
                    <Calendar className="h-3 w-3" />
                    {formatDate(item.date)}
                  </div>
                </div>

                {/* Type Badge */}
                <div className="absolute top-4 left-4">
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                      item.type === 'media'
                        ? 'bg-blue-500/80 text-white'
                        : 'bg-amber-500/80 text-white'
                    } backdrop-blur-sm`}
                  >
                    {item.type === 'media' ? 'News' : 'Achievement'}
                  </div>
                </div>

                {/* Glass-morphism card */}
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20 transition-all duration-300 group-hover/card:bg-white/15">
                  {/* Title */}
                  <h3 className="text-white font-bold text-lg mb-2 line-clamp-1">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-white/90 text-sm mb-3 line-clamp-2">
                    {truncateText(item.description, 100)}
                  </p>

                  {/* Read More Link */}
                  <div className="flex items-center gap-1 text-white font-semibold text-sm group-hover/card:gap-2 transition-all">
                    <span>Read More</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows - Only show on desktop */}
      {newsItems.length > 3 && (
        <>
          <button
            onClick={handlePrevious}
            className="hidden lg:flex absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={handleNext}
            className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {newsItems.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'w-8 bg-white'
                : 'w-2 bg-white/50 hover:bg-white/70'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
