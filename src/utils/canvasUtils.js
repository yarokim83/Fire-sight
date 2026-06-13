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
  
    let cropX = crop.x;
    let cropY = crop.y;
    let cropWidth = crop.width;
    let cropHeight = crop.height;

    // 만약 crop이 퍼센트 단위인 경우 픽셀 단위로 변환
    if (crop.unit === '%' || (crop.x <= 100 && crop.y <= 100 && crop.width <= 100 && crop.height <= 100 && !crop.unit)) {
        cropX = (crop.x / 100) * image.width;
        cropY = (crop.y / 100) * image.height;
        cropWidth = (crop.width / 100) * image.width;
        cropHeight = (crop.height / 100) * image.height;
    }
  
    const targetWidth = Math.floor(cropWidth * scaleX);
    const targetHeight = Math.floor(cropHeight * scaleY);

    if (targetWidth <= 0 || targetHeight <= 0) {
        return Promise.reject(new Error('선택된 영역의 크기가 너무 작거나 올바르지 않습니다.'));
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
  
    ctx.imageSmoothingQuality = 'high';
  
    const finalCropX = cropX * scaleX;
    const finalCropY = cropY * scaleY;
  
    // drawImage의 source 파라미터를 활용해 1:1 영역 렌더링
    ctx.drawImage(
      image,
      finalCropX,
      finalCropY,
      targetWidth,
      targetHeight,
      0,
      0,
      targetWidth,
      targetHeight
    );
  
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
 * @param {string} mode - 'problem' (지문) 또는 'answer' (해설)
 * @returns {Object} - 퍼센트(%) 기준의 Crop 영역 객체 { x, y, width, height }
 */
export const detectContentBounds = (image, mode = 'problem') => {
  if (!image || !image.naturalWidth || !image.naturalHeight) {
    return { unit: '%', x: 5, y: 5, width: 90, height: 90 };
  }

  try {
    const canvas = document.createElement('canvas');
    // 해상도 향상 및 텍스트/여백 라인의 선명성 보존을 위해 600px 스케일로 다운샘플링
    const scanWidth = 600;
    const scanHeight = Math.round((image.naturalHeight / image.naturalWidth) * scanWidth);

    canvas.width = scanWidth;
    canvas.height = scanHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return { unit: '%', x: 5, y: 5, width: 90, height: 90 };

    ctx.drawImage(image, 0, 0, scanWidth, scanHeight);
    const imgData = ctx.getImageData(0, 0, scanWidth, scanHeight);
    const data = imgData.data;

    // 1. 이미지의 동적 배경 밝기(bgL) 추정
    const sampledLuminances = [];
    for (let i = 0; i < data.length; i += 80) { 
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a >= 50) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        sampledLuminances.push(lum);
      }
    }
    sampledLuminances.sort((a, b) => b - a);
    const bgL = sampledLuminances[Math.floor(sampledLuminances.length * 0.05)] || 255;
    
    // 어두운 텍스트 임계치 (배경 밝기 대비 15% 이상 어두우면 글씨)
    const textThreshold = bgL * 0.85; 

    // 외곽 테두리 2% 마진 제외
    const marginX = Math.max(1, Math.round(scanWidth * 0.02));
    const marginY = Math.max(1, Math.round(scanHeight * 0.02));

    // 2. 수평 투영 프로파일 (행별 텍스트 픽셀 밀도 계산)
    const rowDensities = new Array(scanHeight).fill(0);
    for (let y = marginY; y < scanHeight - marginY; y++) {
      let textPixelCount = 0;
      for (let x = marginX; x < scanWidth - marginX; x++) {
        const idx = (y * scanWidth + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        if (a < 50) continue;

        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum < textThreshold) {
          textPixelCount++;
        }
      }
      rowDensities[y] = textPixelCount;
    }

    // 3. 여백 행(Blank Line) 판단
    // 가로 한 줄에 텍스트 픽셀이 600px 중 5px 이하(약 0.8%)인 경우를 확실한 여백 행으로 간주
    const blankThreshold = Math.max(2, Math.round(scanWidth * 0.008)); 
    const isBlankRow = new Array(scanHeight).fill(true);
    for (let y = marginY; y < scanHeight - marginY; y++) {
      if (rowDensities[y] > blankThreshold) {
        isBlankRow[y] = false;
      }
    }

    // 세로 방향 빈 여백 구간(Gaps) 탐색
    const gaps = [];
    let inGap = false;
    let gapStart = 0;

    for (let y = marginY; y < scanHeight - marginY; y++) {
      if (isBlankRow[y]) {
        if (!inGap) {
          gapStart = y;
          inGap = true;
        }
      } else {
        if (inGap) {
          const gapHeight = y - gapStart;
          // 일반 자잘한 폰트 획 사이 간격(5px 이하)은 줄간격 여백으로 보고 배제
          // 600px 해상도에서 문단/해설 분할 여백은 최소 6px 이상임
          if (gapHeight >= 6) {
            gaps.push({ start: gapStart, end: y - 1, height: gapHeight });
          }
          inGap = false;
        }
      }
    }
    if (inGap) {
      const gapHeight = (scanHeight - marginY) - gapStart;
      if (gapHeight >= 6) {
        gaps.push({ start: gapStart, end: scanHeight - marginY - 1, height: gapHeight });
      }
    }

    // 4. 큰 문단 분할 여백 탐색
    // 수집된 gaps 중 가장 세로폭(height)이 넓은 상위 3개를 추려 Y축 순으로 정렬
    const sortedGaps = [...gaps].sort((a, b) => b.height - a.height);
    const significantGaps = sortedGaps.slice(0, 3);
    significantGaps.sort((a, b) => a.start - b.start);

    let dividerY1 = 0; 
    let dividerY2 = scanHeight - marginY;

    if (significantGaps.length >= 2) {
      // 2개 이상의 문단 여백이 뚜렷하게 존재할 때
      const gap1 = significantGaps[0];
      const gap2 = significantGaps[1];

      dividerY1 = Math.round((gap1.start + gap1.end) / 2);
      dividerY2 = Math.round((gap2.start + gap2.end) / 2);
    } else if (significantGaps.length === 1) {
      // 1개의 문단 여백만 있을 때
      const gap1 = significantGaps[0];
      dividerY1 = Math.round((gap1.start + gap1.end) / 2);
      dividerY2 = scanHeight - marginY;
    } else {
      // 여백 탐지 실패 시 폴백
      dividerY1 = 0;
      dividerY2 = scanHeight - marginY;
    }

    // 5. 모드별 크롭 범위 제한
    let limitMinY = marginY;
    let limitMaxY = scanHeight - marginY;

    if (mode === 'problem') {
      limitMinY = marginY;
      limitMaxY = dividerY1 > 0 ? dividerY1 : (scanHeight - marginY);
    } else {
      limitMinY = dividerY1 > 0 ? dividerY1 : marginY;
      limitMaxY = dividerY2 > dividerY1 ? dividerY2 : (scanHeight - marginY);
    }

    // 6. 제한된 Y 영역 안에서 텍스트가 있는 실제 바운딩 박스 계산
    let finalMinX = scanWidth;
    let finalMaxX = 0;
    let finalMinY = scanHeight;
    let finalMaxY = 0;
    let foundPixels = 0;

    for (let y = limitMinY; y < limitMaxY; y++) {
      for (let x = marginX; x < scanWidth - marginX; x++) {
        const idx = (y * scanWidth + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        if (a < 50) continue;

        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum < textThreshold) {
          if (x < finalMinX) finalMinX = x;
          if (x > finalMaxX) finalMaxX = x;
          if (y < finalMinY) finalMinY = y;
          if (y > finalMaxY) finalMaxY = y;
          foundPixels++;
        }
      }
    }

    if (foundPixels < 10 || finalMinX >= finalMaxX || finalMinY >= finalMaxY) {
      // 텍스트 검출 실패 시 폴백
      return { unit: '%', x: 5, y: 5, width: 90, height: 90 };
    }

    // 여백 패딩 적용
    const padX = Math.round(scanWidth * (mode === 'problem' ? 0.03 : 0.02));
    const padY = Math.round(scanHeight * (mode === 'problem' ? 0.03 : 0.02));

    const finalX = Math.max(0, finalMinX - padX);
    const finalW = Math.min(scanWidth, finalMaxX + padX) - finalX;
    const finalY = Math.max(limitMinY, finalMinY - padY);
    const finalH = Math.min(limitMaxY, finalMaxY + padY) - finalY;

    return {
      unit: '%',
      x: Math.round((finalX / scanWidth) * 100),
      y: Math.round((finalY / scanHeight) * 100),
      width: Math.round((finalW / scanWidth) * 100),
      height: Math.round((finalH / scanHeight) * 100)
    };
  } catch (error) {
    console.error("detectContentBounds error:", error);
    return { unit: '%', x: 5, y: 5, width: 90, height: 90 };
  }
};