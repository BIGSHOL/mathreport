/**
 * 출제 경향 분석 페이지
 */

import React, { useState } from 'react';
import useSWR from 'swr';
import trendsService from '../services/trends';
import { TrendsResponse, TrendsRequest } from '../types/trends';

const TrendsPage: React.FC = () => {
  const [filters, setFilters] = useState<TrendsRequest>({});

  // SWR로 트렌드 데이터 가져오기
  const { data, error, isLoading } = useSWR<TrendsResponse>(
    ['/api/v1/trends', filters],
    () => trendsService.getTrends(filters)
  );

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
