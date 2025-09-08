/**
 * NextAuth.js API Route Handler
 * 使用集中化的认证配置
 */

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };