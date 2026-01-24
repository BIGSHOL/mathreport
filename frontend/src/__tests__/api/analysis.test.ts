/**
 * Analysis API Tests (Frontend)
 * FEAT-1: 문항별 분석
 *
 * 계약 파일 참조: contracts/analysis.contract.ts
 * 타입 참조: frontend/src/types/analysis.ts
 *
 * 현재 상태: GREEN (구현 완료)
 */

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { analysisService, type AnalysisResult } from '../../services/analysis';

const API_URL = 'http://localhost:8000';

// MSW 서버 설정
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

const mockAnalysisResult: AnalysisResult = {
  id: 'analysis-123',
  exam_id: 'exam-123',
  total_questions: 10,
  model_version: 'gpt-4',
  analyzed_at: '2024-01-23T10:00:00Z',
  summary: {
    difficulty_distribution: { high: 3, medium: 4, low: 3 },
    type_distribution: { calculation: 5, concept: 3, application: 2 },
    average_difficulty: 'medium',
    dominant_type: 'calculation',
  },
  questions: [
    {
      id: 'q-1',
      question_number: 1,
      difficulty: 'medium',
      question_type: 'calculation',
      points: 5,
      topic: '이차방정식',
      ai_comment: '기본적인 이차방정식 풀이 문제입니다.',
    },
    {
      id: 'q-2',
      question_number: 2,
      difficulty: 'high',
      question_type: 'application',
      points: 10,
      topic: '함수의 활용',
      ai_comment: '실생활 응용 문제로 난이도가 높습니다.',
    },
  ],
};

describe('Analysis API', () => {
  describe('Request Analysis', () => {
    it('[T0.5.3-ANALYSIS-FE-001] should request analysis successfully', async () => {
      server.use(
        http.post(`${API_URL}/api/v1/exams/exam-123/analyze`, () => {
          return HttpResponse.json({
            data: {
              analysis_id: 'analysis-123',
              status: 'completed',
              message: '분석이 완료되었습니다.',
            },
          }, { status: 202 });
        })
      );

      localStorage.setItem('access_token', 'valid-token');

      const response = await analysisService.requestAnalysis('exam-123');

      expect(response.analysis_id).toBe('analysis-123');
      expect(response.status).toBe('completed');
    });

    it('[T0.5.3-ANALYSIS-FE-002] should handle already analyzed exam', async () => {
      server.use(
        http.post(`${API_URL}/api/v1/exams/exam-123/analyze`, () => {
          return HttpResponse.json({
            data: {
              analysis_id: 'existing-analysis',
              status: 'completed',
              message: '기존 분석 결과를 반환합니다.',
            },
          }, { status: 202 });
        })
      );

      localStorage.setItem('access_token', 'valid-token');

      const response = await analysisService.requestAnalysis('exam-123', false);

      expect(response.analysis_id).toBe('existing-analysis');
    });

    it('[T0.5.3-ANALYSIS-FE-003] should force reanalyze', async () => {
      server.use(
        http.post(`${API_URL}/api/v1/exams/exam-123/analyze`, async ({ request }) => {
          const body = await request.json() as { force_reanalyze: boolean };
          return HttpResponse.json({
            data: {
              analysis_id: body.force_reanalyze ? 'new-analysis' : 'old-analysis',
              status: 'completed',
              message: '분석이 완료되었습니다.',
            },
          }, { status: 202 });
        })
      );

      localStorage.setItem('access_token', 'valid-token');

      const response = await analysisService.requestAnalysis('exam-123', true);

      expect(response.analysis_id).toBe('new-analysis');
    });

    it('[T0.5.3-ANALYSIS-FE-004] should handle exam not found', async () => {
      server.use(
        http.post(`${API_URL}/api/v1/exams/invalid-id/analyze`, () => {
          return HttpResponse.json(
            { detail: { code: 'EXAM_NOT_FOUND', message: '시험지를 찾을 수 없습니다.' } },
            { status: 404 }
          );
        })
      );

      localStorage.setItem('access_token', 'valid-token');

      await expect(
        analysisService.requestAnalysis('invalid-id')
      ).rejects.toThrow();
    });
  });

  describe('Get Analysis Result', () => {
    it('[T0.5.3-ANALYSIS-FE-005] should get analysis result successfully', async () => {
      server.use(
        http.get(`${API_URL}/api/v1/analysis/analysis-123`, () => {
          return HttpResponse.json({
            data: mockAnalysisResult,
            meta: { cache_hit: true },
          });
        })
      );

      localStorage.setItem('access_token', 'valid-token');

      const response = await analysisService.getResult('analysis-123');

      expect(response.id).toBe(mockAnalysisResult.id);
      expect(response.total_questions).toBe(10);
      expect(response.summary.difficulty_distribution.high).toBe(3);
      expect(response.questions).toHaveLength(2);
    });

    it('[T0.5.3-ANALYSIS-FE-006] should verify difficulty distribution totals', async () => {
      server.use(
        http.get(`${API_URL}/api/v1/analysis/analysis-123`, () => {
          return HttpResponse.json({
            data: mockAnalysisResult,
            meta: { cache_hit: true },
          });
        })
      );

      localStorage.setItem('access_token', 'valid-token');

      const response = await analysisService.getResult('analysis-123');

      const { difficulty_distribution } = response.summary;
      const totalDifficulty =
        difficulty_distribution.high +
        difficulty_distribution.medium +
        difficulty_distribution.low;

      expect(totalDifficulty).toBe(response.total_questions);
    });

    it('[T0.5.3-ANALYSIS-FE-007] should handle analysis not found', async () => {
      server.use(
        http.get(`${API_URL}/api/v1/analysis/invalid-id`, () => {
          return HttpResponse.json(
            { detail: { code: 'ANALYSIS_NOT_FOUND', message: '분석 결과를 찾을 수 없습니다.' } },
            { status: 404 }
          );
        })
      );

      localStorage.setItem('access_token', 'valid-token');

      await expect(
        analysisService.getResult('invalid-id')
      ).rejects.toThrow();
    });

    it('[T0.5.3-ANALYSIS-FE-008] should handle forbidden access', async () => {
      server.use(
        http.get(`${API_URL}/api/v1/analysis/other-user-analysis`, () => {
          return HttpResponse.json(
            { detail: { code: 'FORBIDDEN', message: '접근 권한이 없습니다.' } },
            { status: 403 }
          );
        })
      );

      localStorage.setItem('access_token', 'valid-token');

      await expect(
        analysisService.getResult('other-user-analysis')
      ).rejects.toThrow();
    });
  });
});

describe('Analysis Error Handling', () => {
  it('[T0.5.3-ANALYSIS-FE-009] should handle network errors', async () => {
    server.use(
      http.post(`${API_URL}/api/v1/exams/exam-123/analyze`, () => {
        return HttpResponse.error();
      })
    );

    localStorage.setItem('access_token', 'valid-token');

    await expect(
      analysisService.requestAnalysis('exam-123')
    ).rejects.toThrow();
  });

  it('[T0.5.3-ANALYSIS-FE-010] should handle server errors', async () => {
    server.use(
      http.post(`${API_URL}/api/v1/exams/exam-123/analyze`, () => {
        return HttpResponse.json(
          { detail: 'AI 분석 서비스에 오류가 발생했습니다.' },
          { status: 500 }
        );
      })
    );

    localStorage.setItem('access_token', 'valid-token');

    await expect(
      analysisService.requestAnalysis('exam-123')
    ).rejects.toThrow();
  });
});
