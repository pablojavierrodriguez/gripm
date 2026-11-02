import { Analytics } from '@vercel/analytics/react';
import { isAnalyticsAllowed } from '../utils/analytics.ts';

export function VercelAnalytics() {
  if (!isAnalyticsAllowed()) {
    return null;
  }

  return <Analytics />;
}

export { isAnalyticsAllowed };
