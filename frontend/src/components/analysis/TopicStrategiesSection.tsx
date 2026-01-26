/**
 * Topic Learning Strategies Section - 영역별 학습 전략
 *
 * 학생의 취약 단원별로 맞춤 학습 전략을 표시합니다.
 */
import { memo, useState } from 'react';
import type { TopicStrategiesResponse } from '../../services/analysis';

interface TopicStrategiesSectionProps {
  strategies: TopicStrategiesResponse;
  isLoading?: boolean;
  onRegenerate?: () => void;
}

// 우선순위별 색상
const PRIORITY_COLORS = {
  high: '#ef4444',      // red-500
  medium: '#f59e0b',    // amber-500
  low: '#3b82f6',       // blue-500
};

const PRIORITY_LABELS = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

export const TopicStrategiesSection = memo(function TopicStrategiesSection({
  strategies,
  isLoading = false,
  onRegenerate,
}: TopicStrategiesSectionProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  const toggleTopic = (topic: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) {
        next.delete(topic);
      } else {
        next.add(topic);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
          <span style={{ fontSize: '16px', fontWeight: '600' }}>영역별 학습 전략 생성 중...</span>
        </div>
      </div>
    );
  }

  if (!strategies || strategies.strategies.length === 0) {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          color: 'white',
        }}
      >
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>
          영역별 학습 전략
        </h3>
        <p style={{ fontSize: '14px', opacity: 0.9 }}>
          모든 문제를 정확히 풀었습니다. 현재 수준을 유지하며 새로운 유형의 문제를 학습하세요.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        color: 'white',
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
            영역별 학습 전략
          </h3>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#667eea',
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
          취약 단원별로 구체적인 학습 전략을 제공합니다
        </p>
      </div>

      {/* 전반적인 학습 가이드 */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
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
            <h4 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 6px 0' }}>전반적인 학습 가이드</h4>
            <p style={{ fontSize: '14px', margin: 0, opacity: 0.95, lineHeight: '1.5' }}>
              {strategies.overall_guidance}
            </p>
          </div>
        </div>
      </div>

      {/* 권장 학습 순서 */}
      {strategies.study_sequence.length > 0 && (
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
          }}
        >
          <h4 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 12px 0' }}>권장 학습 순서</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {strategies.study_sequence.map((topic, index) => (
              <div
                key={index}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '20px',
                    height: '20px',
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    borderRadius: '50%',
                    textAlign: 'center',
                    lineHeight: '20px',
                    fontSize: '11px',
                    fontWeight: '700',
                  }}
                >
                  {index + 1}
                </span>
                {topic}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 단원별 전략 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {strategies.strategies.map((strategy, index) => {
          const isExpanded = expandedTopics.has(strategy.topic);
          const priorityColor = PRIORITY_COLORS[strategy.priority];
          const priorityLabel = PRIORITY_LABELS[strategy.priority];

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
                onClick={() => toggleTopic(strategy.topic)}
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
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: priorityColor,
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: '700',
                    }}
                  >
                    {priorityLabel}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>
                      {strategy.topic}
                    </h4>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                      {strategy.weakness_summary}
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
                  {/* 학습 방법 */}
                  <div style={{ marginBottom: '20px' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                      📚 추천 학습 방법
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {strategy.study_methods.map((method, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '12px',
                            backgroundColor: '#f9fafb',
                            borderRadius: '6px',
                            borderLeft: '3px solid ' + priorityColor,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <strong style={{ fontSize: '13px', color: '#111827' }}>{method.method}</strong>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>{method.estimated_time}</span>
                          </div>
                          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: '1.5' }}>
                            {method.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 핵심 개념 */}
                  <div style={{ marginBottom: '20px' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                      🎯 집중 학습할 핵심 개념
                    </h5>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {strategy.key_concepts.map((concept, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#ede9fe',
                            color: '#6d28d9',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '500',
                          }}
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 문제 풀이 팁 */}
                  <div style={{ marginBottom: '20px' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                      💡 문제 풀이 팁
                    </h5>
                    <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                      {strategy.practice_tips.map((tip, idx) => (
                        <li key={idx} style={{ fontSize: '13px', color: '#374151' }}>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 흔한 실수 */}
                  <div style={{ marginBottom: '20px' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                      ⚠️ 흔한 실수
                    </h5>
                    <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                      {strategy.common_mistakes.map((mistake, idx) => (
                        <li key={idx} style={{ fontSize: '13px', color: '#dc2626' }}>
                          {mistake}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 추천 학습 자료 */}
                  <div style={{ marginBottom: '20px' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                      📖 추천 학습 자료
                    </h5>
                    <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                      {strategy.recommended_resources.map((resource, idx) => (
                        <li key={idx} style={{ fontSize: '13px', color: '#374151' }}>
                          {resource}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 학습 진도 체크리스트 */}
                  <div>
                    <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                      ✅ 학습 진도 체크리스트
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {strategy.progress_checklist.map((item, idx) => (
                        <label
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px',
                            backgroundColor: '#f9fafb',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                          }}
                        >
                          <input
                            type="checkbox"
                            style={{
                              width: '16px',
                              height: '16px',
                              cursor: 'pointer',
                              accentColor: priorityColor,
                            }}
                          />
                          <span style={{ fontSize: '13px', color: '#374151' }}>{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 생성 시각 */}
      <div style={{ marginTop: '16px', fontSize: '12px', opacity: 0.8, textAlign: 'right' }}>
        생성 시각: {new Date(strategies.generated_at).toLocaleString('ko-KR')}
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
