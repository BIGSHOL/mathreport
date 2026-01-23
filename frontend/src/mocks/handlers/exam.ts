/**
 * MSW Handlers for Exam API
 * FEAT-1: 문항별 분석
 *
 * Mock Service Worker를 사용한 시험지 API 모킹
 * 계약 파일 참조: contracts/exam.contract.ts
 *
 * 현재 상태: RED (구현 없음)
 * 다음 단계: Phase 1에서 실제 API 구현과 함께 모킹 로직 작성
 */

import { http, HttpResponse } from 'msw';
import type { ExamBase, ExamStatus } from '../../types/exam';

const API_BASE_URL = '/api/v1';

/**
 * Mock Data Storage (임시)
 * 실제 구현에서는 MSW의 메모리 스토리지 또는 IndexedDB 사용
 */
let mockExams: ExamBase[] = [];

/**
 * 시험지 관련 MSW 핸들러 목록
 *
 * 구현 예정:
 * - POST /api/v1/exams
 * - GET /api/v1/exams
 * - GET /api/v1/exams/{id}
 * - DELETE /api/v1/exams/{id}
 */

export const examHandlers = [
  // POST /api/v1/exams - 시험지 업로드
  http.post(`${API_BASE_URL}/exams`, async () => {
    throw new Error(
      'Exam Upload API 모킹이 구현되지 않았습니다. Phase 1 (T1.2)에서 구현 예정'
    );

    // Expected implementation:
    // const formData = await request.formData();
    // const file = formData.get('file');
    // const title = formData.get('title');
    //
    // // 파일 타입 검증
    // if (file && file.type !== 'image/jpeg' && file.type !== 'image/png' && file.type !== 'application/pdf') {
    //   return HttpResponse.json(
    //     {
    //       error: {
    //         code: 'INVALID_FILE_TYPE',
    //         message: '지원하지 않는 파일 형식입니다.',
    //       },
    //     },
    //     { status: 422 }
    //   );
    // }
    //
    // // 시험지 생성
    // const newExam: ExamBase = {
    //   id: `exam-${Date.now()}`,
    //   user_id: 'user-mock-1',
    //   title: title as string,
    //   grade: formData.get('grade') as string,
    //   subject: (formData.get('subject') as string) || '수학',
    //   unit: formData.get('unit') as string,
    //   file_path: `/uploads/exams/${Date.now()}.jpg`,
    //   file_type: file.type.startsWith('image') ? 'image' : 'pdf',
    //   status: 'pending',
    //   created_at: new Date().toISOString(),
    //   updated_at: new Date().toISOString(),
    // };
    //
    // mockExams.push(newExam);
    //
    // return HttpResponse.json(
    //   {
    //     data: newExam,
    //     message: '시험지가 성공적으로 업로드되었습니다.',
    //   },
    //   { status: 201 }
    // );
  }),

  // GET /api/v1/exams - 시험지 목록 조회
  http.get(`${API_BASE_URL}/exams`, () => {
    throw new Error(
      'Exam List API 모킹이 구현되지 않았습니다. Phase 1 (T1.2)에서 구현 예정'
    );

    // Expected implementation:
    // const url = new URL(request.url);
    // const page = parseInt(url.searchParams.get('page') || '1');
    // const pageSize = parseInt(url.searchParams.get('page_size') || '20');
    // const status = url.searchParams.get('status') as ExamStatus;
    //
    // // 필터링
    // let filteredExams = mockExams;
    // if (status) {
    //   filteredExams = mockExams.filter((exam) => exam.status === status);
    // }
    //
    // // 페이지네이션
    // const total = filteredExams.length;
    // const start = (page - 1) * pageSize;
    // const end = start + pageSize;
    // const paginatedExams = filteredExams.slice(start, end);
    //
    // return HttpResponse.json({
    //   data: paginatedExams,
    //   meta: {
    //     total,
    //     page,
    //     page_size: pageSize,
    //     total_pages: Math.ceil(total / pageSize),
    //   },
    // });
  }),

  // GET /api/v1/exams/{id} - 시험지 상세 조회
  http.get(`${API_BASE_URL}/exams/:id`, () => {
    throw new Error(
      'Exam Detail API 모킹이 구현되지 않았습니다. Phase 1 (T1.2)에서 구현 예정'
    );

    // Expected implementation:
    // const { id } = params;
    // const exam = mockExams.find((e) => e.id === id);
    //
    // if (!exam) {
    //   return HttpResponse.json(
    //     {
    //       error: {
    //         code: 'NOT_FOUND',
    //         message: '시험지를 찾을 수 없습니다.',
    //       },
    //     },
    //     { status: 404 }
    //   );
    // }
    //
    // // 분석 완료 시 analysis 포함
    // const examDetail = {
    //   ...exam,
    //   analysis: exam.status === 'completed' ? {
    //     id: `analysis-${exam.id}`,
    //     total_questions: 20,
    //     analyzed_at: new Date().toISOString(),
    //     model_version: 'v1.0',
    //     difficulty_distribution: {
    //       high: 5,
    //       medium: 10,
    //       low: 5,
    //     },
    //     type_distribution: {
    //       calculation: 8,
    //       geometry: 6,
    //       application: 4,
    //       proof: 2,
    //     },
    //   } : undefined,
    // };
    //
    // return HttpResponse.json({
    //   data: examDetail,
    // });
  }),

  // DELETE /api/v1/exams/{id} - 시험지 삭제
  http.delete(`${API_BASE_URL}/exams/:id`, () => {
    throw new Error(
      'Exam Delete API 모킹이 구현되지 않았습니다. Phase 1 (T1.2)에서 구현 예정'
    );

    // Expected implementation:
    // const { id } = params;
    // const examIndex = mockExams.findIndex((e) => e.id === id);
    //
    // if (examIndex === -1) {
    //   return HttpResponse.json(
    //     {
    //       error: {
    //         code: 'NOT_FOUND',
    //         message: '시험지를 찾을 수 없습니다.',
    //       },
    //     },
    //     { status: 404 }
    //   );
    // }
    //
    // mockExams.splice(examIndex, 1);
    //
    // return HttpResponse.json({
    //   message: '시험지가 성공적으로 삭제되었습니다.',
    // });
  }),
];

/**
 * Mock 데이터 초기화 (테스트용)
 */
export const resetMockExams = () => {
  mockExams = [];
};
