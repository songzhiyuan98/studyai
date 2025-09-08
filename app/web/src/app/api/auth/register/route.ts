/**
 * 用户注册 API 端点
 * 处理邮箱密码注册请求
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@study-assistant/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// 注册请求验证模式
const registerSchema = z.object({
  email: z.string().email('请输入有效邮箱地址'),
  password: z.string()
    .min(6, '密码至少6个字符')
    .max(128, '密码不能超过128个字符'),
  name: z.string().min(1, '请输入姓名').optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, firstName, lastName, ...rest } = registerSchema.parse(body);

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 400 }
      );
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 组合姓名
    const name = rest.name || (firstName && lastName ? `${lastName}${firstName}` : firstName || lastName) || null;

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'STUDENT',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      }
    });

    // 为新用户创建默认文件夹
    await prisma.folder.create({
      data: {
        name: '通用文档',
        description: '默认文件夹',
        userId: user.id,
      }
    });

    return NextResponse.json({
      message: '注册成功',
      user,
    });

  } catch (error) {
    console.error('Registration error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入验证失败', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}