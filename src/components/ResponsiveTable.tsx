import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { useMediaQuery } from "utils/use-media-query";
import React from "react";
import { useCurrency } from "components/CurrencyProvider";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  isCurrency?: boolean;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  renderCard?: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  emptyMessage?: string;
  mobileBreakpoint?: string;
  forceView?: "table" | "card";
  className?: string;
}

export function ResponsiveTable<T extends Record<string, any>>({
  columns,
  data,
  renderCard,
  keyExtractor,
  emptyMessage = "No data available",
  mobileBreakpoint = "768px",
  forceView,
  className,
}: Props<T>) {
  const isMobile = useMediaQuery(`(max-width: ${mobileBreakpoint})`);
  const showCardView = forceView === "card" || (forceView !== "table" && isMobile && renderCard);
  const { formatCurrency } = useCurrency();

  // Empty state
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  // Card view for mobile or when forced
  if (showCardView && renderCard) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {data.map((item, index) => (
          <div key={keyExtractor(item, index)}>
            {renderCard(item, index)}
          </div>
        ))}
      </div>
    );
  }

  // Table view with horizontal scroll on mobile
  return (
    <div className={`rounded-md border ${className || ''}`}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow key={keyExtractor(item, index)}>
                {columns.map((column) => {
                  const value = item[column.key];
                  const displayValue = column.render
                    ? column.render(item)
                    : column.isCurrency && typeof value === 'number'
                    ? formatCurrency(value)
                    : value;

                  return (
                    <TableCell key={`${keyExtractor(item, index)}-${column.key}`} className={column.className}>
                      {displayValue}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
