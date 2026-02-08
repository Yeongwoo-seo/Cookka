/** @type {import('next').NextConfig} */
const { execSync } = require('child_process');

// 빌드 시점에 커밋 정보 가져오기
function getCommitInfo() {
  try {
    const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    const commitDate = execSync('git log -1 --format="%ci" --date=format:"%Y-%m-%d %H:%M:%S"', { encoding: 'utf-8' }).trim();
    return { commitHash, commitDate };
  } catch (error) {
    // git이 없거나 에러가 발생하면 기본값 사용
    return { commitHash: 'dev', commitDate: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().slice(0, 8) };
  }
}

const { commitHash, commitDate } = getCommitInfo();

const nextConfig = {
  reactStrictMode: true,
  // 정적 생성 타임아웃 방지
  staticPageGenerationTimeout: 120,
  env: {
    NEXT_PUBLIC_COMMIT_HASH: commitHash,
    NEXT_PUBLIC_COMMIT_DATE: commitDate,
  },
}

module.exports = nextConfig
