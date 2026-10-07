import { useEffect, useState } from "react";
import { Calendar, CheckCircle2, CircleDashed, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { listProgressTimeline } from "utils/publicContentApi";
import { formatDate, sortTimeline, timelineStatusLabel, type PublicTimelineItem } from "utils/publicContent";

const STATUS_STYLE: Record<string, string> = {
  completed: "bg-green-100 text-green-700 border-green-300",
  in_progress: "bg-blue-100 text-blue-700 border-blue-300",
  upcoming: "bg-gray-100 text-gray-700 border-gray-300",
};

/** The published progress timeline (table progress_timeline), oldest first, newest last. */
export function ProgressTimeline() {
  const [items, setItems] = useState<PublicTimelineItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listProgressTimeline()
      .then((rows) => !cancelled && setItems(sortTimeline(rows)))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <div role="alert" className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-600">We could not load the timeline. Please try again later.</p>
      </div>
    );
  }
  if (items === null) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Loading timeline">
        <Loader2 className="h-8 w-8 animate-spin text-[#6d52a2]" aria-hidden="true" />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
        <p className="text-gray-600">No timeline entries have been published yet.</p>
      </div>
    );
  }

  return (
    <ol className="space-y-6">
      {items.map((item, index) => {
        const done = item.status === "completed";
        return (
          <li key={item.id} className="relative pl-8">
            <span className="absolute left-0 top-1.5" aria-hidden="true">
              {done ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <CircleDashed className="h-5 w-5 text-blue-600" />}
            </span>
            {index < items.length - 1 && (
              <span className="absolute left-[9px] top-8 bottom-[-1.5rem] w-0.5 bg-gray-300" aria-hidden="true" />
            )}
            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant="outline" className={STATUS_STYLE[item.status] ?? STATUS_STYLE.upcoming}>
                  {timelineStatusLabel(item.status)}
                </Badge>
                <time dateTime={item.achievement_date.slice(0, 10)} className="flex items-center gap-1 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  {formatDate(item.achievement_date)}
                </time>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
              <p className="mt-1 text-gray-700 leading-relaxed whitespace-pre-wrap">{item.short_story}</p>
              {item.image_url && (
                <img src={item.image_url} alt="" loading="lazy" className="mt-3 w-full max-h-64 object-cover rounded-lg" />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
