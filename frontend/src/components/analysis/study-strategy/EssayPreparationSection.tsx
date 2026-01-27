/**
 * EssayPreparationSection - 서술형 대비 전략 컴포넌트
 *
 * StudyStrategyTab에서 분리된 서술형 대비 전략 섹션
 * 서술형 문항 요약, 감점 방지 체크리스트, 심화 가이드를 제공합니다.
 */
import { memo, useState } from 'react';
import type { QuestionAnalysis } from '../../../services/analysis';
import { DIFFICULTY_COLORS } from '../../../styles/tokens';
import {
  ESSAY_CHECKLIST,
  ESSAY_ADVANCED_GUIDE,
  type EssayCheckItem,
  type EssayAdvancedGuide,
} from '../../../data/curriculumStrategies';
import { DIFFICULTY_LABELS } from './constants';

export interface EssayPreparationSectionProps {
  essayQuestions: QuestionAnalysis[];
}

export const EssayPreparationSection = memo(function EssayPreparationSection({
  essayQuestions,
}: EssayPreparationSectionProps) {
  const [showEssayAdvanced, setShowEssayAdvanced] = useState(false);
  const [selectedEssayGuide, setSelectedEssayGuide] = useState<string | null>(null);

  // 서술형 문항이 없으면 렌더링하지 않음
  if (essayQuestions.length === 0) {
    return null;
  }

  const totalPoints = essayQuestions.reduce((sum, q) => sum + (q.points || 0), 0);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">서술형 대비 전략</h3>
            <p className="text-xs text-gray-600">
              {essayQuestions.length}문항, 총 {totalPoints}점
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 서술형 문항 요약 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {essayQuestions.slice(0, 4).map((q) => {
            const diffColor = DIFFICULTY_COLORS[q.difficulty as keyof typeof DIFFICULTY_COLORS] || DIFFICULTY_COLORS.pattern;
            return (
              <div
                key={q.id || q.question_number}
                className="p-3 bg-amber-50 rounded-lg border border-amber-100"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900">
                    {q.question_number}번
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{ backgroundColor: `${diffColor.bg}20`, color: diffColor.bg }}
                    >
                      {DIFFICULTY_LABELS[q.difficulty] || q.difficulty}
                    </span>
                    <span className="text-sm font-medium text-amber-700">
                      {q.points}점
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 truncate" title={q.topic || ''}>
                  {q.topic?.split(' > ').pop() || '기타'}
                </p>
              </div>
            );
          })}
        </div>

        {/* 서술형 감점 방지 체크리스트 */}
        <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-amber-900 mb-3">서술형 감점 방지 체크리스트</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ESSAY_CHECKLIST.map((item: EssayCheckItem) => (
              <div key={item.category} className="bg-white bg-opacity-60 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-amber-800 mb-2">{item.category}</h5>
                <ul className="space-y-1">
                  {item.checkPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
                      <span className="text-amber-500 mt-0.5">☐</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* 주요 감점 사례 */}
        <div className="bg-red-50 rounded-lg p-4 border border-red-100">
          <h4 className="text-sm font-semibold text-red-800 mb-2">주요 감점 사례</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="bg-white rounded p-2">
              <span className="text-red-600 font-medium">논리적 비약</span>
              <p className="text-gray-600 mt-0.5">중간 단계 생략</p>
            </div>
            <div className="bg-white rounded p-2">
              <span className="text-red-600 font-medium">형식 오류</span>
              <p className="text-gray-600 mt-0.5">등호 연속 사용</p>
            </div>
            <div className="bg-white rounded p-2">
              <span className="text-red-600 font-medium">단위 누락</span>
              <p className="text-gray-600 mt-0.5">최종답 단위 미표기</p>
            </div>
            <div className="bg-white rounded p-2">
              <span className="text-red-600 font-medium">부호 실수</span>
              <p className="text-gray-600 mt-0.5">음수 계산 오류</p>
            </div>
          </div>
        </div>

        {/* 서술형 심화 가이드 토글 */}
        <button
          onClick={() => setShowEssayAdvanced(!showEssayAdvanced)}
          className="w-full p-3 bg-gradient-to-r from-purple-100 to-violet-100 rounded-lg border border-purple-200 flex items-center justify-between hover:from-purple-200 hover:to-violet-200 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium text-purple-800">서술형 심화 가이드 보기</span>
          </div>
          <svg
            className={`w-5 h-5 text-purple-600 transition-transform ${showEssayAdvanced ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showEssayAdvanced && (
          <div className="space-y-4">
            {/* 카테고리 탭 */}
            <div className="flex flex-wrap gap-2">
              {ESSAY_ADVANCED_GUIDE.map((guide: EssayAdvancedGuide) => (
                <button
                  key={guide.category}
                  onClick={() => setSelectedEssayGuide(
                    selectedEssayGuide === guide.category ? null : guide.category
                  )}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedEssayGuide === guide.category
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    }`}
                >
                  {guide.title}
                </button>
              ))}
            </div>

            {/* 선택된 가이드 내용 */}
            {selectedEssayGuide && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                {ESSAY_ADVANCED_GUIDE.filter(g => g.category === selectedEssayGuide).map((guide: EssayAdvancedGuide) => (
                  <div key={guide.category}>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm font-semibold text-purple-900">{guide.title}</h4>
                    </div>
                    <p className="text-xs text-purple-700 mb-3">{guide.description}</p>

                    {/* 템플릿 목록 */}
                    <div className="space-y-2 mb-3">
                      {guide.templates.map((template, i) => (
                        <div key={i} className="bg-white rounded p-3 border border-purple-100">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-200 text-purple-800 rounded font-medium">
                              {template.situation}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-gray-800 mb-1">
                            {template.template}
                          </div>
                          <div className="text-xs text-gray-600 italic">
                            예: {template.example}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 채점 팁 */}
                    <div className="bg-green-50 rounded p-3 border border-green-100">
                      <h5 className="text-xs font-semibold text-green-800 mb-1.5">채점 포인트</h5>
                      <ul className="space-y-1">
                        {guide.scoringTips.map((tip, i) => (
                          <li key={i} className="text-[10px] text-green-700 flex items-start gap-1">
                            <span className="text-green-500">★</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
