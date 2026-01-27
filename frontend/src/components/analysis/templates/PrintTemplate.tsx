/**
 * Print Template - 프린트용
 * 인쇄에 최적화된 흑백 레이아웃
 */
import { useMemo } from 'react';
import type { TemplateProps } from './types';
import { QUESTION_TYPE_COLORS } from '../../../styles/tokens';

// 유형 라벨 변환 헬퍼
const getTypeLabel = (type: string): string => {
  return QUESTION_TYPE_COLORS[type]?.label || type;
};

export function PrintTemplate({ result, examType }: TemplateProps) {
  const { summary, questions, total_questions } = result;
  const isStudentExam = examType === 'student';

  // 통계 계산
  const stats = useMemo(() => {
    const totalPoints = Math.round(
      questions.reduce((sum, q) => sum + (q.points || 0), 0) * 10
    ) / 10;

    let correctCount = 0;
    let wrongCount = 0;
    let earnedPoints = 0;

    if (isStudentExam) {
      questions.forEach((q) => {
        if (q.is_correct === true) correctCount++;
        else if (q.is_correct === false) wrongCount++;
        earnedPoints += q.earned_points || 0;
      });
      // 부동소수점 오류 방지를 위해 반올림
      earnedPoints = Math.round(earnedPoints * 10) / 10;
    }

    return { totalPoints, correctCount, wrongCount, earnedPoints };
  }, [questions, isStudentExam]);

  // 인쇄 실행
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print-container">
      {/* 인쇄 버튼 (화면에서만 표시) */}
      <div className="print:hidden mb-6 flex justify-end">
        <button
          onClick={handlePrint}
          className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          인쇄하기
        </button>
      </div>

      {/* 인쇄용 콘텐츠 */}
      <div className="bg-white p-8 print:p-0 print:shadow-none shadow-lg rounded-lg">
        {/* 헤더 */}
        <div className="border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-bold text-center">
            {isStudentExam ? '학습 분석 리포트' : '시험 분석 리포트'}
          </h1>
          <p className="text-center text-gray-600 mt-2">
            생성일: {new Date().toLocaleDateString('ko-KR')}
          </p>
        </div>

        {/* 요약 정보 */}
        <div className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">
            1. 요약
          </h2>
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b">
                <td className="py-2 font-medium w-1/3">총 문항 수</td>
                <td className="py-2">{total_questions}문항</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-medium">총 배점</td>
                <td className="py-2">{stats.totalPoints}점</td>
              </tr>
              {isStudentExam && (
                <>
                  <tr className="border-b">
                    <td className="py-2 font-medium">획득 점수</td>
                    <td className="py-2">{stats.earnedPoints}점</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-medium">정답 문항</td>
                    <td className="py-2">{stats.correctCount}문항</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-medium">오답 문항</td>
                    <td className="py-2">{stats.wrongCount}문항</td>
                  </tr>
                </>
              )}
              <tr className="border-b">
                <td className="py-2 font-medium">주요 유형</td>
                <td className="py-2">{getTypeLabel(summary.dominant_type)}</td>
              </tr>
              <tr>
                <td className="py-2 font-medium">평균 난이도</td>
                <td className="py-2">
                  {summary.average_difficulty === 'high' ? '상' :
                   summary.average_difficulty === 'medium' ? '중' : '하'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 난이도 분포 */}
        <div className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">
            2. 난이도 분포
          </h2>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left">난이도</th>
                <th className="border border-gray-300 px-4 py-2 text-center">문항 수</th>
                <th className="border border-gray-300 px-4 py-2 text-center">비율</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2">상</td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {summary.difficulty_distribution.high}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {Math.round((summary.difficulty_distribution.high / total_questions) * 100)}%
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2">중</td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {summary.difficulty_distribution.medium}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {Math.round((summary.difficulty_distribution.medium / total_questions) * 100)}%
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2">하</td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {summary.difficulty_distribution.low}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {Math.round((summary.difficulty_distribution.low / total_questions) * 100)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 문항별 상세 */}
        <div className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">
            3. 문항별 분석
          </h2>
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-2 w-12 whitespace-nowrap">번호</th>
                <th className="border border-gray-300 px-2 py-2 w-14 whitespace-nowrap">난이도</th>
                <th className="border border-gray-300 px-2 py-2 w-24 whitespace-nowrap">유형</th>
                <th className="border border-gray-300 px-2 py-2">단원</th>
                <th className="border border-gray-300 px-2 py-2 w-14 whitespace-nowrap">배점</th>
                {isStudentExam && (
                  <>
                    <th className="border border-gray-300 px-2 py-2 w-12 whitespace-nowrap">정오</th>
                    <th className="border border-gray-300 px-2 py-2 w-14 whitespace-nowrap">획득</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.id}>
                  <td className="border border-gray-300 px-2 py-1 text-center whitespace-nowrap">
                    {q.question_number}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-center whitespace-nowrap">
                    {q.difficulty === 'high' ? '상' :
                     q.difficulty === 'medium' ? '중' : '하'}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 whitespace-nowrap">
                    {getTypeLabel(q.question_type)}
                  </td>
                  <td className="border border-gray-300 px-2 py-1">
                    {q.topic || '-'}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-center whitespace-nowrap">
                    {q.points || '-'}
                  </td>
                  {isStudentExam && (
                    <>
                      <td className="border border-gray-300 px-2 py-1 text-center whitespace-nowrap">
                        {q.is_correct === true ? 'O' :
                         q.is_correct === false ? 'X' : '-'}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-center whitespace-nowrap">
                        {q.earned_points ?? '-'}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 유형별 분포 */}
        <div className="mb-8 print:break-before-page">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">
            4. 유형별 분포
          </h2>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left">유형</th>
                <th className="border border-gray-300 px-4 py-2 text-center">문항 수</th>
                <th className="border border-gray-300 px-4 py-2 text-center">비율</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(summary.type_distribution)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <tr key={type}>
                    <td className="border border-gray-300 px-4 py-2">{getTypeLabel(type)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{count}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {Math.round((count / total_questions) * 100)}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* 푸터 */}
        <div className="border-t border-gray-300 pt-4 mt-8 text-center text-gray-500 text-sm">
          <p>본 리포트는 AI 분석을 기반으로 생성되었습니다.</p>
          <p className="mt-1">수학 리포트 - 시험지 분석 서비스</p>
        </div>
      </div>

      {/* 인쇄용 스타일 */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            margin: 1.5cm;
          }
        }
      `}</style>
    </div>
  );
}
