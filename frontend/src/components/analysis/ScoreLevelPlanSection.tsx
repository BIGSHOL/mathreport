/**
 * Score Level Plan Section - 점수대별 맞춤 학습 계획
 *
 * 학생의 현재 점수를 분석하여 점수대별 맞춤 학습 계획을 표시합니다.
 */
import { memo, useState } from 'react';
import type { ScoreLevelPlanResponse } from '../../services/analysis';

interface ScoreLevelPlanSectionProps {
  plan: ScoreLevelPlanResponse;
  isLoading?: boolean;
  onRegenerate?: () => void;
}

export const ScoreLevelPlanSection = memo(function ScoreLevelPlanSection({
  plan,
  isLoading = false,
  onRegenerate,
}: ScoreLevelPlanSectionProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([0])); // 첫 번째 단계는 기본 펼침

  const togglePhase = (index: number) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
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
          <span style={{ fontSize: '16px', fontWeight: '600' }}>점수대별 학습 계획 생성 중...</span>
        </div>
      </div>
    );
  }

  // 득점률에 따른 색상
  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return '#22c55e'; // green
    if (percentage >= 80) return '#3b82f6'; // blue
    if (percentage >= 70) return '#f59e0b'; // amber
    if (percentage >= 60) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const scoreColor = getScoreColor(plan.score_percentage);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        color: 'white',
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
            점수대별 맞춤 학습 계획
          </h3>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#0ea5e9',
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
          현재 점수를 분석하여 맞춤형 학습 전략을 제공합니다
        </p>
      </div>

      {/* 현재 점수 & 목표 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* 현재 점수 */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '6px' }}>현재 점수</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: '700', color: scoreColor }}>
              {plan.current_score}
            </span>
            <span style={{ fontSize: '18px', opacity: 0.9 }}>/ {plan.total_score}점</span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: '600' }}>
            득점률: {plan.score_percentage}% ({plan.characteristics.level_name})
          </div>
        </div>

        {/* 목표 점수 */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '6px' }}>목표</div>
          <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
            {plan.improvement_goal.target_score_range}
          </div>
          <div style={{ fontSize: '13px', opacity: 0.9 }}>
            예상 기간: {plan.improvement_goal.estimated_duration}
          </div>
        </div>
      </div>

      {/* 현재 점수대 특성 */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '16px',
          color: '#374151',
        }}
      >
        <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>
          현재 점수대 특성: {plan.characteristics.score_range}
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {/* 강점 */}
          <div>
            <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#059669', marginBottom: '8px' }}>
              💪 강점
            </h5>
            <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
              {plan.characteristics.strengths.map((strength, idx) => (
                <li key={idx} style={{ fontSize: '13px', color: '#374151' }}>
                  {strength}
                </li>
              ))}
            </ul>
          </div>

          {/* 약점 */}
          <div>
            <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626', marginBottom: '8px' }}>
              🔍 약점
            </h5>
            <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
              {plan.characteristics.weaknesses.map((weakness, idx) => (
                <li key={idx} style={{ fontSize: '13px', color: '#374151' }}>
                  {weakness}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 전형적 실수 */}
        <div>
          <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#f59e0b', marginBottom: '8px' }}>
            ⚠️ 전형적인 실수
          </h5>
          <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
            {plan.characteristics.typical_mistakes.map((mistake, idx) => (
              <li key={idx} style={{ fontSize: '13px', color: '#374151' }}>
                {mistake}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 향상 목표 */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '16px',
          color: '#374151',
        }}
      >
        <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>
          🎯 향상 목표
        </h4>

        <div style={{ marginBottom: '16px' }}>
          <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#6366f1', marginBottom: '8px' }}>
            집중 학습 영역
          </h5>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {plan.improvement_goal.key_focus_areas.map((area, idx) => (
              <span
                key={idx}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#e0e7ff',
                  color: '#4338ca',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                {area}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#059669', marginBottom: '8px' }}>
            목표 달성 기준
          </h5>
          <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
            {plan.improvement_goal.success_criteria.map((criterion, idx) => (
              <li key={idx} style={{ fontSize: '13px', color: '#374151' }}>
                {criterion}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 단계별 학습 계획 */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>
          📅 단계별 학습 계획
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {plan.study_phases.map((phase, index) => {
            const isExpanded = expandedPhases.has(index);

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
                {/* 단계 헤더 */}
                <div
                  onClick={() => togglePhase(index)}
                  style={{
                    padding: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isExpanded ? '#f9fafb' : 'white',
                    transition: 'background-color 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#6366f1',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '700',
                      }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <h5 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>
                        {phase.phase_name}
                      </h5>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {phase.duration} · 주당 {phase.study_hours_per_week}시간
                      </div>
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

                {/* 단계 내용 */}
                {isExpanded && (
                  <div style={{ padding: '0 16px 16px 16px', color: '#374151' }}>
                    {/* 목표 */}
                    <div style={{ marginBottom: '16px' }}>
                      <h6 style={{ fontSize: '13px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                        단계 목표
                      </h6>
                      <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                        {phase.objectives.map((objective, idx) => (
                          <li key={idx} style={{ fontSize: '13px', color: '#374151' }}>
                            {objective}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 활동 */}
                    <div style={{ marginBottom: '16px' }}>
                      <h6 style={{ fontSize: '13px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                        구체적인 활동
                      </h6>
                      <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                        {phase.activities.map((activity, idx) => (
                          <li key={idx} style={{ fontSize: '13px', color: '#374151' }}>
                            {activity}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 중간 점검 */}
                    <div
                      style={{
                        padding: '12px',
                        backgroundColor: '#fef3c7',
                        borderRadius: '6px',
                        borderLeft: '3px solid #f59e0b',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                        중간 점검 기준
                      </div>
                      <div style={{ fontSize: '13px', color: '#78350f' }}>
                        {phase.milestone}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 일일 학습 루틴 */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '16px',
          color: '#374151',
        }}
      >
        <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '12px' }}>
          🌅 일일 학습 루틴
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {plan.daily_routine.map((routine, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'start',
                gap: '10px',
                padding: '10px',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#6366f1',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                {idx + 1}
              </div>
              <span style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6' }}>
                {routine}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 격려 메시지 */}
      <div
        style={{
          padding: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
          <svg
            style={{ width: '24px', height: '24px', flexShrink: 0, marginTop: '2px' }}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.415 0 3 3 0 014.242 0 1 1 0 001.415-1.415 5 5 0 00-7.072 0 1 1 0 000 1.415z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 8px 0' }}>응원 메시지</h4>
            <p style={{ fontSize: '14px', margin: 0, lineHeight: '1.6', opacity: 0.95 }}>
              {plan.motivational_message}
            </p>
          </div>
        </div>
      </div>

      {/* 생성 시각 */}
      <div style={{ fontSize: '12px', opacity: 0.8, textAlign: 'right' }}>
        생성 시각: {new Date(plan.generated_at).toLocaleString('ko-KR')}
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
