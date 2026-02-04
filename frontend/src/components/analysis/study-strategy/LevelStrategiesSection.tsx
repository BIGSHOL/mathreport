/**
 * Level Strategies Section - 수준별 학습 전략
 *
 * 하위권/중위권/상위권별 맞춤 학습 전략 및 교재 추천
 */
import { memo, useState } from 'react';
import type { LevelRecommendation } from '../../../data/curriculumStrategies';
import {
  LEVEL_STRATEGIES,
  getBooksByLevel,
  getSmartBookRecommendations,
  getPersonalizedBookRecommendations,
  BOOK_SELECTION_GUIDE,
  BOOK_CAUTIONS,
} from '../../../data/curriculumStrategies';
import type { TopicStrategies } from '../../../data/topicLevelStrategies';

export interface LevelStrategiesSectionProps {
  topicLevelStrategies: TopicStrategies[];
  levelEncouragements: {
    '하위권': string;
    '중위권': string;
    '상위권': string;
  };
  autoLevelRecommendation: LevelRecommendation | null;
  /** 섹션 펼침 상태 */
  isSectionExpanded?: boolean;
  /** 섹션 토글 핸들러 */
  onToggleSection?: () => void;
}

export const LevelStrategiesSection = memo(function LevelStrategiesSection({
  topicLevelStrategies,
  levelEncouragements,
  autoLevelRecommendation,
  isSectionExpanded = true,
  onToggleSection,
}: LevelStrategiesSectionProps) {
  const [selectedBookLevel, setSelectedBookLevel] = useState<'하위권' | '중위권' | '상위권' | null>(null);
  const [showBookDetails, setShowBookDetails] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* 헤더 - 클릭 시 섹션 접기/펼치기 */}
      <button
        onClick={onToggleSection}
        className="w-full px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 transition-colors"
        disabled={!onToggleSection}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-base font-semibold text-gray-900">수준별 학습 전략</h3>
              <p className="text-xs text-gray-600">현재 수준에 맞는 효과적인 학습법</p>
            </div>
          </div>
          {onToggleSection && (
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isSectionExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </button>

      {isSectionExpanded && (
        <div className="p-4 space-y-4">
          {/* 자동 수준 추천 배너 */}
          {autoLevelRecommendation && (
            <div className={`rounded-lg p-4 border-2 ${autoLevelRecommendation.level === '하위권' ? 'bg-blue-50 border-blue-300' :
              autoLevelRecommendation.level === '중위권' ? 'bg-yellow-50 border-yellow-300' :
                'bg-red-50 border-red-300'
              }`}>
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${autoLevelRecommendation.level === '하위권' ? 'bg-blue-500' :
                  autoLevelRecommendation.level === '중위권' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}>
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`text-sm font-bold ${autoLevelRecommendation.level === '하위권' ? 'text-blue-900' :
                      autoLevelRecommendation.level === '중위권' ? 'text-yellow-900' :
                        'text-red-900'
                      }`}>
                      분석 결과 기반 추천: {autoLevelRecommendation.level} 교재
                    </h4>
                    <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
                      신뢰도 {autoLevelRecommendation.confidence}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 mb-2">
                    {autoLevelRecommendation.reason}
                  </p>
                  {autoLevelRecommendation.weakPoints.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {autoLevelRecommendation.weakPoints.map((point: string, i: number) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 bg-white rounded-full text-gray-600 border border-gray-200">
                          {point}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedBookLevel(autoLevelRecommendation.level)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded ${autoLevelRecommendation.level === '하위권' ? 'bg-blue-500 hover:bg-blue-600' :
                      autoLevelRecommendation.level === '중위권' ? 'bg-yellow-500 hover:bg-yellow-600' :
                        'bg-red-500 hover:bg-red-600'
                      } text-white transition-colors`}
                  >
                    추천 교재 보기
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 수준별 카드 - 단원별 맞춤 전략 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {LEVEL_STRATEGIES.map((level) => {
              const levelKey = level.level as '하위권' | '중위권' | '상위권';
              const isSelected = selectedBookLevel === levelKey;
              const encouragement = levelEncouragements[levelKey];

              // 해당 수준의 단원별 전략 가져오기
              const topicGuides = topicLevelStrategies.map(ts => {
                const guide = levelKey === '하위권' ? ts.lower :
                  levelKey === '중위권' ? ts.middle :
                    ts.upper;
                return { topic: ts.topic, grade: ts.grade, guide };
              });

              // 전략 통합 (최대 3개)
              const combinedStrategies = topicGuides.length > 0
                ? topicGuides.flatMap(tg => tg.guide.strategies.slice(0, 2)).slice(0, 3)
                : level.coreStrategies.slice(0, 3);

              // 학습량 평균
              const studyAmount = topicGuides.length > 0
                ? topicGuides[0].guide.studyAmount
                : level.studyHours;

              // 교재 통합
              const books = topicGuides.length > 0
                ? topicGuides[0].guide.books
                : level.recommendedBooks.slice(0, 2).join(', ');

              return (
                <div
                  key={level.level}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${level.level === '하위권'
                    ? isSelected ? 'border-blue-400 bg-blue-100 ring-2 ring-blue-300' : 'border-blue-200 bg-blue-50 hover:border-blue-300'
                    : level.level === '중위권'
                      ? isSelected ? 'border-yellow-400 bg-yellow-100 ring-2 ring-yellow-300' : 'border-yellow-200 bg-yellow-50 hover:border-yellow-300'
                      : isSelected ? 'border-red-400 bg-red-100 ring-2 ring-red-300' : 'border-red-200 bg-red-50 hover:border-red-300'
                    }`}
                  onClick={() => setSelectedBookLevel(isSelected ? null : levelKey)}
                >
                  <div className="flex items-center justify-between mb-2 gap-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-lg font-bold whitespace-nowrap flex-shrink-0 ${level.level === '하위권'
                        ? 'text-blue-700'
                        : level.level === '중위권'
                          ? 'text-yellow-700'
                          : 'text-red-700'
                        }`}>
                        {level.level}
                      </span>
                      <span className="text-[10px] bg-white px-1.5 py-0.5 rounded text-gray-600 truncate">
                        {level.targetGrade}
                      </span>
                      {topicGuides.length > 0 && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium whitespace-nowrap flex-shrink-0">
                          시험 맞춤
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                      {isSelected ? '접기' : '상세보기'}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-gray-700 mb-3">
                    {level.description}
                  </p>

                  {/* 단원별 맞춤 전략 표시 */}
                  {topicGuides.length > 0 ? (
                    <>
                      <div className="mb-2 text-[11px] font-semibold text-gray-600">
                        📚 {topicGuides.length}개 취약 단원 맞춤 전략:
                      </div>
                      <div className="space-y-3 mb-3">
                        {topicGuides.slice(0, 2).map((tg, idx) => (
                          <div key={idx} className="bg-white bg-opacity-60 rounded p-2">
                            <div className="text-[11px] font-bold text-gray-800 mb-1">
                              {tg.topic}
                            </div>
                            <div className="text-[11px] font-medium text-emerald-700 mb-1">
                              {tg.guide.title}
                            </div>
                            <div className="space-y-0.5">
                              {tg.guide.strategies.slice(0, 2).map((strategy: string, i: number) => (
                                <div key={i} className="flex items-start gap-1.5 text-[10px] text-gray-600">
                                  <span className="text-emerald-500 mt-0.5">▸</span>
                                  <span>{strategy}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        {topicGuides.length > 2 && (
                          <div className="text-[10px] text-gray-500 text-center">
                            외 {topicGuides.length - 2}개 단원 전략 (아래 상세 참조)
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1.5 mb-3">
                      {combinedStrategies.map((strategy, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                          <span className="text-emerald-500 mt-0.5">▸</span>
                          <span>{strategy}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-[10px] text-gray-500 mb-1">
                      <span className="font-medium">학습량:</span> {studyAmount}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      <span className="font-medium">추천 교재:</span> {books}
                    </p>
                  </div>

                  {/* 격려 멘트 */}
                  <div className={`mt-2 p-2 rounded text-[10px] italic ${level.level === '하위권' ? 'bg-blue-100 text-blue-700' :
                    level.level === '중위권' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                    "{topicGuides.length > 0 ? topicGuides[0].guide.encouragement : encouragement}"
                  </div>
                </div>
              );
            })}
          </div>

          {/* 선택된 수준의 추천 문제집 상세 */}
          {selectedBookLevel && (
            <div className={`rounded-lg border-2 p-4 ${selectedBookLevel === '하위권' ? 'border-blue-300 bg-blue-50' :
              selectedBookLevel === '중위권' ? 'border-yellow-300 bg-yellow-50' :
                'border-red-300 bg-red-50'
              }`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className={`text-sm font-semibold ${selectedBookLevel === '하위권' ? 'text-blue-800' :
                  selectedBookLevel === '중위권' ? 'text-yellow-800' :
                    'text-red-800'
                  }`}>
                  {selectedBookLevel} 추천 문제집
                </h4>
                <button
                  onClick={() => setShowBookDetails(!showBookDetails)}
                  className={`text-xs px-2 py-1 rounded ${selectedBookLevel === '하위권' ? 'bg-blue-200 text-blue-700 hover:bg-blue-300' :
                    selectedBookLevel === '중위권' ? 'bg-yellow-200 text-yellow-700 hover:bg-yellow-300' :
                      'bg-red-200 text-red-700 hover:bg-red-300'
                    }`}
                >
                  {showBookDetails ? '간략히' : '전체 보기'}
                </button>
              </div>

              {/* 교재 선택 가이드 */}
              <div className="bg-white bg-opacity-70 rounded p-3 mb-3">
                <p className="text-xs text-gray-700">
                  <span className="font-semibold">구성: </span>
                  {BOOK_SELECTION_GUIDE[selectedBookLevel].structure}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  <span className="font-semibold">원칙: </span>
                  {BOOK_SELECTION_GUIDE[selectedBookLevel].principle}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  <span className="font-semibold">추천 예시: </span>
                  {BOOK_SELECTION_GUIDE[selectedBookLevel].example}
                </p>
              </div>

              {/* 스마트 추천 문제집 (3권) */}
              {(() => {
                // 자동 분석 결과가 있고 같은 레벨이면 취약점 기반 추천 사용
                const usePersonalized = autoLevelRecommendation && autoLevelRecommendation.level === selectedBookLevel;
                const smartBooks = usePersonalized
                  ? getPersonalizedBookRecommendations(selectedBookLevel, autoLevelRecommendation.recommendedBookTypes, 3)
                  : getSmartBookRecommendations(selectedBookLevel, 3);

                if (smartBooks.length === 0) return null;
                return (
                  <div className="mb-3">
                    <h5 className="text-xs font-semibold text-gray-700 mb-2">
                      맞춤 추천 문제집
                      <span className="ml-1 text-[10px] font-normal text-gray-500">
                        {usePersonalized ? '(취약점 맞춤)' : '(개념 → 유형 순)'}
                      </span>
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {smartBooks.map((book, i) => (
                        <div key={i} className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-sm transition-shadow">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-gray-800">{book.name}</span>
                            <span className="text-yellow-500 text-[10px]">
                              {'★'.repeat(book.difficulty)}{'☆'.repeat(5 - book.difficulty)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] text-gray-500">{book.publisher}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${book.type.includes('개념') ? 'bg-blue-100 text-blue-700' :
                              book.type.includes('유형') ? 'bg-green-100 text-green-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                              {book.type}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-600">{book.features}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* 상세 문제집 목록 */}
              {showBookDetails && (() => {
                const levelBooks = getBooksByLevel(selectedBookLevel);
                if (!levelBooks) return null;
                return (
                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold text-gray-700">전체 문제집 목록 ({levelBooks.books.length}권)</h5>
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-[10px]">
                        <thead className="bg-white bg-opacity-80 sticky top-0">
                          <tr>
                            <th className="text-left p-1.5 font-medium text-gray-600">교재명</th>
                            <th className="text-left p-1.5 font-medium text-gray-600">출판사</th>
                            <th className="text-center p-1.5 font-medium text-gray-600">난이도</th>
                            <th className="text-left p-1.5 font-medium text-gray-600">특징</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {levelBooks.books.slice(0, 15).map((book, i) => (
                            <tr key={i} className="bg-white bg-opacity-50 hover:bg-opacity-80">
                              <td className="p-1.5 font-medium text-gray-800">{book.name}</td>
                              <td className="p-1.5 text-gray-600">{book.publisher}</td>
                              <td className="p-1.5 text-center">
                                <span className="text-yellow-500">{'★'.repeat(book.difficulty)}{'☆'.repeat(5 - book.difficulty)}</span>
                              </td>
                              <td className="p-1.5 text-gray-600">{book.features}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* 주의사항 */}
              <div className="mt-3 p-2 bg-amber-50 rounded border border-amber-200">
                <h5 className="text-[10px] font-semibold text-amber-800 mb-1">교재 선택 주의사항</h5>
                <ul className="space-y-0.5">
                  {BOOK_CAUTIONS.map((caution, i) => (
                    <li key={i} className="text-[10px] text-amber-700 flex items-start gap-1">
                      <span>⚠</span>
                      <span>{caution}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
