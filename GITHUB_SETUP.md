# GitHub 저장소 푸시 가이드

## 현재 상황
Git 저장소 초기화에 문제가 있어 수동으로 진행해야 합니다.

## 해결 방법

### 방법 1: 터미널에서 직접 실행

1. **프로젝트 폴더로 이동**
   ```bash
   cd "C:\Users\kjaso\OneDrive\Desktop\Projects\3. Cookka"
   ```

2. **Git 초기화 (기존 .git 폴더가 있다면 삭제 후)**
   ```bash
   # .git 폴더가 있다면 삭제
   Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue
   
   # Git 초기화
   git init
   ```

3. **파일 추가 및 커밋**
   ```bash
   git add .
   git commit -m "Initial commit: Cookka recipe management app with Firebase integration"
   ```

4. **GitHub 저장소 생성**
   - [GitHub](https://github.com) 접속
   - "+" 버튼 → "New repository"
   - 저장소 이름: `cookka`
   - **"Initialize with README" 체크 해제**
   - "Create repository" 클릭

5. **원격 저장소 연결 및 푸시**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/cookka.git
   git branch -M main
   git push -u origin main
   ```

### 방법 2: GitHub Desktop 사용 (GUI - 더 쉬움)

1. **GitHub Desktop 설치**
   - [desktop.github.com](https://desktop.github.com)에서 다운로드

2. **저장소 추가**
   - File > Add Local Repository
   - 프로젝트 폴더 선택: `C:\Users\kjaso\OneDrive\Desktop\Projects\3. Cookka`

3. **커밋 및 푸시**
   - 변경사항 확인 후 "Commit to main" 클릭
   - "Publish repository" 클릭하여 GitHub에 업로드

### 방법 3: VS Code Git 기능 사용

1. **VS Code에서 Git 초기화**
   - Source Control 탭 (Ctrl+Shift+G)
   - "Initialize Repository" 클릭

2. **커밋**
   - 변경사항 스테이징
   - 커밋 메시지 입력
   - "Commit" 클릭

3. **GitHub에 푸시**
   - "Publish Branch" 클릭
   - GitHub 저장소 생성 및 푸시

## 중요 사항

### 환경 변수 보호
`.env.local` 파일은 절대 GitHub에 푸시하지 마세요!

확인 방법:
```bash
git check-ignore .env.local
```
이 명령어가 `.env.local`을 출력하면 정상입니다 (무시됨).

### 푸시 전 확인
다음 파일들이 커밋되지 않았는지 확인:
- `.env.local` (환경 변수)
- `node_modules/` (의존성)
- `.next/` (빌드 파일)

## 인증 설정

### Personal Access Token 사용 (권장)

1. GitHub > Settings > Developer settings > Personal access tokens
2. "Generate new token (classic)" 클릭
3. 권한: `repo` 선택
4. 토큰 생성 후 복사
5. 푸시 시 비밀번호 대신 토큰 사용

## 문제 해결

### "Permission denied" 오류
- `.git` 폴더 권한 확인
- 관리자 권한으로 터미널 실행

### "remote origin already exists" 오류
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/cookka.git
```

### 인증 오류
- Personal Access Token 사용
- 또는 SSH 키 설정
