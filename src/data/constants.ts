// Default low-performance threshold (achievement % of target). Admin-configurable in Settings.
export const LOW_PERF_THRESHOLD = 40;

// Lead statuses -> class
export type StatusClass = 'progress' | 'pending' | 'rejected';
export const STATUS_CLASS: Record<string, StatusClass> = {
  converted: 'progress',
  open: 'pending',
  'under process': 'pending',
  'non converted': 'rejected',
  'not interested': 'rejected',
  rejected: 'rejected',
};
