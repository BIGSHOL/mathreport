/**
 * Exam upload form component.
 * AI가 업로드 시 자동으로 유형을 감지하고, 분석 전 모달에서 확인/변경 가능
 * Implements: rerender-functional-setstate, rendering-hoist-jsx
 */
import { useState, useCallback, useRef, useEffect } from 'react';

// 업로드 단계 타입
type UploadStage = 'idle' | 'compressing' | 'uploading' | 'classifying' | 'saving';

// 이미지 압축 설정
const COMPRESS_CONFIG = {
  maxWidth: 1600,      // 최대 너비
  maxHeight: 2400,     // 최대 높이
  quality: 0.85,       // JPEG 품질 (0-1)
  maxSizeKB: 500,      // 목표 최대 크기 (KB)
};

/**
 * 이미지 파일 압축 (리사이즈 + JPEG 변환)
 */
async function compressImage(file: File): Promise<File> {
  // PDF는 압축하지 않음
  if (file.type === 'application/pdf') {
    return file;
  }

  // 이미지가 아니면 그대로 반환
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // 리사이즈 비율 계산
      let { width, height } = img;
      const widthRatio = COMPRESS_CONFIG.maxWidth / width;
      const heightRatio = COMPRESS_CONFIG.maxHeight / height;
      const ratio = Math.min(widthRatio, heightRatio, 1); // 1보다 작을 때만 축소

      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      // Canvas에 그리기
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // JPEG로 변환
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // 새 파일 생성 (원본 이름 유지, 확장자만 변경)
          const newName = file.name.replace(/\.[^.]+$/, '.jpg');
          const compressedFile = new File([blob], newName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          // 압축 결과 로깅 (개발용)
          const reduction = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
          console.log(`[압축] ${file.name}: ${(file.size/1024).toFixed(0)}KB → ${(compressedFile.size/1024).toFixed(0)}KB (${reduction}% 감소)`);

          resolve(compressedFile);
        },
        'image/jpeg',
        COMPRESS_CONFIG.quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // 에러 시 원본 반환
    };

    img.src = url;
  });
}

/**
 * 여러 파일 압축 (병렬 처리)
 */
async function compressFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map(compressImage));
}

// 단계별 예상 시간 (ms)
const STAGE_DURATIONS = {
  uploading: 2000,
  classifying: 5000,
};

// 학년별 세부과목 매핑 (22개정 교육과정)
const GRADE_TO_CATEGORIES: Record<string, string[]> = {
  '중1': ['중1-1', '중1-2'],
  '중2': ['중2-1', '중2-2'],
  '중3': ['중3-1', '중3-2'],
  '고1': ['공통수학1', '공통수학2'],
  '고2': ['대수', '미적분I', '미적분II', '확률과 통계', '기하'],
  '고3': ['대수', '미적분I', '미적분II', '확률과 통계', '기하'],
};

// 과목별 카테고리 정의 (하위 호환용)
const SUBJECT_CATEGORIES: Record<string, { label: string; categories: string[] }> = {
  '수학': {
    label: '수학',
    categories: [
      '중1-1', '중1-2', '중2-1', '중2-2', '중3-1', '중3-2',
      '공통수학1', '공통수학2', '대수', '미적분I', '미적분II', '확률과 통계', '기하',
    ],
  },
  // TODO: 영어 과목 추후 활성화 예정
  // '영어': {
  //   label: '영어',
  //   categories: ['영어Ⅰ', '영어Ⅱ', '영어독해와작문', '영어회화'],
  // },
};

// 교육과정 계층 구조 타입
interface ChapterGroup {
  chapter: string;      // 대단원
  sections: {
    section: string;    // 중단원
    topics: string[];   // 소단원
  }[];
}

// 카테고리별 교육과정 계층 구조 (22개정)
const CURRICULUM_HIERARCHY: Record<string, ChapterGroup[]> = {
  // ============================================
  // 중학교 1학년 1학기
  // ============================================
  '중1-1': [
    {
      chapter: '수와 연산',
      sections: [
        { section: '소인수분해', topics: ['소인수분해', '최대공약수와 최소공배수'] },
        { section: '정수와 유리수', topics: ['정수와 유리수', '정수와 유리수의 덧셈과 뺄셈', '정수와 유리수의 곱셈과 나눗셈'] },
      ],
    },
    {
      chapter: '문자와 식',
      sections: [
        { section: '문자의 사용과 식', topics: ['문자의 사용과 식의 계산', '일차식의 덧셈과 뺄셈'] },
        { section: '일차방정식', topics: ['일차방정식의 풀이', '일차방정식의 활용'] },
      ],
    },
    {
      chapter: '좌표평면과 그래프',
      sections: [
        { section: '좌표와 그래프', topics: ['순서쌍과 좌표', '그래프'] },
        { section: '정비례와 반비례', topics: ['정비례', '반비례'] },
      ],
    },
  ],

  // ============================================
  // 중학교 1학년 2학기
  // ============================================
  '중1-2': [
    {
      chapter: '기하',
      sections: [
        { section: '기본 도형', topics: ['점, 선, 면, 각', '위치 관계', '평행선의 성질'] },
        { section: '작도와 합동', topics: ['삼각형의 작도', '삼각형의 합동'] },
        { section: '평면도형', topics: ['다각형', '원과 부채꼴'] },
        { section: '입체도형', topics: ['다면체', '회전체', '입체도형의 겉넓이와 부피'] },
      ],
    },
    {
      chapter: '통계',
      sections: [
        { section: '자료의 정리와 해석', topics: ['줄기와 잎 그림, 도수분포표', '히스토그램과 도수분포다각형', '상대도수'] },
      ],
    },
  ],

  // ============================================
  // 중학교 2학년 1학기
  // ============================================
  '중2-1': [
    {
      chapter: '수와 연산',
      sections: [
        { section: '유리수와 순환소수', topics: ['유리수와 순환소수'] },
      ],
    },
    {
      chapter: '문자와 식',
      sections: [
        { section: '식의 계산', topics: ['단항식의 계산', '다항식의 계산'] },
      ],
    },
    {
      chapter: '부등식과 방정식',
      sections: [
        { section: '일차부등식', topics: ['부등식의 성질', '일차부등식의 풀이와 활용'] },
        { section: '연립일차방정식', topics: ['연립일차방정식의 풀이', '연립일차방정식의 활용'] },
      ],
    },
    {
      chapter: '함수',
      sections: [
        { section: '일차함수', topics: ['일차함수와 그 그래프', '일차함수와 일차방정식의 관계'] },
      ],
    },
  ],

  // ============================================
  // 중학교 2학년 2학기
  // ============================================
  '중2-2': [
    {
      chapter: '기하',
      sections: [
        { section: '삼각형의 성질', topics: ['이등변삼각형의 성질', '직각삼각형의 합동', '삼각형의 외심과 내심'] },
        { section: '사각형의 성질', topics: ['평행사변형', '여러 가지 사각형'] },
        { section: '도형의 닮음', topics: ['도형의 닮음', '평행선 사이의 선분의 길이의 비', '삼각형의 무게중심'] },
        { section: '피타고라스 정리', topics: ['피타고라스 정리'] },
      ],
    },
    {
      chapter: '확률',
      sections: [
        { section: '확률', topics: ['경우의 수', '확률의 뜻과 성질', '확률의 계산'] },
      ],
    },
  ],

  // ============================================
  // 중학교 3학년 1학기
  // ============================================
  '중3-1': [
    {
      chapter: '수와 연산',
      sections: [
        { section: '실수와 그 연산', topics: ['제곱근과 실수', '근호를 포함한 식의 계산'] },
      ],
    },
    {
      chapter: '문자와 식',
      sections: [
        { section: '다항식의 곱셈과 인수분해', topics: ['다항식의 곱셈', '다항식의 인수분해'] },
        { section: '이차방정식', topics: ['이차방정식의 풀이', '이차방정식의 활용'] },
      ],
    },
    {
      chapter: '함수',
      sections: [
        { section: '이차함수', topics: ['이차함수와 그 그래프'] },
      ],
    },
  ],

  // ============================================
  // 중학교 3학년 2학기
  // ============================================
  '중3-2': [
    {
      chapter: '기하',
      sections: [
        { section: '삼각비', topics: ['삼각비', '삼각비의 활용'] },
        { section: '원의 성질', topics: ['원과 현', '원과 접선', '원주각'] },
      ],
    },
    {
      chapter: '통계',
      sections: [
        { section: '통계', topics: ['대푯값과 산포도', '상관관계'] },
      ],
    },
  ],

  // ============================================
  // 공통수학1
  // ============================================
  '공통수학1': [
    {
      chapter: '다항식',
      sections: [
        { section: '다항식의 연산', topics: ['다항식의 덧셈과 뺄셈', '다항식의 곱셈과 나눗셈'] },
        { section: '나머지정리', topics: ['항등식', '나머지정리와 인수정리', '조립제법'] },
        { section: '인수분해', topics: ['인수분해'] },
      ],
    },
    {
      chapter: '방정식과 부등식',
      sections: [
        { section: '복소수', topics: ['복소수', '복소수의 연산'] },
        { section: '이차방정식', topics: ['이차방정식의 판별식', '이차방정식의 근과 계수의 관계'] },
        { section: '이차방정식과 이차함수', topics: ['이차방정식과 이차함수의 관계', '이차함수의 최대, 최소'] },
        { section: '여러 가지 방정식과 부등식', topics: ['삼차방정식과 사차방정식', '연립이차방정식', '연립일차부등식', '이차부등식'] },
      ],
    },
    {
      chapter: '경우의 수',
      sections: [
        { section: '경우의 수', topics: ['합의 법칙과 곱의 법칙'] },
        { section: '순열과 조합', topics: ['순열', '조합'] },
      ],
    },
    {
      chapter: '행렬',
      sections: [
        { section: '행렬', topics: ['행렬과 그 연산'] },
      ],
    },
  ],

  // ============================================
  // 공통수학2
  // ============================================
  '공통수학2': [
    {
      chapter: '도형의 방정식',
      sections: [
        { section: '평면좌표', topics: ['두 점 사이의 거리', '선분의 내분점'] },
        { section: '직선의 방정식', topics: ['직선의 방정식', '두 직선의 위치 관계', '점과 직선 사이의 거리'] },
        { section: '원의 방정식', topics: ['원의 방정식', '원과 직선의 위치 관계'] },
        { section: '도형의 이동', topics: ['평행이동', '대칭이동'] },
      ],
    },
    {
      chapter: '집합과 명제',
      sections: [
        { section: '집합', topics: ['집합의 뜻과 표현', '집합의 연산'] },
        { section: '명제', topics: ['명제와 조건', '명제 사이의 관계', '충분조건과 필요조건', '절대부등식'] },
      ],
    },
    {
      chapter: '함수와 그래프',
      sections: [
        { section: '함수', topics: ['함수', '합성함수와 역함수'] },
        { section: '유리함수와 무리함수', topics: ['유리함수', '무리함수'] },
      ],
    },
  ],

  // ============================================
  // 대수
  // ============================================
  '대수': [
    {
      chapter: '지수함수와 로그함수',
      sections: [
        { section: '지수와 로그', topics: ['지수', '로그'] },
        { section: '지수함수와 로그함수', topics: ['지수함수', '로그함수', '지수함수와 로그함수의 활용'] },
      ],
    },
    {
      chapter: '삼각함수',
      sections: [
        { section: '삼각함수', topics: ['삼각함수', '삼각함수의 그래프', '삼각함수의 활용'] },
      ],
    },
    {
      chapter: '수열',
      sections: [
        { section: '등차수열과 등비수열', topics: ['등차수열', '등비수열'] },
        { section: '수열의 합', topics: ['합의 기호 시그마', '여러 가지 수열의 합'] },
        { section: '수학적 귀납법', topics: ['수학적 귀납법'] },
      ],
    },
  ],

  // ============================================
  // 미적분I
  // ============================================
  '미적분I': [
    {
      chapter: '함수의 극한과 연속',
      sections: [
        { section: '함수의 극한', topics: ['함수의 극한', '함수의 극한에 대한 성질'] },
        { section: '함수의 연속', topics: ['함수의 연속'] },
      ],
    },
    {
      chapter: '미분',
      sections: [
        { section: '미분계수와 도함수', topics: ['미분계수', '도함수'] },
        { section: '도함수의 활용', topics: ['접선의 방정식', '함수의 증가와 감소, 극대와 극소', '함수의 그래프', '방정식과 부등식에의 활용', '속도와 가속도'] },
      ],
    },
    {
      chapter: '적분',
      sections: [
        { section: '부정적분', topics: ['부정적분'] },
        { section: '정적분', topics: ['정적분'] },
        { section: '정적분의 활용', topics: ['넓이', '속도와 거리'] },
      ],
    },
  ],

  // ============================================
  // 미적분II
  // ============================================
  '미적분II': [
    {
      chapter: '수열의 극한',
      sections: [
        { section: '수열의 극한', topics: ['수열의 극한', '급수'] },
      ],
    },
    {
      chapter: '미분법',
      sections: [
        { section: '여러 가지 함수의 미분', topics: ['지수함수와 로그함수의 미분', '삼각함수의 미분'] },
        { section: '여러 가지 미분법', topics: ['여러 가지 미분법', '도함수의 활용'] },
      ],
    },
    {
      chapter: '적분법',
      sections: [
        { section: '여러 가지 적분법', topics: ['여러 가지 적분법'] },
        { section: '정적분의 활용', topics: ['정적분과 급수', '넓이와 부피'] },
      ],
    },
  ],

  // ============================================
  // 확률과 통계
  // ============================================
  '확률과 통계': [
    {
      chapter: '경우의 수',
      sections: [
        { section: '경우의 수', topics: ['중복순열', '중복조합'] },
        { section: '이항정리', topics: ['이항정리'] },
      ],
    },
    {
      chapter: '확률',
      sections: [
        { section: '확률의 뜻과 활용', topics: ['확률의 뜻', '확률의 덧셈정리'] },
        { section: '조건부확률', topics: ['조건부확률', '사건의 독립과 종속'] },
      ],
    },
    {
      chapter: '통계',
      sections: [
        { section: '확률분포', topics: ['확률변수와 확률분포', '이항분포', '정규분포'] },
        { section: '통계적 추정', topics: ['모집단과 표본', '모평균의 추정', '모비율의 추정'] },
      ],
    },
  ],

  // ============================================
  // 기하
  // ============================================
  '기하': [
    {
      chapter: '이차곡선',
      sections: [
        { section: '이차곡선', topics: ['포물선', '타원', '쌍곡선'] },
        { section: '이차곡선과 직선', topics: ['이차곡선과 직선의 위치 관계', '접선의 방정식'] },
      ],
    },
    {
      chapter: '평면벡터',
      sections: [
        { section: '벡터의 연산', topics: ['벡터의 뜻과 연산'] },
        { section: '평면벡터의 성분과 내적', topics: ['위치벡터', '평면벡터의 성분', '평면벡터의 내적'] },
      ],
    },
    {
      chapter: '공간도형과 공간좌표',
      sections: [
        { section: '공간도형', topics: ['직선과 평면의 위치 관계', '정사영'] },
        { section: '공간좌표', topics: ['점의 좌표', '두 점 사이의 거리'] },
      ],
    },
  ],
};

// 계층 구조에서 모든 토픽(소단원) 추출 (하위 호환용)
function getAllTopics(category: string): string[] {
  const chapters = CURRICULUM_HIERARCHY[category];
  if (!chapters) return [];
  return chapters.flatMap(ch => ch.sections.flatMap(sec => sec.topics));
}

// 기존 CATEGORY_UNITS 하위 호환 (다른 코드에서 사용 시)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CATEGORY_UNITS: Record<string, string[]> = Object.fromEntries(
  Object.keys(CURRICULUM_HIERARCHY).map(key => [key, getAllTopics(key)])
);

// 학년 옵션
const GRADE_OPTIONS = ['중1', '중2', '중3', '고1', '고2', '고3'];

// 과목 약어 → 카테고리 매핑 (파일명 파싱용, 22개정)
const SUBJECT_ABBR_MAP: Record<string, { subject: string; category: string }> = {
  // 수학 약어 (22개정) - 학기별
  '중1-1': { subject: '수학', category: '중1-1' },
  '중1-2': { subject: '수학', category: '중1-2' },
  '중2-1': { subject: '수학', category: '중2-1' },
  '중2-2': { subject: '수학', category: '중2-2' },
  '중3-1': { subject: '수학', category: '중3-1' },
  '중3-2': { subject: '수학', category: '중3-2' },
  // 하위 호환 (학년 전체)
  '중1': { subject: '수학', category: '중1-1' },
  '중2': { subject: '수학', category: '중2-1' },
  '중3': { subject: '수학', category: '중3-1' },
  '공수1': { subject: '수학', category: '공통수학1' },
  '공수2': { subject: '수학', category: '공통수학2' },
  '대수': { subject: '수학', category: '대수' },
  '미적1': { subject: '수학', category: '미적분I' },
  '미적2': { subject: '수학', category: '미적분II' },
  '확통': { subject: '수학', category: '확률과 통계' },
  '기하': { subject: '수학', category: '기하' },
  // 영어 약어
  '영1': { subject: '영어', category: '영어Ⅰ' },
  '영2': { subject: '영어', category: '영어Ⅱ' },
  '영어': { subject: '영어', category: '영어Ⅰ' },
  '독작': { subject: '영어', category: '영어독해와작문' },
  '회화': { subject: '영어', category: '영어회화' },
};

export interface ExamClassification {
  school?: string;
  grade?: string;
  subject?: string;
  category?: string;
  examScope?: string[];  // 출제범위 (단원 목록)
}

interface UploadFormProps {
  onUpload: (data: { files: File[]; title: string; classification?: ExamClassification }) => Promise<void>;
  isUploading: boolean;
}

export function UploadForm({ onUpload, isUploading }: UploadFormProps) {
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [isDragOver, setIsDragOver] = useState(false);

  // 분류 정보 state
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('수학');
  const [category, setCategory] = useState('');
  const [examScope, setExamScope] = useState<string[]>([]);  // 출제범위 (선택된 단원)
  const [showClassification, setShowClassification] = useState(false);

  // 파일 크기 합계 (안정적인 의존성을 위해)
  const totalFileSize = files.reduce((sum, f) => sum + f.size, 0);

  // 업로드 상태에 따라 단계 시뮬레이션
  useEffect(() => {
    if (!isUploading) {
      // 압축 중이 아닐 때만 idle로
      if (uploadStage !== 'compressing') {
        setUploadStage('idle');
      }
      return;
    }

    // 압축 완료 후 업로드 시작 시 단계 진행
    if (uploadStage === 'compressing') {
      setUploadStage('uploading');
    } else if (uploadStage === 'idle') {
      setUploadStage('uploading');
    }

    // 파일 크기에 따른 업로드 시간 조정 (압축 후 크기 기준)
    const uploadTime = Math.min(STAGE_DURATIONS.uploading + (totalFileSize / 1024 / 1024) * 500, 5000);

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
  }, [isUploading, totalFileSize, uploadStage]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (files.length === 0 || !title) return;

      try {
        // 1. 이미지 압축 단계
        setUploadStage('compressing');
        const compressedFiles = await compressFiles(files);

        // 압축 결과 요약 로깅
        const originalSize = files.reduce((sum, f) => sum + f.size, 0);
        const compressedSize = compressedFiles.reduce((sum, f) => sum + f.size, 0);
        console.log(`[압축 완료] 총 ${(originalSize/1024/1024).toFixed(2)}MB → ${(compressedSize/1024/1024).toFixed(2)}MB`);

        // 분류 정보 구성
        const classification: ExamClassification = {};
        if (school.trim()) classification.school = school.trim();
        if (grade) classification.grade = grade;
        if (subject) classification.subject = subject;
        if (category) classification.category = category;
        if (examScope.length > 0) classification.examScope = examScope;

        // 2. 업로드 (압축된 파일 + 분류 정보)
        await onUpload({
          files: compressedFiles,
          title,
          classification: Object.keys(classification).length > 0 ? classification : undefined,
        });

        // Reset form on success
        setTitle('');
        setFiles([]);
        setExamScope([]);
        setSchool('');
        setGrade('');
        setSubject('수학');
        setCategory('');
        setShowClassification(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch {
        // Error handled by parent
      }
    },
    [files, title, school, grade, subject, category, examScope, onUpload]
  );

  /**
   * 파일명에서 시험명과 분류 정보 추출
   * 패턴 1: "[학교명][학년][과목][시험정보] (기타).pdf"
   *   예: "[구암고][1][수상][24 1 중간] (원본).pdf" -> "구암고 1학년 수학(상) 2024년 1학기 중간고사"
   * 패턴 2: 일반 파일명
   *   예: "2024_1학기_중간고사_수학.pdf" -> "2024 1학기 중간고사 수학"
   */
  const parseExamFromFilename = useCallback((filename: string): {
    title: string;
    classification: ExamClassification;
  } => {
    // 확장자 제거
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

    // (원본), (복사본), (1) 등 제거
    const withoutSuffix = nameWithoutExt.replace(/\s*\([^)]*\)\s*$/, '').trim();

    // 패턴 1: [xxx][xxx][xxx][xxx] 형식 감지
    const bracketPattern = /\[([^\]]+)\]/g;
    const matches = [...withoutSuffix.matchAll(bracketPattern)];

    if (matches.length >= 3) {
      const parts = matches.map((m) => m[1]);

      // 학교명
      const extractedSchool = parts[0];

      // 과목/카테고리 먼저 추출 (학년 추론에 사용)
      const subjectAbbr = parts[2];
      const subjectInfo = SUBJECT_ABBR_MAP[subjectAbbr];
      const extractedSubject = subjectInfo?.subject || '수학';

      // 학년 추출 및 추론
      const gradeMatch = parts[1]?.match(/(\d)/);
      const extractedGradeNum = gradeMatch ? gradeMatch[1] : '';
      const isMiddleSchool = extractedSchool.includes('중');

      // 고등학교 과목 약어로 학년 추론
      let extractedGrade = '';
      if (extractedGradeNum) {
        extractedGrade = isMiddleSchool ? `중${extractedGradeNum}` : `고${extractedGradeNum}`;
      } else if (subjectInfo?.category) {
        // 과목 약어로 학년 추론
        if (['공통수학1', '공통수학2'].includes(subjectInfo.category)) {
          extractedGrade = '고1';
        } else if (['대수', '미적분I', '미적분II', '확률과 통계', '기하'].includes(subjectInfo.category)) {
          extractedGrade = '고2'; // 기본값 (고2/고3 구분 어려움)
        }
      }

      // 세부과목: 학기별(중1-1 등) 또는 고등과목(공통수학1 등)이 명시적으로 있을 때만 설정
      const isExplicitCategory = subjectAbbr && (
        subjectAbbr.match(/중\d-[12]/) || // 중1-1, 중1-2 등
        ['공수1', '공수2', '대수', '미적1', '미적2', '확통', '기하'].includes(subjectAbbr) // 고등 과목
      );
      const extractedCategory = isExplicitCategory ? (subjectInfo?.category || '') : '';

      // 표시용 과목명
      const displaySubjectMap: Record<string, string> = {
        수상: '수학(상)', 수하: '수학(하)', 수1: '수학Ⅰ', 수2: '수학Ⅱ',
        확통: '확률과통계', 미적: '미적분', 기하: '기하',
        공수1: '공통수학1', 공수2: '공통수학2', 대수: '대수',
        영1: '영어Ⅰ', 영2: '영어Ⅱ', 영어: '영어', 독작: '영어독해와작문', 회화: '영어회화',
      };
      const displaySubject = displaySubjectMap[subjectAbbr] || subjectAbbr;
      const displayGrade = extractedGradeNum ? `${extractedGradeNum}학년` : parts[1];

      // 시험 정보 파싱 (예: "24 1 중간" -> "2024년 1학기 중간고사")
      let examInfo = parts[3] || '';
      const examMatch = examInfo.match(/(\d{2})\s*(\d)\s*(중간|기말|모의)/);
      if (examMatch) {
        const year = `20${examMatch[1]}`;
        const semester = examMatch[2];
        const typeMap: Record<string, string> = { 중간: '중간고사', 기말: '기말고사', 모의: '모의고사' };
        examInfo = `${year}년 ${semester}학기 ${typeMap[examMatch[3]]}`;
      }

      return {
        title: `${extractedSchool} ${displayGrade} ${displaySubject} ${examInfo}`.trim(),
        classification: {
          school: extractedSchool,
          grade: extractedGrade,
          subject: extractedSubject,
          category: extractedCategory,
        },
      };
    }

    // 패턴 2: 일반 파일명 처리
    const cleaned = withoutSuffix
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      title: cleaned,
      classification: { subject: '수학' },
    };
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

        // 첫 번째 파일명에서 자동 추출
        const parsed = parseExamFromFilename(fileArray[0].name);

        // 시험명이 비어있으면 자동 설정
        if (!title.trim()) {
          setTitle(parsed.title);
        }

        // 분류 정보 자동 설정
        if (parsed.classification.school) setSchool(parsed.classification.school);
        if (parsed.classification.grade) setGrade(parsed.classification.grade);
        if (parsed.classification.subject) setSubject(parsed.classification.subject);
        if (parsed.classification.category) setCategory(parsed.classification.category);

        // 분류 정보가 추출되면 분류 섹션 표시
        if (parsed.classification.school || parsed.classification.grade) {
          setShowClassification(true);
        }
      }
    },
    [title, parseExamFromFilename]
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

      // 첫 번째 파일명에서 자동 추출
      const parsed = parseExamFromFilename(sortedFiles[0].name);

      // 시험명이 비어있으면 자동 설정
      if (!title.trim()) {
        setTitle(parsed.title);
      }

      // 분류 정보 자동 설정
      if (parsed.classification.school) setSchool(parsed.classification.school);
      if (parsed.classification.grade) setGrade(parsed.classification.grade);
      if (parsed.classification.subject) setSubject(parsed.classification.subject);
      if (parsed.classification.category) setCategory(parsed.classification.category);

      // 분류 정보가 추출되면 분류 섹션 표시
      if (parsed.classification.school || parsed.classification.grade) {
        setShowClassification(true);
      }
    }
  }, [title, parseExamFromFilename]);

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
                {uploadStage === 'compressing' ? '압축중' : uploadStage === 'uploading' ? '업로드' : uploadStage === 'classifying' ? 'AI분류' : '저장'}
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

        {/* 분류 정보 섹션 */}
        {files.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            {/* 분류 토글 버튼 */}
            <button
              type="button"
              onClick={() => setShowClassification(!showClassification)}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-indigo-600"
            >
              <svg
                className={`h-4 w-4 transition-transform ${showClassification ? 'rotate-90' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
              <span>시험 분류 정보</span>
              {(school || grade || category) && (
                <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
                  {[school, grade, category].filter(Boolean).join(' · ')}
                </span>
              )}
            </button>

            {showClassification && (
              <div className="mt-2 space-y-2">
                {/* 분류 정확도 안내 메시지 */}
                <p className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded flex items-center gap-1">
                  <svg className="h-3.5 w-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  분류 정보가 정확할수록 AI 분석 정확도가 향상됩니다
                </p>

                {/* 분류 입력 필드들 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* 학교명 */}
                  <input
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="학교명"
                    className="border border-gray-200 rounded px-2 py-1.5 text-sm"
                  />

                  {/* 학년 */}
                  <select
                    value={grade}
                    onChange={(e) => {
                      setGrade(e.target.value);
                      setCategory(''); // 학년 변경 시 세부과목 초기화
                      setExamScope([]); // 학년 변경 시 출제범위 초기화
                    }}
                    className="border border-gray-200 rounded px-2 py-1.5 text-sm bg-white"
                  >
                    <option value="">학년 선택</option>
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>

                  {/* 과목 */}
                  <select
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      setCategory(''); // 과목 변경 시 카테고리 초기화
                    }}
                    className="border border-gray-200 rounded px-2 py-1.5 text-sm bg-white"
                  >
                    {Object.entries(SUBJECT_CATEGORIES).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>

                  {/* 세부 과목 (카테고리) - 학년에 따라 필터링 */}
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setExamScope([]); // 카테고리 변경 시 출제범위 초기화
                    }}
                    className="border border-gray-200 rounded px-2 py-1.5 text-sm bg-white"
                    disabled={!grade} // 학년 선택 전에는 비활성화
                  >
                    <option value="">세부 과목</option>
                    {grade && GRADE_TO_CATEGORIES[grade]?.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* 출제범위 선택 (세부 과목 선택 시) - 계층 구조 표시 */}
                {category && CURRICULUM_HIERARCHY[category] && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-gray-700">출제범위 (단원 선택)</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setExamScope(getAllTopics(category))}
                          className="text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          전체선택
                        </button>
                        <button
                          type="button"
                          onClick={() => setExamScope([])}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          선택해제
                        </button>
                      </div>
                    </div>

                    {/* 계층적 단원 표시 - 2열 레이아웃 (masonry-like) */}
                    <div className="columns-2 gap-2 space-y-2 max-h-[400px] overflow-y-auto pr-1">
                      {CURRICULUM_HIERARCHY[category].map((chapterGroup, chIdx) => (
                        <div key={chIdx} className="border border-gray-200 rounded-lg overflow-hidden break-inside-avoid mb-2">
                          {/* 대단원 헤더 */}
                          <div
                            className="bg-gray-100 px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-gray-150"
                            onClick={() => {
                              const allTopics = chapterGroup.sections.flatMap(s => s.topics);
                              const allSelected = allTopics.every(t => examScope.includes(t));
                              if (allSelected) {
                                setExamScope(examScope.filter(t => !allTopics.includes(t)));
                              } else {
                                setExamScope([...new Set([...examScope, ...allTopics])]);
                              }
                            }}
                          >
                            <span className="text-xs font-semibold text-gray-800">{chapterGroup.chapter}</span>
                            <span className="text-[10px] text-gray-500">
                              {chapterGroup.sections.flatMap(s => s.topics).filter(t => examScope.includes(t)).length}
                              /{chapterGroup.sections.flatMap(s => s.topics).length}
                            </span>
                          </div>

                          {/* 중단원 및 소단원 */}
                          <div className="p-2 space-y-2">
                            {chapterGroup.sections.map((section, secIdx) => (
                              <div key={secIdx}>
                                {/* 중단원 헤더 */}
                                <div
                                  className="flex items-center gap-1.5 mb-1 cursor-pointer group"
                                  onClick={() => {
                                    const allSelected = section.topics.every(t => examScope.includes(t));
                                    if (allSelected) {
                                      setExamScope(examScope.filter(t => !section.topics.includes(t)));
                                    } else {
                                      setExamScope([...new Set([...examScope, ...section.topics])]);
                                    }
                                  }}
                                >
                                  <span className="text-[10px] font-medium text-indigo-600 group-hover:text-indigo-800">
                                    {section.section}
                                  </span>
                                  <span className="text-[9px] text-gray-400">
                                    ({section.topics.filter(t => examScope.includes(t)).length}/{section.topics.length})
                                  </span>
                                </div>

                                {/* 소단원 버튼들 */}
                                <div className="flex flex-wrap gap-1 pl-2">
                                  {section.topics.map((topic) => {
                                    const isSelected = examScope.includes(topic);
                                    return (
                                      <button
                                        key={topic}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (isSelected) {
                                            setExamScope(examScope.filter(u => u !== topic));
                                          } else {
                                            setExamScope([...examScope, topic]);
                                          }
                                        }}
                                        className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                                          isSelected
                                            ? 'bg-indigo-100 border-indigo-400 text-indigo-700'
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
                                        }`}
                                      >
                                        {topic}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {examScope.length > 0 && (
                      <p className="mt-2 text-xs text-indigo-600">
                        {examScope.length}개 소단원 선택됨
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
