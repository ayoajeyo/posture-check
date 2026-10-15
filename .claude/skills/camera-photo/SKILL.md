---
name: camera-photo
description: 폰 브라우저에서 카메라 촬영·사진 선택·축소·회전 보정·IndexedDB 저장·캔버스에 점/선 그리기·이미지 내보내기 패턴. 측정 사진, 타임스탬프 사진, 배경 제거, 그림판처럼 사진이나 캔버스를 다루는 모든 기능에 사용한다.
---

# 카메라·사진·캔버스

## 촬영 방법 2가지
| 방법 | 쓸 때 | 코드 |
|------|------|------|
| 파일 입력 | 간단, 모든 폰 OK | `<input type="file" accept="image/*" capture="environment">` |
| 실시간 미리보기 | 가이드선을 겹쳐 보여줘야 할 때 | `navigator.mediaDevices.getUserMedia({video:{facingMode:"environment", width:{ideal:1920}}})` |

HTTPS 에서만 된다(GitHub Pages OK, `file://` 로 열면 안 됨 → `python -m http.server` 로 테스트).

## 권한 거부 처리 (필수)
```js
try { stream = await navigator.mediaDevices.getUserMedia(...) }
catch (e) {
  if (e.name === "NotAllowedError") showError("카메라 권한이 꺼져 있습니다. 브라우저 설정에서 허용해 주세요.");
  else showError("카메라를 열 수 없습니다. 사진 선택으로 진행해 주세요.");
  showFileInputFallback();
}
```

## 축소 + 회전 보정 (저장 전 항상)
```js
async function normalizePhoto(file, maxSide = 1600, quality = 0.85) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); // EXIF 회전 반영
  const s = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = Object.assign(document.createElement("canvas"), { width: Math.round(bmp.width*s), height: Math.round(bmp.height*s) });
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return await new Promise(r => c.toBlob(r, "image/jpeg", quality));
}
```
`imageOrientation: "from-image"` 가 없는 옛 브라우저(iOS 15 미만)는 가로로 눕는 사진이 나올 수 있다 → 안내 후 사용자가 회전 버튼으로 보정.

## 저장
- Blob 은 **IndexedDB** 에 (localStorage 는 5MB 한계·문자열만).
- 작은 래퍼 하나로 통일: `js/store.js` 의 `photos.put(id, blob)`, `photos.get(id)`, `photos.delete(id)`.
- 저장 공간 확인: `navigator.storage.estimate()` → 90% 넘으면 경고. `navigator.storage.persist()` 요청으로 브라우저가 임의 삭제하지 않게.

## 캔버스에 점·선·글자 (측정·타임스탬프)
- 사진 위에 `<canvas>` 를 겹치고 좌표는 **사진 원본 픽셀 기준**으로 저장한다(화면 크기와 무관하게 재현).
- 터치 좌표 변환: `(touch.clientX - rect.left) * (canvas.width / rect.width)`.
- 점은 반지름 6px 원 + 2px 흰 테두리(사진 위에서 보이게). 선은 2px, 네이비. 각도 글자는 흰 배경 박스 위에.
- 손가락으로 가려지는 문제: 점을 손가락보다 위로 24px 띄워 미리보기(돋보기) 표시.
- 내보내기: 사진 + 표시를 한 캔버스에 합쳐 `toBlob` → 공유.

## 공유 (카카오톡 등)
```js
const file = new File([blob], `${name}_2026.10.14.jpg`, { type: "image/jpeg" });
if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title });
else downloadBlob(blob, file.name); // PC·미지원 브라우저
```

## 개인정보
- 미리보기 스트림은 화면을 떠날 때 반드시 `track.stop()`.
- 사진 Blob 을 `console.log` 하지 않는다. URL.createObjectURL 은 쓰고 나서 `revokeObjectURL`.
- 촬영 전 동의 여부(`photoConsentAt`) 확인. 없으면 촬영 버튼을 비활성 + 안내.
