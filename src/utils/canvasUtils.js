/**
 * 이미지의 특정 영역을 잘라내어 새로운 Blob 객체로 반환합니다.
 * @param {HTMLImageElement} image - 원본 이미지 엘리먼트
 * @param {Object} crop - 자를 영역 좌표 (react-image-crop에서 제공)
 * @param {string} fileName - 생성될 파일 이름
 * @returns {Promise<Blob>} - 잘린 이미지의 Blob 데이터
 */
export const getCroppedImg = (image, crop, fileName) => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');
  
    // 디바이스 픽셀 비율 고려 (고해상도 디스플레이 대응)
    const pixelRatio = window.devicePixelRatio;
  
    canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
    canvas.height = Math.floor(crop.height * scaleY * pixelRatio);
  
    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';
  
    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;
  
    const centerX = image.naturalWidth / 2;
    const centerY = image.naturalHeight / 2;
  
    ctx.save();
  
    // 캔버스 중심을 기준으로 이동 및 그리기
    ctx.translate(-cropX, -cropY);
    ctx.translate(centerX, centerY);
    ctx.translate(-centerX, -centerY);
    ctx.drawImage(
      image,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight
    );
  
    ctx.restore();
  
    // 캔버스 내용을 Blob으로 변환
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          blob.name = fileName;
          resolve(blob);
        },
        'image/jpeg',
        0.95
      );
    });
  };

/**
 * 이미지 내에서 텍스트 및 콘텐츠가 존재하는 실제 영역(Bounding Box)을 감지합니다.
 * @param {HTMLImageElement} image - 원본 이미지 엘리먼트
 * @returns {Object} - 퍼센트(%) 기준의 Crop 영역 객체 { x, y, width, height }
 */
export const detectContentBounds = (image) => {
  if (!image || !image.naturalWidth || !image.naturalHeight) {
    return { unit: '%', x: 5, y: 5, width: 90, height: 90 };
  }

  try {
    const canvas = document.createElement('canvas');
    // 연산 지연 최소화를 위해 300px 스케일로 다운샘플링하여 스캔
    const scanWidth = 300;
    const scanHeight = Math.round((image.naturalHeight / image.naturalWidth) * scanWidth);

    canvas.width = scanWidth;
    canvas.height = scanHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return { unit: '%', x: 5, y: 5, width: 90, height: 90 };

    ctx.drawImage(image, 0, 0, scanWidth, scanHeight);
    const imgData = ctx.getImageData(0, 0, scanWidth, scanHeight);
    const data = imgData.data;

    // 외곽 테두리 검은 선 등의 노이즈가 영역으로 감지되지 않도록 가장자리 2% 마진 제외
    const marginX = Math.max(1, Math.round(scanWidth * 0.02));
    const marginY = Math.max(1, Math.round(scanHeight * 0.02));

    let minX = scanWidth;
    let maxX = 0;
    let minY = scanHeight;
    let maxY = 0;

    let detectedCount = 0;

    // 스캔한 밝기 임계값 (텍스트/도면 등 어두운 콘텐츠 감지용)
    const threshold = 240; 

    for (let y = marginY; y < scanHeight - marginY; y++) {
      for (let x = marginX; x < scanWidth - marginX; x++) {
        const idx = (y * scanWidth + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        if (a < 50) continue; // 투명 픽셀 패스

        // Luminance 계산
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        if (luminance < threshold) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          detectedCount++;
        }
      }
    }

    // 의미 있는 수준의 데이터가 발견되지 않았을 경우 기본 90% 영역 할당
    if (detectedCount < 10 || minX >= maxX || minY >= maxY) {
      return { unit: '%', x: 5, y: 5, width: 90, height: 90 };
    }

    // 텍스트가 모서리에 걸려 잘리는 현상을 막기 위해 3% 가량의 패딩(Padding) 제공
    const padX = Math.round(scanWidth * 0.03);
    const padY = Math.round(scanHeight * 0.03);

    const finalMinX = Math.max(0, minX - padX);
    const finalMaxX = Math.min(scanWidth, maxX + padX);
    const finalMinY = Math.max(0, minY - padY);
    const finalMaxY = Math.min(scanHeight, maxY + padY);

    // 캔버스 크기 대비 백분율(%)로 치환
    const x = (finalMinX / scanWidth) * 100;
    const y = (finalMinY / scanHeight) * 100;
    const w = ((finalMaxX - finalMinX) / scanWidth) * 100;
    const h = ((finalMaxY - finalMinY) / scanHeight) * 100;

    return {
      unit: '%',
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(w),
      height: Math.round(h)
    };
  } catch (error) {
    console.error("detectContentBounds error:", error);
    return { unit: '%', x: 5, y: 5, width: 90, height: 90 };
  }
};