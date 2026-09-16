'use client';

import { PieChartBase } from './PieChart';
import type { ChartProps } from './types';

export default function DonutChart(props: ChartProps) {
  return <PieChartBase {...props} donut />;
}
