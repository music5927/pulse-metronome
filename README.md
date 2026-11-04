# Pulse 메트로놈

브라우저에서 작동하는 전자 메트로놈입니다. 별도의 빌드 과정이나 서버가 필요 없는 정적 웹 앱입니다.

## 기능

- BPM 40–240: 직접 입력, 슬라이더, ±1 조절
- Web Audio API 기반 클릭음 및 강박 악센트
- 2–8박, 2/4/8분음표 설정
- 볼륨·음소거, 빠른 템포 프리셋, 탭 템포
- 스페이스바 재생/정지
- 마지막 설정값 브라우저 저장

## 로컬 실행

```bash
cd metronome-web
python3 -m http.server 4173
```

그 후 `http://localhost:4173`을 엽니다.

## GitHub Pages 배포

이 저장소에는 `.github/workflows/deploy-pages.yml`가 포함되어 있습니다.

1. GitHub에 새 저장소를 만들고 이 프로젝트를 `main` 브랜치로 푸시합니다.
2. 저장소의 **Settings → Pages → Build and deployment**에서 **GitHub Actions**를 선택합니다.
3. `main` 브랜치에 푸시할 때마다 Actions가 Pages를 배포합니다.
4. 배포 주소는 **Actions** 실행 결과 또는 **Settings → Pages**에서 확인합니다.

> 오디오 재생은 브라우저 정책상 사용자가 ‘시작’ 버튼을 누른 뒤에만 동작합니다.
