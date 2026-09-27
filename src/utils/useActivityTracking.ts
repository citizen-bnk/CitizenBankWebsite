/**
 * Activity Tracking Hook - Tracks user interactions for AI chatbot context
 * 
 * Usage:
 * ```tsx
 * const { trackActivity } = useActivityTracking();
 * 
 * // Track page view
 * useEffect(() => {
 *   trackActivity({ type: 'page_view', page: '/my-subscriptions' });
 * }, []);
 * 
 * // Track button click
 * <Button onClick={() => {
 *   trackActivity({
 *     type: 'click',
 *     element: 'Download Certificate',
 *     elementType: 'button',
 *     metadata: { certificateId: '123' }
 *   });
 * }}>
 * ```
 */

import { apiClient } from "app";
import { useCallback } from "react";

type ActivityType = "page_view" | "click" | "download" | "form_submit" | "search";

interface TrackActivityParams {
  type: ActivityType;
  page?: string;
  element?: string;
  elementType?: string;
  metadata?: Record<string, any>;
}

export const useActivityTracking = () => {
  const trackActivity = useCallback(async (params: TrackActivityParams) => {
    try {
      const body = {
        activity_type: params.type,
        page_path: params.page || window.location.pathname,
        element_name: params.element,
        element_type: params.elementType,
        metadata: params.metadata || {},
      };

      // Fire and forget - don't block UI
      apiClient.log_activity(body).catch((err) => {
        // Silent fail - activity tracking shouldn't break user experience
        console.debug("Activity tracking failed:", err);
      });
    } catch (error) {
      // Silent fail
      console.debug("Activity tracking error:", error);
    }
  }, []);

  return { trackActivity };
};

/**
 * Utility function to track activity without hook (for non-component contexts)
 */
export const trackActivityDirect = async (params: TrackActivityParams) => {
  try {
    const body = {
      activity_type: params.type,
      page_path: params.page || window.location.pathname,
      element_name: params.element,
      element_type: params.elementType,
      metadata: params.metadata || {},
    };

    apiClient.log_activity(body).catch((err) => {
      console.debug("Activity tracking failed:", err);
    });
  } catch (error) {
    console.debug("Activity tracking error:", error);
  }
};
