# GitHub 저장소 푸시 가이드

## 1. GitHub 저장소 생성

1. [GitHub](https://github.com)에 접속하여 로그인
2. 우측 상단의 "+" 버튼 클릭 → "New repository" 선택
3. 저장소 정보 입력:
   - Repository name: `cookka` (또는 원하는 이름)
   - Description: "팀 협업형 도시락 비즈니스 관리 웹앱"
   - Visibility: Public 또는 Private 선택
   - **"Initialize this repository with a README" 체크 해제** (이미 파일이 있으므로)
4. "Create repository" 클릭

## 2. 로컬 저장소와 GitHub 연결

GitHub에서 제공하는 명령어를 실행하세요. 예시:

```bash
git remote add origin https://github.com/Yeongwoo-seo/Cookka.git
git branch -M main
git push -u origin main
```

**참고**: 저장소 URL: https://github.com/Yeongwoo-seo/Cookka

## 3. 인증 방법

### 방법 1: Personal Access Token (권장)

1. GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
2. "Generate new token" 클릭
3. 권한 선택: `repo` (전체 저장소 접근)
4. 토큰 생성 후 복사
5. 푸시 시 비밀번호 대신 토큰 사용

### 방법 2: SSH 키 사용

```bash
# SSH 키 생성 (이미 있다면 생략)
ssh-keygen -t ed25519 -C "your_email@example.com"

# 공개 키 복사
cat ~/.ssh/id_ed25519.pub

# GitHub > Settings > SSH and GPG keys > New SSH key에 추가
```

## 4. 푸시 명령어

```bash
# 원격 저장소 추가 (GitHub에서 제공하는 URL 사용)
git remote add origin https://github.com/Yeongwoo-seo/Cookka.git

# 기본 브랜치를 main으로 설정
git branch -M main

# GitHub에 푸시
git push -u origin main
```

## 5. 환경 변수 보호

**중요**: `.env.local` 파일은 절대 GitHub에 푸시하지 마세요!

`.gitignore`에 이미 포함되어 있지만 확인:
- `.env.local` 파일이 커밋되지 않았는지 확인
- GitHub에 민감한 정보가 노출되지 않았는지 확인

## 6. 이후 업데이트

코드를 변경한 후:

```bash
git add .
git commit -m "변경 사항 설명"
git push
```

## 문제 해결

### "remote origin already exists" 오류
```bash
git remote remove origin
git remote add origin https://github.com/Yeongwoo-seo/Cookka.git
```

### 인증 오류
- Personal Access Token 사용 확인
- 또는 SSH 키 설정 확인
