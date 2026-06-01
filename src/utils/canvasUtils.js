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
export const detectContentBounds = (image, mode = 'problem') => {
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

    // 1. 회색 배경 박스 영역 검출 (Answer 모드이거나 Problem 모드에서 경계선 잡을 때 사용)
    // 연한 회색 조건: R, G, B가 모두 230 이상 250 이하이며, RGB 간의 편차가 매우 작음 (채도가 0에 수렴)
    let grayMinX = scanWidth;
    let grayMaxX = 0;
    let grayMinY = scanHeight;
    let grayMaxY = 0;
    let grayDetectedCount = 0;

    for (let y = marginY; y < scanHeight - marginY; y++) {
      for (let x = marginX; x < scanWidth - marginX; x++) {
        const idx = (y * scanWidth + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        if (a < 50) continue; // 투명 패스

        const diffRG = Math.abs(r - g);
        const diffGB = Math.abs(g - b);
        const diffBR = Math.abs(b - r);
        const isGrayTone = (r >= 230 && r <= 250) && (g >= 230 && g <= 250) && (b >= 230 && b <= 250) && 
                           (diffRG <= 4 && diffGB <= 4 && diffBR <= 4);

        if (isGrayTone) {
          if (x < grayMinX) grayMinX = x;
          if (x > grayMaxX) grayMaxX = x;
          if (y < grayMinY) grayMinY = y;
          if (y > grayMaxY) grayMaxY = y;
          grayDetectedCount++;
        }
      }
    }

    if (mode === 'answer') {
      // 해설 모드: 감지된 회색 박스 영역이 충분히 크다면 이를 크롭 범위로 즉시 반환
      if (grayDetectedCount > 150 && grayMinX < grayMaxX && grayMinY < grayMaxY) {
        const padX = Math.round(scanWidth * 0.02);
        const padY = Math.round(scanHeight * 0.02);

        const finalMinX = Math.max(0, grayMinX - padX);
        const finalMaxX = Math.min(scanWidth, grayMaxX + padX);
        const finalMinY = Math.max(0, grayMinY - padY);
        const finalMaxY = Math.min(scanHeight, grayMaxY + padY);

        return {
          unit: '%',
          x: Math.round((finalMinX / scanWidth) * 100),
          y: Math.round((finalMinY / scanHeight) * 100),
          width: Math.round(((finalMaxX - finalMinX) / scanWidth) * 100),
          height: Math.round(((finalMaxY - finalMinY) / scanHeight) * 100)
        };
      }
      // 회색 박스 검출 실패 시 일반 어두운 픽셀(텍스트) 검출 로직(아래)으로 전환
    }

    // 2. 지문 모드(Problem) 혹은 해설 모드 내 회색 박스 감출 실패 시 텍스트 감출
    // 지문 모드이고 회색 박스가 발견되었다면, 스캔 높이 한계를 회색 박스 상단선 위로 제약
    let scanLimitY = scanHeight - marginY;
    if (mode === 'problem' && grayDetectedCount > 150 && grayMinY < scanHeight) {
      scanLimitY = Math.max(marginY + 10, grayMinY - 2); 
    }

    const threshold = 240; // 텍스트 감출 임계치

    for (let y = marginY; y < scanLimitY; y++) {
      for (let x = marginX; x < scanWidth - marginX; x++) {
        const idx = (y * scanWidth + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        if (a < 50) continue;

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

    if (detectedCount < 10 || minX >= maxX || minY >= maxY) {
      return { unit: '%', x: 5, y: 5, width: 90, height: 90 };
    }

    const padX = Math.round(scanWidth * 0.03);
    const padY = Math.round(scanHeight * 0.03);

    const finalMinX = Math.max(0, minX - padX);
    const finalMaxX = Math.min(scanWidth, maxX + padX);
    const finalMinY = Math.max(0, minY - padY);
    const finalMaxY = Math.min(scanLimitY, maxY + padY);

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