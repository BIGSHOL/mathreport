/**
 * Exam Preparation Strategy Section - 시험 대비 전략
 *
 * 학생의 시험 대비를 위한 D-day 카운트다운 기반 학습 전략을 표시합니다.
 */
import { memo, useState } from 'react';
import type { ExamPrepStrategyResponse } from '../../services/analysis';

interface ExamPrepStrategySectionProps {
  strategy: ExamPrepStrategyResponse;
  isLoading?: boolean;
  onRegenerate?: () => void;
}

export const ExamPrepStrategySection = memo(function ExamPrepStrategySection({
  strategy,
  isLoading = false,
  onRegenerate,
}: ExamPrepStrategySectionProps) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set([strategy?.daily_plans[0]?.day_label]));

  const toggleDay = (dayLabel: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayLabel)) {
        next.delete(dayLabel);
      } else {
        next.add(dayLabel);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
          <div
            style={{
              width: '20px',
              height: '20px',
              border: '2px solid white',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span style={{ fontSize: '16px', fontWeight: '600' }}>시험 대비 전략 생성 중...</span>
        </div>
      </div>
    );
  }

  if (!strategy) {
    return null;
  }

  // D-day 색상
  const getDDayColor = (days: number) => {
    if (days === 0) return '#dc2626'; // red-600
    if (days <= 3) return '#f97316'; // orange-500
    if (days <= 7) return '#f59e0b'; // amber-500
    return '#3b82f6'; // blue-500
  };

  const dDayColor = getDDayColor(strategy.days_until_exam);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        color: 'white',
      }}
    >
      {/* 헤더 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
            시험 대비 전략
          </h3>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#ec4899',
                backgroundColor: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              다시 생성
            </button>
          )}
        </div>
        <p style={{ fontSize: '14px', margin: '0 0 16px 0', opacity: 0.9 }}>
          {strategy.exam_name}까지 맞춤 학습 전략을 제공합니다
        </p>
      </div>

      {/* D-day 카운터 & 목표 */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px',
          color: '#111827',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'inline-block',
                padding: '8px 16px',
                backgroundColor: dDayColor,
                color: 'white',
                borderRadius: '8px',
                fontSize: '24px',
                fontWeight: '700',
              }}
            >
              D-{strategy.days_until_exam}
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#111827' }}>
                {strategy.exam_name}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                {strategy.days_until_exam}일 남음
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>목표 점수 향상</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#ec4899' }}>
              {strategy.target_score_improvement}
            </div>
          </div>
        </div>
      </div>

      {/* 우선 학습 영역 */}
      {strategy.priority_areas.length > 0 && (
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <h4 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 16px 0' }}>
            🎯 우선 학습 영역
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {strategy.priority_areas.map((area, index) => (
              <div
                key={index}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>
                      {area.topic}
                    </div>
                    <div style={{ fontSize: '13px', opacity: 0.95 }}>
                      {area.reason}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '4px 10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.3)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                      marginLeft: '12px',
                    }}
                  >
                    {area.estimated_hours}시간
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {area.key_points.map((point, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.25)',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    >
                      {point}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 일별 학습 계획 */}
      {strategy.daily_plans.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 16px 0' }}>
            📅 일별 학습 계획
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {strategy.daily_plans.map((plan, index) => {
              const isExpanded = expandedDays.has(plan.day_label);

              return (
                <div
                  key={index}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  {/* 헤더 */}
                  <div
                    onClick={() => toggleDay(plan.day_label)}
                    style={{
                      padding: '16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isExpanded ? '#fef3c7' : 'white',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <div
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          backgroundColor: getDDayColor(
                            plan.day_label === 'D-day' ? 0 :
                            parseInt(plan.day_label.replace('D-', '')) || 7
                          ),
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: '700',
                        }}
                      >
                        {plan.day_label}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h5 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>
                          {plan.focus}
                        </h5>
                        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                          {plan.time_allocation}
                        </p>
                      </div>
                    </div>
                    <svg
                      style={{
                        width: '20px',
                        height: '20px',
                        color: '#9ca3af',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* 확장 내용 */}
                  {isExpanded && (
                    <div style={{ padding: '0 16px 16px 16px', color: '#374151' }}>
                      {/* 활동 목록 */}
                      <div style={{ marginBottom: '16px' }}>
                        <h6 style={{ fontSize: '13px', fontWeight: '600', color: '#111827', marginBottom: '10px' }}>
                          📋 학습 활동
                        </h6>
                        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                          {plan.activities.map((activity, idx) => (
                            <li key={idx} style={{ fontSize: '13px', color: '#374151' }}>
                              {activity}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Do's and Don'ts */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {/* Do's */}
                        <div
                          style={{
                            padding: '12px',
                            backgroundColor: '#d1fae5',
                            borderRadius: '6px',
                            borderLeft: '3px solid #10b981',
                          }}
                        >
                          <h6 style={{ fontSize: '13px', fontWeight: '600', color: '#065f46', marginBottom: '8px' }}>
                            ✅ 해야 할 것
                          </h6>
                          <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: '1.6' }}>
                            {plan.dos.map((item, idx) => (
                              <li key={idx} style={{ fontSize: '12px', color: '#065f46' }}>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Don'ts */}
                        <div
                          style={{
                            padding: '12px',
                            backgroundColor: '#fee2e2',
                            borderRadius: '6px',
                            borderLeft: '3px solid #ef4444',
                          }}
                        >
                          <h6 style={{ fontSize: '13px', fontWeight: '600', color: '#991b1b', marginBottom: '8px' }}>
                            ❌ 하지 말아야 할 것
                          </h6>
                          <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: '1.6' }}>
                            {plan.donts.map((item, idx) => (
                              <li key={idx} style={{ fontSize: '12px', color: '#991b1b' }}>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 시험 당일 전략 */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px',
          color: '#111827',
        }}
      >
        <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>
          🎯 시험 당일 전략
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {/* 시험 전 */}
          <div>
            <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '10px' }}>
              ⏰ 시험 전
            </h5>
            <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
              {strategy.exam_day_strategy.before_exam.map((item, idx) => (
                <li key={idx} style={{ fontSize: '13px', color: '#374151' }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* 시험 중 */}
          <div>
            <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '10px' }}>
              ✏️ 시험 중
            </h5>
            <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
              {strategy.exam_day_strategy.during_exam.map((item, idx) => (
                <li key={idx} style={{ fontSize: '13px', color: '#374151' }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* 시간 관리 */}
          <div
            style={{
              padding: '12px',
              backgroundColor: '#e0e7ff',
              borderRadius: '6px',
              borderLeft: '3px solid #6366f1',
            }}
          >
            <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#3730a3', marginBottom: '10px' }}>
              ⏱️ 시간 관리
            </h5>
            <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: '1.6' }}>
              {strategy.exam_day_strategy.time_management.map((item, idx) => (
                <li key={idx} style={{ fontSize: '12px', color: '#3730a3' }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* 스트레스 관리 */}
          <div
            style={{
              padding: '12px',
              backgroundColor: '#dbeafe',
              borderRadius: '6px',
              borderLeft: '3px solid #3b82f6',
            }}
          >
            <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#1e3a8a', marginBottom: '10px' }}>
              😌 스트레스 관리
            </h5>
            <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: '1.6' }}>
              {strategy.exam_day_strategy.stress_management.map((item, idx) => (
                <li key={idx} style={{ fontSize: '12px', color: '#1e3a8a' }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 최종 조언 */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
          <svg
            style={{ width: '20px', height: '20px', flexShrink: 0, marginTop: '2px' }}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 6px 0' }}>최종 조언</h4>
            <p style={{ fontSize: '14px', margin: 0, opacity: 0.95, lineHeight: '1.6' }}>
              {strategy.final_advice}
            </p>
          </div>
        </div>
      </div>

      {/* 생성 시각 */}
      <div style={{ fontSize: '12px', opacity: 0.8, textAlign: 'right' }}>
        생성 시각: {new Date(strategy.generated_at).toLocaleString('ko-KR')}
      </div>

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
});
