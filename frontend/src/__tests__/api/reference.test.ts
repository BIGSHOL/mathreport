/**
 * Reference API Tests (Frontend)
 * FEAT: 문제 레퍼런스 자동 수집 시스템
 *
 * 테스트 시나리오:
 * 1. 레퍼런스 목록 조회
 * 2. 레퍼런스 승인/거부
 * 3. 레퍼런스 삭제
 * 4. 통계 조회
 * 5. 학년 목록 조회
 *
 * 현재 상태: RED (스켈레톤)
 */

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { referenceService, type QuestionReference, type ReferenceStats } from '../../services/reference';

const API_URL = 'http://localhost:8000';

// MSW 서버 설정
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

// Mock 데이터
const mockReference: QuestionReference = {
  id: 'ref-123',
  source_analysis_id: 'analysis-123',
  source_exam_id: 'exam-123',
  question_number: '3',
  topic: '이차방정식',
  difficulty: 'high',
  question_type: 'calculation',
  ai_comment: '복잡한 이차방정식 풀이',
  points: 5,
  confidence: 0.65,
  grade_level: '중3',
  collection_reason: 'low_confidence',
  review_status: 'pending',
  reviewed_at: null,
  review_note: null,
  created_at: '2024-01-23T10:00:00Z',
  updated_at: '2024-01-23T10:00:00Z',
};

const mockStats: ReferenceStats = {
  total: 50,
  pending: 30,
  approved: 15,
  rejected: 5,
  by_grade: {
    '중1': 10,
    '중2': 15,
    '중3': 25,
  },
  by_reason: {
    'low_confidence': 35,
    'high_difficulty': 15,
  },
  avg_confidence: 0.62,
  recent_count: 10,
};

describe('Reference API - List', () => {
  it('[T-REF-FE-001] should list references successfully', async () => {
    server.use(
      http.get(`${API_URL}/api/v1/references`, () => {
        return HttpResponse.json({
          data: [mockReference],
          total: 1,
          skip: 0,
          limit: 50,
        });
      })
    );

    localStorage.setItem('access_token', 'valid-token');

    const response = await referenceService.list();

    expect(response.data).toHaveLength(1);
    expect(response.data[0].id).toBe('ref-123');
    expect(response.total).toBe(1);
  });

  it('[T-REF-FE-002] should filter by review_status', async () => {
    server.use(
      http.get(`${API_URL}/api/v1/references`, ({ request }) => {
        const url = new URL(request.url);
        const status = url.searchParams.get('review_status');

        if (status === 'pending') {
          return HttpResponse.json({
            data: [mockReference],
            total: 1,
            skip: 0,
            limit: 50,
          });
        }
        return HttpResponse.json({
          data: [],
          total: 0,
          skip: 0,
          limit: 50,
        });
      })
    );

    localStorage.setItem('access_token', 'valid-token');

    const response = await referenceService.list({ review_status: 'pending' });

    expect(response.data).toHaveLength(1);
    expect(response.data[0].review_status).toBe('pending');
  });

  it('[T-REF-FE-003] should filter by grade_level', async () => {
    server.use(
      http.get(`${API_URL}/api/v1/references`, ({ request }) => {
        const url = new URL(request.url);
        const grade = url.searchParams.get('grade_level');

        if (grade === '중3') {
          return HttpResponse.json({
            data: [mockReference],
            total: 1,
            skip: 0,
            limit: 50,
          });
        }
        return HttpResponse.json({
          data: [],
          total: 0,
          skip: 0,
          limit: 50,
        });
      })
    );

    localStorage.setItem('access_token', 'valid-token');

    const response = await referenceService.list({ grade_level: '중3' });

    expect(response.data).toHaveLength(1);
    expect(response.data[0].grade_level).toBe('중3');
  });

  it('[T-REF-FE-004] should handle empty list', async () => {
    server.use(
      http.get(`${API_URL}/api/v1/references`, () => {
        return HttpResponse.json({
          data: [],
          total: 0,
          skip: 0,
          limit: 50,
        });
      })
    );

    localStorage.setItem('access_token', 'valid-token');

    const response = await referenceService.list();

    expect(response.data).toHaveLength(0);
    expect(response.total).toBe(0);
  });
});

describe('Reference API - Get Detail', () => {
  it('[T-REF-FE-005] should get reference detail', async () => {
    server.use(
      http.get(`${API_URL}/api/v1/references/ref-123`, () => {
        return HttpResponse.json({
          ...mockReference,
          original_analysis_snapshot: { question_number: 3 },
          exam_title: '중3 1학기 중간고사',
        });
      })
    );

    localStorage.setItem('access_token', 'valid-token');

    const response = await referenceService.get('ref-123');

    expect(response.id).toBe('ref-123');
    expect(response.topic).toBe('이차방정식');
  });

  it('[T-REF-FE-006] should handle not found', async () => {
    server.use(
      http.get(`${API_URL}/api/v1/references/invalid-id`, () => {
        return HttpResponse.json(
          { detail: '레퍼런스를 찾을 수 없습니다.' },
          { status: 404 }
        );
      })
    );

    localStorage.setItem('access_token', 'valid-token');

    await expect(referenceService.get('invalid-id')).rejects.toThrow();
  });
});

describe('Reference API - Approve', () => {
  it('[T-REF-FE-007] should approve reference successfully', async () => {
    server.use(
      http.patch(`${API_URL}/api/v1/references/ref-123/approve`, () => {
        return HttpResponse.json({
          ...mockReference,
          review_status: 'approved',
          reviewed_at: '2024-01-23T12:00:00Z',
        });
      })
    );

    localStorage.setItem('access_token', 'valid-token');

    const response = await referenceService.approve('ref-123');

    expect(response.review_status).toBe('approved');
    expect(response.reviewed_at).toBeTruthy();
  });

  it('[T-REF-FE-008] should approve with note', async () => {
    server.use(
      http.patch(`${API_URL}/api/v1/references/ref-123/approve`, async ({ request }) => {
        const body = await request.json() as { note?: string };
        return HttpResponse.json({
          ...mockReference,
          review_status: 'approved',
          review_note: body.note || null,
        });
      })
    );

    localStorage.setItem('access_token', 'valid-token');

    const response = await referenceService.approve('ref-123', '확인 완료');

    expect(response.review_status).toBe('approved');
  });
});

describe('Reference API - Reject', () => {
  it('[T-REF-FE-009] should reject reference successfully', async () => {
    server.use(
      http.patch(`${API_URL}/api/v1/references/ref-123/reject`, () => {
        return HttpResponse.json({
          ...mockReference,
          review_status: 'rejected',
          review_note: '정확도 낮음',
        });
      })
    );

    localStorage.setItem('access_token', 'valid-token');

    const response = await referenceService.reject('ref-123', '정확도 낮음');

    expect(response.review_status).toBe('rejected');
    expect(response.review_note).toBe('정확도 낮음');
  });

  it('[T-REF-FE-010] should handle reject without note error', async () => {
    server.use(
      http.patch(`${API_URL}/api/v1/references/ref-123/reject`, async ({ request }) => {
        const body = await request.json() as { note?: string };
        if (!body.note) {
          return HttpResponse.json(
            { detail: '거부 사유는 필수입니다.' },
            { status: 422 }
          );
        }
        return HttpResponse.json({
          ...mockReference,
          review_status: 'rejected',
        });
      })
    );

    localStorage.setItem('access_token', 'valid-token');

    // 빈 note로 호출 시 에러
    await expect(
      referenceService.reject('ref-123', '')
    ).rejects.toThrow();
  });
});

describe('Reference API - Delete', () => {
  it('[T-REF-FE-011] should delete reference successfully', async () => {
    server.use(
      http.delete(`${API_URL}/api/v1/references/ref-123`, () => {
        return new HttpResponse(null, { status: 204 });
      })
    );

    localStorage.setItem('access_token', 'valid-token');

    // Should not throw
    await expect(referenceService.delete('ref-123')).resolves.not.toThrow();
  });

  it('[T-REF-FE-012] should handle delete not found', async () => {
    server.use(
      http.delete(`${API_URL}/api/v1/references/invalid-id`, () => {
        return HttpResponse.json(
          { detail: '레퍼런스를 찾을 수 없습니다.' },
          { status: 404 }
        );
      })
    );

    localStorage.setItem('access_token', 'valid-token');

    await expect(referenceService.delete('invalid-id')).rejects.toThrow();
  });
});

describe('Reference API - Stats', () => {
  it('[T-REF-FE-013] should get stats successfully', async () => {
    server.use(
      http.get(`${API_URL}/api/v1/references/stats`, () => {
        return HttpResponse.json(mockStats);
      })
    );

    localStorage.setItem('access_token', 'valid-token');

    const response = await referenceService.getStats();

    expect(response.total).toBe(50);
    expect(response.pending).toBe(30);
    expect(response.approved).toBe(15);
    expect(response.rejected).toBe(5);
    expect(response.by_grade['중3']).toBe(25);
  });

  it('[T-REF-FE-014] should handle empty stats', async () => {
    server.use(
      http.get(`${API_URL}/api/v1/references/stats`, () => {
        return HttpResponse.json({
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          by_grade: {},
          by_reason: {},
          avg_confidence: null,
          recent_count: 0,
        });
      })
    );

    localStorage.setItem('access_token', 'valid-token');

    const response = await referenceService.getStats();

    expect(response.total).toBe(0);
  });
});

describe('Reference API - Grades List', () => {
  it('[T-REF-FE-015] should get grades list', async () => {
    server.use(
      http.get(`${API_URL}/api/v1/references/grades/list`, () => {
        return HttpResponse.json(['중1', '중2', '중3', '고1']);
      })
    );

    localStorage.setItem('access_token', 'valid-token');

    const response = await referenceService.getGrades();

    expect(response).toContain('중1');
    expect(response).toContain('중3');
  });

  it('[T-REF-FE-016] should handle empty grades', async () => {
    server.use(
      http.get(`${API_URL}/api/v1/references/grades/list`, () => {
        return HttpResponse.json([]);
      })
    );

    localStorage.setItem('access_token', 'valid-token');

    const response = await referenceService.getGrades();

    expect(response).toHaveLength(0);
  });
});

describe('Reference API - Error Handling', () => {
  it('[T-REF-FE-017] should handle network error', async () => {
    server.use(
      http.get(`${API_URL}/api/v1/references`, () => {
        return HttpResponse.error();
      })
    );

    localStorage.setItem('access_token', 'valid-token');

    await expect(referenceService.list()).rejects.toThrow();
  });

  it('[T-REF-FE-018] should handle unauthorized', async () => {
    server.use(
      http.get(`${API_URL}/api/v1/references`, () => {
        return HttpResponse.json(
          { detail: '인증이 필요합니다.' },
          { status: 401 }
        );
      })
    );

    // No token
    localStorage.removeItem('access_token');

    await expect(referenceService.list()).rejects.toThrow();
  });

  it('[T-REF-FE-019] should handle server error', async () => {
    server.use(
      http.get(`${API_URL}/api/v1/references`, () => {
        return HttpResponse.json(
          { detail: '서버 오류가 발생했습니다.' },
          { status: 500 }
        );
      })
    );

    localStorage.setItem('access_token', 'valid-token');

    await expect(referenceService.list()).rejects.toThrow();
  });
});
