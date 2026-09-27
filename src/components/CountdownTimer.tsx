import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  deadline: string; // ISO timestamp
  variant?: 'default' | 'compact' | 'badge';
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isUrgent: boolean; // Less than 3 days
  isCritical: boolean; // Less than 24 hours
}

function calculateTimeRemaining(deadline: string): TimeRemaining {
  const now = new Date().getTime();
  const deadlineTime = new Date(deadline).getTime();
  const diff = deadlineTime - now;

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      isUrgent: false,
      isCritical: false,
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
    isUrgent: days < 3,
    isCritical: days === 0 && hours < 24,
  };
}

export function CountdownTimer({ deadline, variant = 'default' }: Props) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(
    calculateTimeRemaining(deadline)
  );

  useEffect(() => {
    // Update every second
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(deadline));
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  // Badge variant
  if (variant === 'badge') {
    if (timeRemaining.isExpired) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Expired
        </Badge>
      );
    }

    if (timeRemaining.isCritical) {
      return (
        <Badge variant="destructive" className="gap-1">
          <Clock className="h-3 w-3" />
          {timeRemaining.hours}h {timeRemaining.minutes}m remaining
        </Badge>
      );
    }

    if (timeRemaining.isUrgent) {
      return (
        <Badge variant="outline" className="gap-1 border-orange-500 text-orange-600 dark:text-orange-500">
          <Clock className="h-3 w-3" />
          {timeRemaining.days}d {timeRemaining.hours}h remaining
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" />
        {timeRemaining.days} days remaining
      </Badge>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    if (timeRemaining.isExpired) {
      return (
        <div className="flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-500">
          <AlertTriangle className="h-4 w-4" />
          Payment Expired
        </div>
      );
    }

    const color = timeRemaining.isCritical
      ? 'text-red-600 dark:text-red-500'
      : timeRemaining.isUrgent
      ? 'text-orange-600 dark:text-orange-500'
      : 'text-muted-foreground';

    return (
      <div className={`flex items-center gap-1.5 text-sm font-medium ${color}`}>
        <Clock className="h-4 w-4" />
        {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m
      </div>
    );
  }

  // Default variant - Full display
  if (timeRemaining.isExpired) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" />
          </div>
          <div>
            <p className="font-semibold text-red-900 dark:text-red-100">Payment Deadline Expired</p>
            <p className="text-sm text-red-600 dark:text-red-400">
              Expired on {new Date(deadline).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const bgColor = timeRemaining.isCritical
    ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
    : timeRemaining.isUrgent
    ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900'
    : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900';

  const textColor = timeRemaining.isCritical
    ? 'text-red-900 dark:text-red-100'
    : timeRemaining.isUrgent
    ? 'text-orange-900 dark:text-orange-100'
    : 'text-blue-900 dark:text-blue-100';

  const iconBgColor = timeRemaining.isCritical
    ? 'bg-red-100 dark:bg-red-900/40'
    : timeRemaining.isUrgent
    ? 'bg-orange-100 dark:bg-orange-900/40'
    : 'bg-blue-100 dark:bg-blue-900/40';

  const iconColor = timeRemaining.isCritical
    ? 'text-red-600 dark:text-red-500'
    : timeRemaining.isUrgent
    ? 'text-orange-600 dark:text-orange-500'
    : 'text-blue-600 dark:text-blue-500';

  return (
    <div className={`rounded-lg border p-4 ${bgColor}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconBgColor}`}>
          <Clock className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div>
          <p className={`font-semibold ${textColor}`}>
            {timeRemaining.isCritical ? 'Payment Due Soon!' : timeRemaining.isUrgent ? 'Payment Deadline Approaching' : 'Payment Deadline'}
          </p>
          <p className={`text-sm ${iconColor}`}>
            Due: {new Date(deadline).toLocaleDateString()} at {new Date(deadline).toLocaleTimeString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="text-center">
          <div className={`text-2xl font-bold ${textColor}`}>{timeRemaining.days}</div>
          <div className={`text-xs ${iconColor}`}>Days</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${textColor}`}>{timeRemaining.hours}</div>
          <div className={`text-xs ${iconColor}`}>Hours</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${textColor}`}>{timeRemaining.minutes}</div>
          <div className={`text-xs ${iconColor}`}>Minutes</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${textColor}`}>{timeRemaining.seconds}</div>
          <div className={`text-xs ${iconColor}`}>Seconds</div>
        </div>
      </div>
    </div>
  );
}
