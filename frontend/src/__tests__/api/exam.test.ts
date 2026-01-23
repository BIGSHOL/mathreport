import { describe, it } from 'vitest';

describe('Exam API', () => {
    describe('Upload', () => {
        it('[T0.5.3-EXAM-FE-001] should upload an exam file successfully', async () => {
            // Arrange
            const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
            const formData = {
                title: '2024년 1학기 중간고사',
                grade: '중2',
                subject: '수학',
            };

            // Act
            throw new Error('Exam Upload API 모킹이 구현되지 않았습니다. Phase 1 (T1.2)에서 구현 예정');

            // Assert (구현 후)
            // const response = await examApi.upload(file, formData);
            // expect(response.id).toBeDefined();
            // expect(response.status).toBe('pending');
        });
    });

    describe('List', () => {
        it('[T0.5.3-EXAM-FE-002] should fetch exam list', async () => {
            // Act
            throw new Error('Exam List API 모킹이 구현되지 않았습니다. Phase 1 (T1.2)에서 구현 예정');
        });
    });
});
