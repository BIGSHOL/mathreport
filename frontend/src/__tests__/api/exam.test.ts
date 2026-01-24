/**
 * Exam API Tests (Frontend)
 * FEAT-1: 시험지 관리
 *
 * 계약 파일 참조: contracts/exam.contract.ts
 * 타입 참조: frontend/src/types/exam.ts
 *
 * 현재 상태: GREEN (구현 완료)
 */

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { examService, type Exam } from '../../services/exam';

const API_URL = 'http://localhost:8000';

// MSW 서버 설정
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

const mockExam: Exam = {
  id: 'exam-123',
  user_id: 'user-123',
  title: '2024년 1학기 중간고사',
  subject: '수학',
  file_path: '/uploads/exam-123.pdf',
  file_type: 'pdf',
  status: 'pending',
  created_at: '2024-01-23T10:00:00Z',
  updated_at: '2024-01-23T10:00:00Z',
};

describe('Exam API', () => {
  describe('Upload', () => {
    it('[T0.5.3-EXAM-FE-001] should upload exam file successfully', async () => {
      server.use(
        http.post(`${API_URL}/api/v1/exams`, () => {
          return HttpResponse.json({
            data: mockExam,
          }, { status: 201 });
        })
      );

      localStorage.setItem('access_token', 'valid-token');

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const response = await examService.upload({
        file,
        title: '2024년 1학기 중간고사',
        subject: '수학',
      });

      expect(response.id).toBe(mockExam.id);
      expect(response.title).toBe(mockExam.title);
      expect(response.status).toBe('pending');
    });

    it('[T0.5.3-EXAM-FE-002] should handle file size error', async () => {
      server.use(
        http.post(`${API_URL}/api/v1/exams`, () => {
          return HttpResponse.json(
            { detail: { code: 'FILE_TOO_LARGE', message: '파일 크기가 10MB를 초과합니다.' } },
            { status: 413 }
          );
        })
      );

      localStorage.setItem('access_token', 'valid-token');

      const file = new File(['large content'], 'large.pdf', { type: 'application/pdf' });
      await expect(
        examService.upload({ file, title: 'Test', subject: '수학' })
      ).rejects.toThrow();
    });

    it('[T0.5.3-EXAM-FE-003] should handle invalid file type error', async () => {
      server.use(
        http.post(`${API_URL}/api/v1/exams`, () => {
          return HttpResponse.json(
            { detail: { code: 'INVALID_FILE_TYPE', message: '지원하지 않는 파일 형식입니다.' } },
            { status: 422 }
          );
        })
      );

      localStorage.setItem('access_token', 'valid-token');

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      await expect(
        examService.upload({ file, title: 'Test', subject: '수학' })
      ).rejects.toThrow();
    });
  });

  describe('Get List', () => {
    it('[T0.5.3-EXAM-FE-004] should get exam list successfully', async () => {
      const mockList = {
        data: [mockExam],
        meta: {
          total: 1,
          page: 1,
          page_size: 20,
          total_pages: 1,
        },
      };

      server.use(
        http.get(`${API_URL}/api/v1/exams`, () => {
          return HttpResponse.json(mockList);
        })
      );

      localStorage.setItem('access_token', 'valid-token');

      const response = await examService.getList(1, 20);

      expect(response.data).toHaveLength(1);
      expect(response.data[0].id).toBe(mockExam.id);
      expect(response.meta.total).toBe(1);
    });

    it('[T0.5.3-EXAM-FE-005] should handle empty list', async () => {
      server.use(
        http.get(`${API_URL}/api/v1/exams`, () => {
          return HttpResponse.json({
            data: [],
            meta: { total: 0, page: 1, page_size: 20, total_pages: 0 },
          });
        })
      );

      localStorage.setItem('access_token', 'valid-token');

      const response = await examService.getList();
      expect(response.data).toHaveLength(0);
    });
  });

  describe('Get Detail', () => {
    it('[T0.5.3-EXAM-FE-006] should get exam detail successfully', async () => {
      server.use(
        http.get(`${API_URL}/api/v1/exams/exam-123`, () => {
          return HttpResponse.json({ data: mockExam });
        })
      );

      localStorage.setItem('access_token', 'valid-token');

      const response = await examService.getDetail('exam-123');

      expect(response.id).toBe(mockExam.id);
      expect(response.title).toBe(mockExam.title);
    });

    it('[T0.5.3-EXAM-FE-007] should handle not found error', async () => {
      server.use(
        http.get(`${API_URL}/api/v1/exams/invalid-id`, () => {
          return HttpResponse.json(
            { detail: { code: 'EXAM_NOT_FOUND', message: '시험지를 찾을 수 없습니다.' } },
            { status: 404 }
          );
        })
      );

      localStorage.setItem('access_token', 'valid-token');

      await expect(examService.getDetail('invalid-id')).rejects.toThrow();
    });
  });

  describe('Delete', () => {
    it('[T0.5.3-EXAM-FE-008] should delete exam successfully', async () => {
      server.use(
        http.delete(`${API_URL}/api/v1/exams/exam-123`, () => {
          return HttpResponse.json(null, { status: 204 });
        })
      );

      localStorage.setItem('access_token', 'valid-token');

      // Should not throw
      await examService.delete('exam-123');
    });

    it('[T0.5.3-EXAM-FE-009] should handle delete not found error', async () => {
      server.use(
        http.delete(`${API_URL}/api/v1/exams/invalid-id`, () => {
          return HttpResponse.json(
            { detail: { code: 'EXAM_NOT_FOUND', message: '시험지를 찾을 수 없습니다.' } },
            { status: 404 }
          );
        })
      );

      localStorage.setItem('access_token', 'valid-token');

      await expect(examService.delete('invalid-id')).rejects.toThrow();
    });
  });
});

describe('Exam Error Handling', () => {
  it('[T0.5.3-EXAM-FE-010] should handle unauthorized access', async () => {
    server.use(
      http.get(`${API_URL}/api/v1/exams`, () => {
        return HttpResponse.json(
          { detail: 'Not authenticated' },
          { status: 401 }
        );
      })
    );

    await expect(examService.getList()).rejects.toThrow();
  });
});
