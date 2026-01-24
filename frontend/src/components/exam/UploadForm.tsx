/**
 * Exam upload form component.
 * Implements: rerender-functional-setstate, rendering-hoist-jsx
 */
import { useState, useCallback, useRef } from 'react';

interface UploadFormProps {
  onUpload: (data: { file: File; title: string }) => Promise<void>;
  isUploading: boolean;
}

export function UploadForm({ onUpload, isUploading }: UploadFormProps) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!file || !title) return;

      try {
        await onUpload({ file, title });
        // Reset form on success
        setTitle('');
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch {
        // Error handled by parent
      }
    },
    [file, title, onUpload]
  );

  /**
   * 파일명에서 시험명 추출
   * 패턴 1: "[학교명][학년][과목][시험정보] (기타).pdf"
   *   예: "[구암고][1][수상][24 1 중간] (원본).pdf" -> "구암고 1학년 수학(상) 2024년 1학기 중간고사"
   * 패턴 2: 일반 파일명
   *   예: "2024_1학기_중간고사_수학.pdf" -> "2024 1학기 중간고사 수학"
   */
  const parseExamTitleFromFilename = useCallback((filename: string): string => {
    // 확장자 제거
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

    // (원본), (복사본), (1) 등 제거
    const withoutSuffix = nameWithoutExt.replace(/\s*\([^)]*\)\s*$/, '').trim();

    // 패턴 1: [xxx][xxx][xxx][xxx] 형식 감지
    const bracketPattern = /\[([^\]]+)\]/g;
    const matches = [...withoutSuffix.matchAll(bracketPattern)];

    if (matches.length >= 3) {
      const parts = matches.map((m) => m[1]);

      // 과목명 변환 맵
      const subjectMap: Record<string, string> = {
        수상: '수학(상)',
        수하: '수학(하)',
        수1: '수학Ⅰ',
        수2: '수학Ⅱ',
        확통: '확률과통계',
        미적: '미적분',
        기하: '기하',
      };

      // 학교명, 학년, 과목
      const school = parts[0];
      const gradeMatch = parts[1]?.match(/(\d)/);
      const grade = gradeMatch ? `${gradeMatch[1]}학년` : parts[1];
      const subject = subjectMap[parts[2]] || parts[2];

      // 시험 정보 파싱 (예: "24 1 중간" -> "2024년 1학기 중간고사")
      let examInfo = parts[3] || '';
      const examMatch = examInfo.match(/(\d{2})\s*(\d)\s*(중간|기말|모의)/);
      if (examMatch) {
        const year = `20${examMatch[1]}`;
        const semester = examMatch[2];
        const typeMap: Record<string, string> = {
          중간: '중간고사',
          기말: '기말고사',
          모의: '모의고사',
        };
        examInfo = `${year}년 ${semester}학기 ${typeMap[examMatch[3]]}`;
      }

      return `${school} ${grade} ${subject} ${examInfo}`.trim();
    }

    // 패턴 2: 일반 파일명 처리
    const cleaned = withoutSuffix
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned;
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);

        // 시험명이 비어있으면 파일명에서 자동 추출
        if (!title.trim()) {
          const parsedTitle = parseExamTitleFromFilename(selectedFile.name);
          setTitle(parsedTitle);
        }
      }
    },
    [title, parseExamTitleFromFilename]
  );

  return (
    <div className="bg-white shadow sm:rounded-lg mb-8 p-6">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        새 시험지 업로드
      </h3>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 md:flex md:space-y-0 md:space-x-4 md:items-end"
      >
        <div className="flex-1">
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700"
          >
            시험명
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder="파일 선택 시 자동 입력됩니다"
            required
          />
        </div>
        <div className="flex-1">
          <label
            htmlFor="file-upload"
            className="block text-sm font-medium text-gray-700"
          >
            파일 (PDF, Image)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            id="file-upload"
            onChange={handleFileChange}
            accept=".pdf,image/*"
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isUploading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          {isUploading ? '업로드 중...' : '업로드'}
        </button>
      </form>
    </div>
  );
}
