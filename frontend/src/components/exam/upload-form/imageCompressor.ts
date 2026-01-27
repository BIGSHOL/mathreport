/**
 * Image compression utility for exam file uploads.
 * Resizes and converts images to JPEG format to reduce file size.
 */

// 이미지 압축 설정
export const COMPRESS_CONFIG = {
  maxWidth: 1600,      // 최대 너비
  maxHeight: 2400,     // 최대 높이
  quality: 0.85,       // JPEG 품질 (0-1)
  maxSizeKB: 500,      // 목표 최대 크기 (KB)
};

/**
 * 이미지 파일 압축 (리사이즈 + JPEG 변환)
 */
export async function compressImage(file: File): Promise<File> {
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
export async function compressFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map(compressImage));
}
