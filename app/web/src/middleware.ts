/**
 * NextAuth.js 中间件
 * 保护需要认证的路由
 */

export { default } from 'next-auth/middleware';

// 配置受保护的路由
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/upload/:path*',
    '/library/:path*',
    '/study/:path*',
    '/review/:path*',
    '/exam/:path*',
  ],
};