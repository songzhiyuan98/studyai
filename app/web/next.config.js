/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用实验性功能
  experimental: {
    // 支持服务器组件
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
  
  // TypeScript配置
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ESLint配置
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // 图片优化配置
  images: {
    domains: ['localhost'],
  },
  
  // 环境变量
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // 重定向配置
  async redirects() {
    return [
      // 可以在这里添加其他重定向规则
    ];
  },
  
  // 开发环境配置
  ...(process.env.NODE_ENV === 'development' && {
    // 开发时的特殊配置
    reactStrictMode: true,
  }),
};

module.exports = nextConfig;