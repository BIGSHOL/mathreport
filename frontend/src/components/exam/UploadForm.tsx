/**
 * Exam upload form component.
 * AI가 업로드 시 자동으로 유형을 감지하고, 분석 전 모달에서 확인/변경 가능
 * Implements: rerender-functional-setstate, rendering-hoist-jsx
 */
import { useState, useCallback, useRef, useEffect } from 'react';

// 업로드 단계 타입
type UploadStage = 'idle' | 'uploading' | 'classifying' | 'saving';

// 단계별 예상 시간 (ms)
const STAGE_DURATIONS = {
  uploading: 2000,
  classifying: 5000,
};

interface UploadFormProps {
  onUpload: (data: { files: File[]; title: string }) => Promise<void>;
  isUploading: boolean;
}

export function UploadForm({ onUpload, isUploading }: UploadFormProps) {
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [isDragOver, setIsDragOver] = useState(false);

  // 업로드 상태에 따라 단계 시뮬레이션
  useEffect(() => {
    if (!isUploading) {
      setUploadStage('idle');
      return;
    }

    // 업로드 시작 시 단계 진행
    setUploadStage('uploading');

    // 파일 크기에 따른 업로드 시간 조정 (MB당 1초 추가)
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const uploadTime = Math.min(STAGE_DURATIONS.uploading + (totalSize / 1024 / 1024) * 1000, 8000);

    const classifyTimer = setTimeout(() => {
      setUploadStage('classifying');
    }, uploadTime);

    const saveTimer = setTimeout(() => {
      setUploadStage('saving');
    }, uploadTime + STAGE_DURATIONS.classifying);

    return () => {
      clearTimeout(classifyTimer);
      clearTimeout(saveTimer);
    };
  }, [isUploading, files]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (files.length === 0 || !title) return;

      try {
        // 과목은 서버에서 AI가 자동 감지 (수학/영어)
        await onUpload({ files, title });
        // Reset form on success
        setTitle('');
        setFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch {
        // Error handled by parent
      }
    },
    [files, title, onUpload]
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
        // 수학
        수상: '수학(상)',
        수하: '수학(하)',
        수1: '수학Ⅰ',
        수2: '수학Ⅱ',
        확통: '확률과통계',
        미적: '미적분',
        기하: '기하',
        // 영어
        영1: '영어Ⅰ',
        영2: '영어Ⅱ',
        영어: '영어',
        독작: '영어독해와작문',
        회화: '영어회화',
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
      const selectedFiles = e.target.files;
      if (selectedFiles && selectedFiles.length > 0) {
        // FileList를 배열로 변환하고 이름순 정렬
        const fileArray = Array.from(selectedFiles).sort((a, b) =>
          a.name.localeCompare(b.name, 'ko', { numeric: true })
        );
        setFiles(fileArray);

        // 시험명이 비어있으면 첫 번째 파일명에서 자동 추출
        if (!title.trim()) {
          const parsedTitle = parseExamTitleFromFilename(fileArray[0].name);
          setTitle(parsedTitle);
        }
      }
    },
    [title, parseExamTitleFromFilename]
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const newFiles = prev.filter((_, i) => i !== index);
      // 파일이 모두 삭제되면 시험명도 초기화
      if (newFiles.length === 0) {
        setTitle('');
      }
      return newFiles;
    });
  }, []);

  // 드래그 앤 드롭 핸들러
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      // 유효한 파일만 필터링 (PDF, 이미지)
      const validFiles = Array.from(droppedFiles).filter(file =>
        file.type === 'application/pdf' ||
        file.type.startsWith('image/')
      );

      if (validFiles.length === 0) {
        alert('PDF 또는 이미지 파일만 업로드 가능합니다.');
        return;
      }

      // 이름순 정렬
      const sortedFiles = validFiles.sort((a, b) =>
        a.name.localeCompare(b.name, 'ko', { numeric: true })
      );
      setFiles(sortedFiles);

      // 시험명이 비어있으면 첫 번째 파일명에서 자동 추출
      if (!title.trim()) {
        const parsedTitle = parseExamTitleFromFilename(sortedFiles[0].name);
        setTitle(parsedTitle);
      }
    }
  }, [title, parseExamTitleFromFilename]);

  return (
    <div className="bg-white shadow sm:rounded-lg mb-6 p-4">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3">
          {/* 시험명 입력 */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 min-w-0 border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="시험명 (파일 선택 시 자동 입력)"
            required
          />

          {/* 드래그 앤 드롭 영역 - 컴팩트 */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              flex-1 min-w-[200px] cursor-pointer border-2 border-dashed rounded-md px-3 py-2
              transition-colors duration-150 flex items-center justify-center gap-2
              ${isDragOver
                ? 'border-indigo-500 bg-indigo-50'
                : files.length > 0
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-indigo-400'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept=".pdf,image/*"
              multiple
              className="hidden"
              required={files.length === 0}
            />
            {files.length === 0 ? (
              <>
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-500">PDF/이미지 드래그 또는 클릭</span>
                <span className="text-xs text-gray-400 hidden sm:inline">(최대 20MB)</span>
              </>
            ) : (
              <>
                <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-green-700 font-medium">{files.length}개 파일</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFiles([]); setTitle(''); }}
                  className="text-gray-400 hover:text-red-500 ml-1"
                >
                  ×
                </button>
              </>
            )}
          </div>

          {/* 업로드 버튼 */}
          <button
            type="submit"
            disabled={isUploading || files.length === 0}
            className="px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
          >
            {isUploading ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {uploadStage === 'uploading' ? '업로드' : uploadStage === 'classifying' ? 'AI분류' : '저장'}
              </span>
            ) : (
              '업로드'
            )}
          </button>
        </div>

        {/* 선택된 파일 목록 (여러 파일일 때만) */}
        {files.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {files.slice(0, 5).map((f, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                {f.name.length > 20 ? f.name.slice(0, 17) + '...' : f.name}
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="text-gray-400 hover:text-red-500"
                >
                  ×
                </button>
              </span>
            ))}
            {files.length > 5 && (
              <span className="px-2 py-0.5 text-xs text-gray-500">+{files.length - 5}개</span>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
