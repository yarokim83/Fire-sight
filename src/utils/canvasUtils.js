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
 * @param {string} mode - 'problem' (지문) 또는 'answer' (해설)
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

    // 1. 이미지의 동적 배경 밝기(bgL) 추정
    const sampledLuminances = [];
    for (let i = 0; i < data.length; i += 40) { 
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
    
    // 어두운 텍스트 임계치 (배경 밝기 비례)
    const textThreshold = bgL * 0.86; 

    // 외곽 테두리 노이즈 차단을 위한 좌우/상하 마진 제외 (2%)
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

    // 3. 여백 행(Blank Line) 식별 및 연속성(Gaps) 계산
    // 300px 너비 기준, 가로 한 줄에 텍스트 판정 픽셀이 2px 이하면 여백 행으로 판단
    const blankThreshold = Math.max(1, Math.round(scanWidth * 0.007)); 
    const isBlankRow = new Array(scanHeight).fill(true);
    for (let y = marginY; y < scanHeight - marginY; y++) {
      if (rowDensities[y] > blankThreshold) {
        isBlankRow[y] = false;
      }
    }

    // 세로 방향 빈 공간(여백 구간) 탐색
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
          // 일반 줄간 여백 노이즈를 배제하기 위해 높이가 최소 3px 이상인 의미 있는 여백만 수집
          if (gapHeight >= 3) {
            gaps.push({ start: gapStart, end: y - 1, height: gapHeight });
          }
          inGap = false;
        }
      }
    }
    if (inGap) {
      const gapHeight = (scanHeight - marginY) - gapStart;
      if (gapHeight >= 3) {
        gaps.push({ start: gapStart, end: scanHeight - marginY - 1, height: gapHeight });
      }
    }

    // 4. 문단 가르기 여백 식별 (가장 높이가 큰 여백 상위 3개를 Y좌표 순으로 수집)
    const sortedGaps = [...gaps].sort((a, b) => b.height - a.height);
    const significantGaps = sortedGaps.slice(0, 3);
    significantGaps.sort((a, b) => a.start - b.start);

    let dividerY1 = 0; // 지문-해설 분할 경계 Y
    let dividerY2 = scanHeight - marginY; // 해설-다음문제 분할 경계 Y

    if (significantGaps.length >= 2) {
      // 2개 이상의 의미 있는 큰 여백이 검출됨 (지문-해설 경계, 해설-다음문제 경계 순)
      const gap1 = significantGaps[0];
      const gap2 = significantGaps[1];

      dividerY1 = Math.round((gap1.start + gap1.end) / 2);
      dividerY2 = Math.round((gap2.start + gap2.end) / 2);
    } else if (significantGaps.length === 1) {
      // 의미 있는 큰 여백이 단 1개만 검출된 경우 (한 문제만 인쇄된 페이지)
      const gap1 = significantGaps[0];
      dividerY1 = Math.round((gap1.start + gap1.end) / 2);
      dividerY2 = scanHeight - marginY;
    } else {
      // 분할 여백 검출 실패 시 폴백
      dividerY1 = 0;
      dividerY2 = scanHeight - marginY;
    }

    // 5. 모드별 크롭 상자 바운딩 박스(Bounding Box) 계산
    let limitMinY = marginY;
    let limitMaxY = scanHeight - marginY;

    if (mode === 'problem') {
      limitMinY = marginY;
      limitMaxY = dividerY1 > 0 ? dividerY1 : (scanHeight - marginY);
    } else {
      limitMinY = dividerY1 > 0 ? dividerY1 : marginY;
      limitMaxY = dividerY2 > dividerY1 ? dividerY2 : (scanHeight - marginY);
    }

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
      return { unit: '%', x: 5, y: 5, width: 90, height: 90 };
    }

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