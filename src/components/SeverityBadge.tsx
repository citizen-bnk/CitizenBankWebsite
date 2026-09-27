import { Badge } from '@/components/ui/badge';

type SeverityLevel = 'critical' | 'urgent' | 'important' | 'normal' | 'info';

interface Props {
  severity: SeverityLevel;
  showIcon?: boolean;
  className?: string;
}

const severityConfig = {
  critical: {
    label: 'Critical',
    icon: '🔴',
    className: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800',
  },
  urgent: {
    label: 'Urgent',
    icon: '🟠',
    className: 'bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800',
  },
  important: {
    label: 'Important',
    icon: '🟡',
    className: 'bg-yellow-600 text-white hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-800',
  },
  normal: {
    label: 'Normal',
    icon: '🔵',
    className: 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800',
  },
  info: {
    label: 'Info',
    icon: '⚪',
    className: 'bg-gray-500 text-white hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700',
  },
};

export function SeverityBadge({ severity, showIcon = true, className = '' }: Props) {
  const config = severityConfig[severity] || severityConfig.normal;

  return (
    <Badge className={`${config.className} ${className}`}>
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </Badge>
  );
}
