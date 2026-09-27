import React from "react";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ViewType = "list" | "card";

interface Props {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  storageKey?: string;
}

export function ViewToggle({ currentView, onViewChange, storageKey }: Props) {
  const handleViewChange = (view: ViewType) => {
    onViewChange(view);
    if (storageKey) {
      localStorage.setItem(storageKey, view);
    }
  };

  return (
    <div className="flex items-center gap-1 border rounded-lg p-1 bg-background">
      <Button
        variant={currentView === "list" ? "default" : "ghost"}
        size="sm"
        onClick={() => handleViewChange("list")}
        className="h-8 px-3"
        aria-label="List view"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant={currentView === "card" ? "default" : "ghost"}
        size="sm"
        onClick={() => handleViewChange("card")}
        className="h-8 px-3"
        aria-label="Card view"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  );
}

/**
 * Hook to manage view state with localStorage persistence
 */
export function useViewToggle(storageKey: string, defaultView: ViewType = "list") {
  const [view, setView] = React.useState<ViewType>(() => {
    const stored = localStorage.getItem(storageKey);
    return (stored === "list" || stored === "card") ? stored : defaultView;
  });

  return { view, setView };
}
