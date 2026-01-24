/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 정적 생성 타임아웃 방지
  staticPageGenerationTimeout: 120,
}

module.exports = nextConfig
