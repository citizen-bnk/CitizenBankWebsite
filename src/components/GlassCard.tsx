import React from 'react';
import { cn } from 'utils/cn';
import { Card } from '@/components/ui/card';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className, ...props }) => {
  return (
    <Card
      className={cn(
        "bg-white/20 dark:bg-black/20 backdrop-filter backdrop-blur-lg border border-gray-200 dark:border-gray-700 shadow-lg",
        className,
      )}
      {...props}
    >
      {children}
    </Card>
  );
};

export { GlassCard };
