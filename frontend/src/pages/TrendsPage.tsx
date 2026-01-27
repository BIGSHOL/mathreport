/**
 * 출제 경향 분석 페이지
 */

import React, { useState } from 'react';
import useSWR from 'swr';
import trendsService from '../services/trends';
import type { TrendsResponse, TrendsRequest } from '../types/trends';
import { TrendInsightsSection } from '../components/trends/TrendInsightsSection';

const TrendsPage: React.FC = () => {
  const [filters, setFilters] = useState<TrendsRequest>({});
  const [withInsights, setWithInsights] = useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  // SWR로 트렌드 데이터 가져오기
  const { data, error, isLoading, mutate } = useSWR<TrendsResponse>(
    ['/api/v1/trends', filters, withInsights],
    () => trendsService.getTrends({ ...filters, with_insights: withInsights })
  );

  // AI 인사이트 생성 핸들러
  const handleGenerateInsights = async () => {
    setIsLoadingInsights(true);
    setWithInsights(true);
    try {
      await mutate();
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // AI 인사이트 재생성 확인 모달 표시
  const handleShowRegenerateConfirm = () => {
    setShowRegenerateConfirm(true);
  };

  // AI 인사이트 재생성 핸들러
  const handleRegenerateInsights = async () => {
    setShowRegenerateConfirm(false);
    setIsLoadingInsights(true);
    try {
      // 캐시 무시하고 강제 재조회
      await mutate(undefined, { revalidate: true });
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const handleFilterChange = (key: keyof TrendsRequest, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const handleResetFilters = () => {
    setFilters({});
  };

  if (isLoading) {
    return (
      <div style={{ padding: '24px' }}>
        <h1>출제 경향 분석</h1>
        <p>데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <h1>출제 경향 분석</h1>
        <p style={{ color: 'red' }}>데이터를 불러오지 못했습니다.</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { summary, topics, difficulty, question_types, question_formats, textbooks } = data;

  // 데이터가 없는 경우
  if (summary.total_exams === 0) {
    return (
      <div style={{ padding: '24px' }}>
        <h1>출제 경향 분석</h1>
        <p>분석된 시험지가 없습니다. 시험지를 업로드하고 분석을 완료해주세요.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>출제 경향 분석</h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        분석된 시험지를 기반으로 출제 경향을 확인하세요
      </p>

      {/* 필터 */}
      <div
        style={{
          background: '#f5f5f5',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>과목</label>
          <input
            type="text"
            placeholder="예: 수학"
            value={filters.subject || ''}
            onChange={(e) => handleFilterChange('subject', e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>학년</label>
          <input
            type="text"
            placeholder="예: 중2"
            value={filters.grade || ''}
            onChange={(e) => handleFilterChange('grade', e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>지역</label>
          <input
            type="text"
            placeholder="예: 서울_강남구"
            value={filters.school_region || ''}
            onChange={(e) => handleFilterChange('school_region', e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>학교 유형</label>
          <input
            type="text"
            placeholder="예: 일반고"
            value={filters.school_type || ''}
            onChange={(e) => handleFilterChange('school_type', e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
        <div style={{ alignSelf: 'flex-end' }}>
          <button
            onClick={handleResetFilters}
            style={{
              padding: '6px 16px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            필터 초기화
          </button>
        </div>
      </div>

      {/* 요약 통계 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
          <div style={{ fontSize: '14px', color: '#666' }}>분석된 시험지</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>
            {summary.total_exams}개
          </div>
        </div>
        <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
          <div style={{ fontSize: '14px', color: '#666' }}>전체 문항 수</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>
            {summary.total_questions}문항
          </div>
        </div>
        <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
          <div style={{ fontSize: '14px', color: '#666' }}>시험지당 평균 문항</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>
            {summary.avg_questions_per_exam.toFixed(1)}문항
          </div>
        </div>
        {summary.avg_confidence !== null && (
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>평균 신뢰도</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>
              {(summary.avg_confidence * 100).toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      {/* 난이도 분포 */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>난이도 분포</h2>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {difficulty.map((d) => (
            <div
              key={d.difficulty}
              style={{
                flex: '1',
                minWidth: '200px',
                padding: '16px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                {/* 4단계 시스템 */}
                {d.difficulty === 'concept' && '개념'}
                {d.difficulty === 'pattern' && '유형'}
                {d.difficulty === 'reasoning' && '심화'}
                {d.difficulty === 'creative' && '최상위'}
                {/* 3단계 시스템 (하위 호환) */}
                {d.difficulty === 'high' && '상'}
                {d.difficulty === 'medium' && '중'}
                {d.difficulty === 'low' && '하'}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196F3' }}>
                {d.count}문항
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                {d.percentage.toFixed(1)}% (평균 {d.avg_points.toFixed(1)}점)
              </div>
              <div
                style={{
                  marginTop: '8px',
                  height: '8px',
                  background: '#e0e0e0',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${d.percentage}%`,
                    height: '100%',
                    background: '#2196F3',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 문항 유형 분포 */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>문항 유형 분포</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
          {question_types.map((qt) => (
            <div
              key={qt.question_type}
              style={{
                padding: '12px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {qt.question_type === 'calculation' && '계산'}
                  {qt.question_type === 'geometry' && '도형'}
                  {qt.question_type === 'application' && '응용'}
                  {qt.question_type === 'proof' && '증명'}
                  {qt.question_type === 'graph' && '그래프'}
                  {qt.question_type === 'statistics' && '통계'}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                  {qt.count}문항 ({qt.percentage.toFixed(1)}%)
                </div>
              </div>
              {qt.avg_difficulty && (
                <div
                  style={{
                    fontSize: '12px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: '#f0f0f0',
                  }}
                >
                  {/* 4단계 시스템 */}
                  {qt.avg_difficulty === 'concept' && '개념'}
                  {qt.avg_difficulty === 'pattern' && '유형'}
                  {qt.avg_difficulty === 'reasoning' && '심화'}
                  {qt.avg_difficulty === 'creative' && '최상위'}
                  {/* 3단계 시스템 */}
                  {qt.avg_difficulty === 'high' && '상'}
                  {qt.avg_difficulty === 'medium' && '중'}
                  {qt.avg_difficulty === 'low' && '하'}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 문항 형식 분포 */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>문항 형식 분포</h2>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {question_formats.map((qf) => (
            <div
              key={qf.question_format}
              style={{
                flex: '1',
                minWidth: '200px',
                padding: '16px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                {qf.question_format === 'objective' && '객관식'}
                {qf.question_format === 'short_answer' && '단답형'}
                {qf.question_format === 'essay' && '서술형'}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>
                {qf.count}문항
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                {qf.percentage.toFixed(1)}% (평균 {qf.avg_points.toFixed(1)}점)
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 교과서별 출제 경향 */}
      {textbooks.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>교과서별 출제 경향</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {textbooks.map((tb) => (
              <div
                key={tb.textbook}
                style={{
                  padding: '16px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                }}
              >
                <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                  {tb.textbook}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FF9800', marginBottom: '8px' }}>
                  {tb.count}문항 ({tb.percentage.toFixed(1)}%)
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  <strong>포함 단원:</strong>
                  <div style={{ marginTop: '4px' }}>
                    {tb.chapters.map((ch, idx) => (
                      <span key={idx} style={{ marginRight: '8px', fontSize: '12px' }}>
                        • {ch}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI 트렌드 인사이트 */}
      {!data.insights && !isLoadingInsights && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            background: 'linear-gradient(to right, rgb(243, 232, 255), rgb(253, 242, 248))',
            borderRadius: '12px',
            border: '1px solid rgb(216, 180, 254)',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  flexShrink: 0,
                  width: '40px',
                  height: '40px',
                  background: 'rgb(147, 51, 234)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg style={{ width: '24px', height: '24px', color: 'white' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'rgb(17, 24, 39)', marginBottom: '2px' }}>
                    AI 트렌드 인사이트
                  </h3>
                  <p style={{ fontSize: '12px', color: 'rgb(107, 114, 128)' }}>
                    출제 경향 데이터를 AI가 분석하여 전문가 수준의 인사이트를 제공합니다
                  </p>
                </div>
              </div>
              <button
                onClick={handleGenerateInsights}
                style={{
                  padding: '8px 16px',
                  background: 'rgb(147, 51, 234)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgb(126, 34, 206)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgb(147, 51, 234)'}
              >
                인사이트 생성 (1크레딧)
              </button>
            </div>
            <p style={{ fontSize: '11px', color: 'rgb(161, 98, 7)', marginTop: '8px', textAlign: 'right' }}>
              ⚠️ 인사이트 생성 시 1크레딧이 소모됩니다
            </p>
          </div>
        </div>
      )}
      {(data.insights || isLoadingInsights) && (
        <div style={{ marginBottom: '32px' }}>
          <TrendInsightsSection
            insights={data.insights || null}
            isLoading={isLoadingInsights}
            onRegenerate={handleShowRegenerateConfirm}
          />
        </div>
      )}

      {/* 인사이트 재생성 확인 모달 */}
      {showRegenerateConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '24px',
            maxWidth: '400px',
            margin: '0 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: 'rgb(254, 243, 199)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg style={{ width: '20px', height: '20px', color: 'rgb(217, 119, 6)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: 'bold', color: 'rgb(17, 24, 39)' }}>
                인사이트 재생성
              </h4>
            </div>
            <p style={{ fontSize: '14px', color: 'rgb(75, 85, 99)', marginBottom: '8px', lineHeight: '1.5' }}>
              AI 인사이트를 재생성하시겠습니까?
            </p>
            <div style={{
              backgroundColor: 'rgb(254, 252, 232)',
              border: '1px solid rgb(253, 224, 71)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px'
            }}>
              <p style={{ fontSize: '13px', color: 'rgb(161, 98, 7)', fontWeight: '500' }}>
                ⚠️ 재생성 시 1크레딧이 소모됩니다
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowRegenerateConfirm(false)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  fontSize: '14px',
                  color: 'rgb(75, 85, 99)',
                  backgroundColor: 'rgb(243, 244, 246)',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(229, 231, 235)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(243, 244, 246)'}
              >
                취소
              </button>
              <button
                onClick={handleRegenerateInsights}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  fontSize: '14px',
                  color: 'white',
                  backgroundColor: 'rgb(147, 51, 234)',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(126, 34, 206)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(147, 51, 234)'}
              >
                재생성 (1크레딧)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 출제 특징 인사이트 (규칙 기반) */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>출제 특징 통계</h2>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '24px',
          borderRadius: '12px',
          color: 'white'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            {/* 통합형 문제 비율 */}
            {(() => {
              return (
                <div style={{
                  background: 'rgba(255,255,255,0.15)',
                  padding: '16px',
                  borderRadius: '8px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px' }}>📚 교과서 연계성</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>
                    {textbooks.length > 0 ? `${textbooks.length}개` : '분석중'}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>
                    {textbooks.length > 0
                      ? `${textbooks.slice(0, 2).map(t => t.textbook).join(', ')} 등`
                      : '교과서 정보가 충분하지 않습니다'}
                  </div>
                </div>
              );
            })()}

            {/* 변별력 지수 */}
            {(() => {
              // 난이도 분포 균형도 계산 (엔트로피 기반)
              const total = difficulty.reduce((sum, d) => sum + d.count, 0);
              if (total === 0) return null;

              const entropy = difficulty.reduce((ent, d) => {
                const p = d.count / total;
                return p > 0 ? ent - p * Math.log2(p) : ent;
              }, 0);

              // 최대 엔트로피 (균등 분포일 때)
              const maxEntropy = Math.log2(difficulty.length);
              const balance = ((entropy / maxEntropy) * 100).toFixed(0);

              return (
                <div style={{
                  background: 'rgba(255,255,255,0.15)',
                  padding: '16px',
                  borderRadius: '8px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px' }}>⚖️ 난이도 균형도</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>
                    {balance}%
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>
                    {parseInt(balance) >= 80 ? '매우 균형잡힌 출제' :
                     parseInt(balance) >= 60 ? '양호한 분포' :
                     '특정 난이도 편중'}
                  </div>
                </div>
              );
            })()}

            {/* 문항 유형 다양성 */}
            {(() => {
              const dominantType = question_types.reduce((max, qt) =>
                qt.count > max.count ? qt : max, question_types[0]);

              return (
                <div style={{
                  background: 'rgba(255,255,255,0.15)',
                  padding: '16px',
                  borderRadius: '8px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px' }}>🎯 주요 문항 유형</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>
                    {dominantType ? (
                      dominantType.question_type === 'calculation' ? '계산' :
                      dominantType.question_type === 'geometry' ? '도형' :
                      dominantType.question_type === 'application' ? '응용' :
                      dominantType.question_type === 'proof' ? '증명' :
                      dominantType.question_type === 'graph' ? '그래프' : '통계'
                    ) : '-'}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>
                    {dominantType ? `전체의 ${dominantType.percentage.toFixed(0)}% 차지` : '-'}
                  </div>
                </div>
              );
            })()}

            {/* 서술형 비중 (변별력 핵심) */}
            {(() => {
              const essayFormat = question_formats.find(qf => qf.question_format === 'essay');
              const essayPercentage = essayFormat ? essayFormat.percentage : 0;

              return (
                <div style={{
                  background: 'rgba(255,255,255,0.15)',
                  padding: '16px',
                  borderRadius: '8px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px' }}>✍️ 서술형 비중</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>
                    {essayPercentage.toFixed(0)}%
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>
                    {essayPercentage >= 40 ? '고변별력 구성' :
                     essayPercentage >= 25 ? '적정 비율' :
                     '객관식 중심'}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 인사이트 메시지 */}
          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '8px',
            borderLeft: '4px solid rgba(255,255,255,0.5)'
          }}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
              💡 AI 분석 인사이트
            </div>
            <div style={{ fontSize: '13px', lineHeight: '1.6', opacity: 0.95 }}>
              {(() => {
                const insights = [];

                // 교과서 연계성 분석
                if (textbooks.length >= 2) {
                  insights.push(`복수 교과서(${textbooks.length}종)의 내용이 통합 출제되어 교육과정 전반에 대한 이해가 필요합니다.`);
                }

                // 변별력 분석
                const essayFormat = question_formats.find(qf => qf.question_format === 'essay');
                if (essayFormat && essayFormat.percentage >= 40) {
                  insights.push(`서술형 비중이 ${essayFormat.percentage.toFixed(0)}%로 높아 논리적 서술 능력이 성적에 결정적 영향을 미칩니다.`);
                }

                // 문항 유형 편중 분석
                const dominantType = question_types.reduce((max, qt) =>
                  qt.count > max.count ? qt : max, question_types[0]);
                if (dominantType && dominantType.percentage >= 40) {
                  const typeLabel =
                    dominantType.question_type === 'calculation' ? '계산' :
                    dominantType.question_type === 'geometry' ? '도형' :
                    dominantType.question_type === 'application' ? '응용' :
                    dominantType.question_type === 'proof' ? '증명' :
                    dominantType.question_type === 'graph' ? '그래프' : '통계';
                  insights.push(`${typeLabel} 문항이 ${dominantType.percentage.toFixed(0)}%로 집중 출제되고 있습니다.`);
                }

                return insights.length > 0
                  ? insights.join(' ')
                  : '다양한 유형과 난이도가 균형있게 출제되고 있습니다.';
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* 단원별 출제 빈도 TOP 10 */}
      {topics.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>단원별 출제 빈도 TOP 10</h2>
          <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px' }}>순위</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px' }}>단원</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>문항 수</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>비율</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>평균 난이도</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>배점 합계</th>
                </tr>
              </thead>
              <tbody>
                {topics.slice(0, 10).map((topic, idx) => (
                  <tr key={idx} style={{ borderTop: '1px solid #e0e0e0' }}>
                    <td style={{ padding: '12px', fontSize: '14px', fontWeight: 'bold' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{topic.topic}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>
                      {topic.count}문항
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>
                      {topic.percentage.toFixed(1)}%
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>
                      {/* 4단계 시스템 */}
                      {topic.avg_difficulty === 'concept' && '개념'}
                      {topic.avg_difficulty === 'pattern' && '유형'}
                      {topic.avg_difficulty === 'reasoning' && '심화'}
                      {topic.avg_difficulty === 'creative' && '최상위'}
                      {/* 3단계 시스템 */}
                      {topic.avg_difficulty === 'high' && '상'}
                      {topic.avg_difficulty === 'medium' && '중'}
                      {topic.avg_difficulty === 'low' && '하'}
                      {!topic.avg_difficulty && '-'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>
                      {topic.total_points.toFixed(1)}점
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default TrendsPage;
