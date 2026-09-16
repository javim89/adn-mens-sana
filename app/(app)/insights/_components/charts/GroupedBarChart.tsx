'use client';

import { BarChartBase } from './BarChart';
import type { ChartProps } from './types';

export default function GroupedBarChart(props: ChartProps) {
  return <BarChartBase {...props} variant="grouped" />;
}
