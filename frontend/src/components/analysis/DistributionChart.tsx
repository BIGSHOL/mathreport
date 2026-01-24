/**
 * Distribution chart component for difficulty/type visualization.
 * Implements: rerender-memo (memoized component)
 */
import { memo } from 'react';

interface DistributionChartProps {
  title: string;
  distribution: Record<string, number>;
  total: number;
  color: 'indigo' | 'green';
  showZero?: boolean;
}

export const DistributionChart = memo(function DistributionChart({
  title,
  distribution,
  total,
  color,
  showZero = false,
}: DistributionChartProps) {
  const colorClass = color === 'indigo' ? 'bg-indigo-600' : 'bg-green-500';

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <div className="space-y-4">
        {Object.entries(distribution).map(([label, count]) =>
          // Explicit conditional rendering (rendering-conditional-render)
          showZero || count > 0 ? (
            <div key={label}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {label}
                </span>
                <span className="text-sm text-gray-500">{count}문항</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`${colorClass} h-2.5 rounded-full`}
                  style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
});
