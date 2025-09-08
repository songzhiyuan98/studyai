/**
 * 注册页面
 * 集成注册API的用户注册界面
 */

'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    goal: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不匹配');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '注册失败，请稍后重试');
        return;
      }

      // 注册成功，自动登录
      const loginResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (loginResult?.error) {
        // 注册成功但登录失败，重定向到登录页
        router.push('/login?message=注册成功，请登录');
      } else {
        // 注册并登录成功，重定向到dashboard
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error) {
      setError('注册过程中发生错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard' });
  };
  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-12">
      <div className="max-w-md w-full mx-auto px-6">
        {/* 页面标题 - 与登录页面保持一致的间距 */}
        <div className="text-center mb-10">
          <div className="text-xs font-mono text-gray-400 mb-6 tracking-wider">
            SIGN UP
          </div>
          <h1 className="text-3xl font-light text-black mb-6">
            开始学习
          </h1>
          <p className="text-gray-600 text-lg">
            创建账户，体验AI驱动的个性化学习
          </p>
        </div>

        {/* 注册表单 */}
        <div className="card">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 姓名输入 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-900 mb-2">
                  名字
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 bg-white placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors duration-200"
                  placeholder="张"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-900 mb-2">
                  姓氏
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 bg-white placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors duration-200"
                  placeholder="三"
                  disabled={loading}
                />
              </div>
            </div>

            {/* 邮箱输入 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                邮箱地址
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 bg-white placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors duration-200"
                placeholder="your@example.com"
                disabled={loading}
              />
            </div>

            {/* 密码输入 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 bg-white placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors duration-200"
                placeholder="至少8个字符"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">
                密码应包含字母、数字和特殊字符
              </p>
            </div>

            {/* 确认密码 */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 mb-2">
                确认密码
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 bg-white placeholder-gray-400 focus:outline-none focus:border-green-500 transition-colors duration-200"
                placeholder="再次输入密码"
                disabled={loading}
              />
            </div>

            {/* 学习目标选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                您的主要学习目标
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center p-3 border border-gray-200 rounded hover:border-green-500 transition-colors cursor-pointer">
                  <input 
                    type="radio" 
                    name="goal" 
                    value="academic" 
                    checked={formData.goal === 'academic'}
                    onChange={handleChange}
                    className="text-green-500 focus:ring-green-500"
                    disabled={loading}
                  />
                  <span className="ml-2 text-sm">学术研究</span>
                </label>
                <label className="flex items-center p-3 border border-gray-200 rounded hover:border-green-500 transition-colors cursor-pointer">
                  <input 
                    type="radio" 
                    name="goal" 
                    value="professional" 
                    checked={formData.goal === 'professional'}
                    onChange={handleChange}
                    className="text-green-500 focus:ring-green-500"
                    disabled={loading}
                  />
                  <span className="ml-2 text-sm">职业发展</span>
                </label>
                <label className="flex items-center p-3 border border-gray-200 rounded hover:border-green-500 transition-colors cursor-pointer">
                  <input 
                    type="radio" 
                    name="goal" 
                    value="exam" 
                    checked={formData.goal === 'exam'}
                    onChange={handleChange}
                    className="text-green-500 focus:ring-green-500"
                    disabled={loading}
                  />
                  <span className="ml-2 text-sm">考试准备</span>
                </label>
                <label className="flex items-center p-3 border border-gray-200 rounded hover:border-green-500 transition-colors cursor-pointer">
                  <input 
                    type="radio" 
                    name="goal" 
                    value="personal" 
                    checked={formData.goal === 'personal'}
                    onChange={handleChange}
                    className="text-green-500 focus:ring-green-500"
                    disabled={loading}
                  />
                  <span className="ml-2 text-sm">个人兴趣</span>
                </label>
              </div>
            </div>

            {/* 服务条款 */}
            <div className="flex items-start pt-2">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300 rounded mt-0.5"
              />
              <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                我已阅读并同意{' '}
                <a href="/terms" className="text-green-500 hover:text-green-600">服务条款</a>
                {' '}和{' '}
                <a href="/privacy" className="text-green-500 hover:text-green-600">隐私政策</a>
              </label>
            </div>

            {/* 注册按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '创建中...' : '创建账户'}
            </button>
          </form>

          {/* 第三方注册 */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">或者使用</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={handleGoogleSignIn}
                className="btn-secondary flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </button>

              <button className="btn-secondary flex items-center justify-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.024-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.745.1.12.112.225.081.345-.088.363-.286 1.155-.325 1.317-.05.21-.402.085-.402-.402 0-1.747 1.27-3.448 3.662-3.448 1.927 0 3.425 1.4 3.425 3.267 0 1.95-1.23 3.521-2.939 3.521-.574 0-1.115-.297-1.294-.653 0 0-.283 1.078-.352 1.342-.127.487-.469 1.098-.7 1.472.527.16 1.092.246 1.678.246 6.624 0 11.99-5.367 11.99-11.99C24.007 5.367 18.641.001 12.017.001z"/>
                </svg>
                GitHub
              </button>
            </div>
          </div>

          {/* 登录链接 */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              已有账户？{' '}
              <Link href="/login" className="text-green-500 hover:text-green-600 font-medium">
                立即登录
              </Link>
            </p>
          </div>
        </div>

        {/* 安全承诺 - 与登录页面的功能提示相呼应 */}
        <div className="mt-16 text-center">
          <div className="text-xs font-mono text-gray-400 mb-6 tracking-wider">
            SECURITY COMMITMENT
          </div>
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-2xl mb-3">🔒</div>
              <div className="text-xs text-gray-600">数据加密</div>
            </div>
            <div>
              <div className="text-2xl mb-3">🛡️</div>
              <div className="text-xs text-gray-600">隐私保护</div>
            </div>
            <div>
              <div className="text-2xl mb-3">✅</div>
              <div className="text-xs text-gray-600">学术诚信</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}