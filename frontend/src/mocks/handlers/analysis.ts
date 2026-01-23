/**
 * MSW Handlers for Analysis API
 * FEAT-1: 문항별 분석
 *
 * Mock Service Worker를 사용한 분석 API 모킹
 * 계약 파일 참조: contracts/analysis.contract.ts
 *
 * 현재 상태: RED (구현 없음)
 * 다음 단계: Phase 1에서 실제 API 구현과 함께 모킹 로직 작성
 */

import { http, HttpResponse } from 'msw';
import type {
  AnalysisResult,
  QuestionDifficulty,
  QuestionType,
} from '../../types/analysis';

const API_BASE_URL = '/api/v1';

/**
 * Mock Data Storage (임시)
 */
let mockAnalyses: AnalysisResult[] = [];

/**
 * 분석 관련 MSW 핸들러 목록
 *
 * 구현 예정:
 * - POST /api/v1/exams/{id}/analyze
 * - GET /api/v1/analysis/{id}
 */

export const analysisHandlers = [
  // POST /api/v1/exams/{id}/analyze - 분석 요청
  http.post(`${API_BASE_URL}/exams/:id/analyze`, async () => {
    throw new Error(
      'Analysis Request API 모킹이 구현되지 않았습니다. Phase 1 (T1.3)에서 구현 예정'
    );

    // Expected implementation:
    // const { id: examId } = params;
    // const body = await request.json();
    //
    // // 이미 분석된 시험지 체크
    // const existingAnalysis = mockAnalyses.find((a) => a.exam_id === examId);
    //
    // if (existingAnalysis && !body.force_reanalyze) {
    //   return HttpResponse.json({
    //     data: {
    //       analysis_id: existingAnalysis.id,
    //       status: 'completed',
    //       message: '이미 분석된 시험지입니다.',
    //     },
    //   });
    // }
    //
    // // 새로운 분석 시작
    // const analysisId = `analysis-${Date.now()}`;
    //
    // // 비동기 분석 시뮬레이션 (실제로는 백그라운드 작업)
    // setTimeout(() => {
    //   const mockQuestions = Array.from({ length: 20 }, (_, i) => ({
    //     id: `question-${analysisId}-${i + 1}`,
    //     question_number: i + 1,
    //     difficulty: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as QuestionDifficulty,
    //     question_type: ['calculation', 'geometry', 'application', 'proof'][
    //       Math.floor(Math.random() * 4)
    //     ] as QuestionType,
    //     points: 5,
    //     topic: '이차방정식',
    //     ai_comment: '기본 개념을 묻는 문제입니다.',
    //     created_at: new Date().toISOString(),
    //   }));
    //
    //   // 난이도/유형 분포 계산
    //   const difficultyDist = {
    //     high: mockQuestions.filter((q) => q.difficulty === 'high').length,
    //     medium: mockQuestions.filter((q) => q.difficulty === 'medium').length,
    //     low: mockQuestions.filter((q) => q.difficulty === 'low').length,
    //   };
    //
    //   const typeDist = {
    //     calculation: mockQuestions.filter((q) => q.question_type === 'calculation').length,
    //     geometry: mockQuestions.filter((q) => q.question_type === 'geometry').length,
    //     application: mockQuestions.filter((q) => q.question_type === 'application').length,
    //     proof: mockQuestions.filter((q) => q.question_type === 'proof').length,
    //   };
    //
    //   const newAnalysis: AnalysisResult = {
    //     id: analysisId,
    //     exam_id: examId as string,
    //     file_hash: 'sha256-mock-hash',
    //     total_questions: 20,
    //     model_version: 'v1.0',
    //     analyzed_at: new Date().toISOString(),
    //     created_at: new Date().toISOString(),
    //     summary: {
    //       difficulty_distribution: difficultyDist,
    //       type_distribution: typeDist,
    //       average_difficulty: 'medium',
    //       dominant_type: 'calculation',
    //     },
    //     questions: mockQuestions,
    //   };
    //
    //   mockAnalyses.push(newAnalysis);
    // }, 2000); // 2초 후 완료 시뮬레이션
    //
    // return HttpResponse.json(
    //   {
    //     data: {
    //       analysis_id: analysisId,
    //       status: 'analyzing',
    //       message: '분석이 시작되었습니다.',
    //     },
    //   },
    //   { status: 202 }
    // );
  }),

  // GET /api/v1/analysis/{id} - 분석 결과 조회
  http.get(`${API_BASE_URL}/analysis/:id`, () => {
    throw new Error(
      'Analysis Result API 모킹이 구현되지 않았습니다. Phase 1 (T1.3)에서 구현 예정'
    );

    // Expected implementation:
    // const { id } = params;
    // const analysis = mockAnalyses.find((a) => a.id === id);
    //
    // if (!analysis) {
    //   return HttpResponse.json(
    //     {
    //       error: {
    //         code: 'NOT_FOUND',
    //         message: '분석 결과를 찾을 수 없습니다.',
    //       },
    //     },
    //     { status: 404 }
    //   );
    // }
    //
    // return HttpResponse.json({
    //   data: analysis,
    //   meta: {
    //     cache_hit: false,
    //     analysis_duration: 12.5,
    //   },
    // });
  }),
];

/**
 * Mock 데이터 초기화 (테스트용)
 */
export const resetMockAnalyses = () => {
  mockAnalyses = [];
};
