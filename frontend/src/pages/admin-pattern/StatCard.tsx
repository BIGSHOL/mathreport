/**
 * StatCard 컴포넌트
 * 통계 정보를 표시하는 카드
 */
import { memo } from 'react';
import { colorClasses } from './constants';

export const StatCard = memo(function StatCard({
  title,
  value,
  color
}: {
  title: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
});
