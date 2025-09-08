/**
 * 共享工具函数
 * 提供整个应用程序中使用的通用工具方法
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 样式类名合并工具
 * 用于Tailwind CSS类名的智能合并
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 延迟执行函数
 * @param ms 延迟时间(毫秒)
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 防抖函数
 * @param func 要防抖的函数
 * @param wait 延迟时间(毫秒)
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * 节流函数
 * @param func 要节流的函数
 * @param limit 时间间隔(毫秒)
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @param decimals 小数位数
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 格式化数字为可读形式
 * @param num 数字
 * @param locale 区域设置
 */
export function formatNumber(num: number, locale: string = 'zh-CN'): string {
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * 计算文本的词元数量(估算)
 * 对中文和英文使用不同的计算方式
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  
  // 检测是否包含中文字符
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  
  if (hasChinese) {
    // 中文：大约每个字符0.7个token
    return Math.ceil(text.length * 0.7);
  } else {
    // 英文：大约每4个字符1个token
    return Math.ceil(text.length / 4);
  }
}

/**
 * 生成唯一的哈希值
 * 用于内容去重
 */
export function generateContentHash(content: string): string {
  // 简单的哈希函数实现
  let hash = 0;
  if (content.length === 0) return hash.toString();
  
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * 文本截断函数
 * @param text 原始文本
 * @param maxLength 最大长度
 * @param suffix 后缀(如"...")
 */
export function truncateText(
  text: string, 
  maxLength: number, 
  suffix: string = '...'
): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * 提取文本预览
 * @param text 完整文本
 * @param maxLength 最大长度
 */
export function getTextPreview(text: string, maxLength: number = 200): string {
  // 清理文本：移除多余的空白字符
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  if (cleanText.length <= maxLength) return cleanText;
  
  // 在单词边界截断
  const truncated = cleanText.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.slice(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * 验证文件类型
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  return fileExtension ? allowedTypes.includes(fileExtension) : false;
}

/**
 * 验证文件大小
 */
export function validateFileSize(file: File, maxSizeInBytes: number): boolean {
  return file.size <= maxSizeInBytes;
}

/**
 * 时间格式化函数
 */
export function formatTimeAgo(date: Date, locale: string = 'zh-CN'): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  const intervals = [
    { label: locale === 'zh-CN' ? '年' : 'year', seconds: 31536000 },
    { label: locale === 'zh-CN' ? '个月' : 'month', seconds: 2592000 },
    { label: locale === 'zh-CN' ? '天' : 'day', seconds: 86400 },
    { label: locale === 'zh-CN' ? '小时' : 'hour', seconds: 3600 },
    { label: locale === 'zh-CN' ? '分钟' : 'minute', seconds: 60 }
  ];
  
  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count > 0) {
      return locale === 'zh-CN' 
        ? `${count}${interval.label}前`
        : `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
  }
  
  return locale === 'zh-CN' ? '刚刚' : 'just now';
}

/**
 * 生成随机ID
 */
export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 深度克隆对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  if (typeof obj === 'object') {
    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  return obj;
}

/**
 * 对象键值对互换
 */
export function flipObject<T extends Record<string, string>>(
  obj: T
): { [K in keyof T as T[K]]: K } {
  const flipped = {} as any;
  for (const key in obj) {
    flipped[obj[key]] = key;
  }
  return flipped;
}

/**
 * 数组分块
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * 数组去重
 */
export function uniqueArray<T>(array: T[], key?: keyof T): T[] {
  if (!key) {
    return [...new Set(array)];
  }
  
  const seen = new Set();
  return array.filter(item => {
    const keyValue = item[key];
    if (seen.has(keyValue)) {
      return false;
    }
    seen.add(keyValue);
    return true;
  });
}

/**
 * 安全的JSON解析
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * 计算相似度(简单版)
 * 使用编辑距离算法
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0 || len2 === 0) return 0;
  
  const matrix: number[][] = [];
  
  // 初始化矩阵
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [];
    matrix[i][0] = i;
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // 填充矩阵
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // 替换
          matrix[i][j - 1] + 1,     // 插入
          matrix[i - 1][j] + 1      // 删除
        );
      }
    }
  }
  
  const maxLen = Math.max(len1, len2);
  return (maxLen - matrix[len1][len2]) / maxLen;
}

/**
 * 颜色工具函数
 */
export const colorUtils = {
  /**
   * 十六进制转RGB
   */
  hexToRgb: (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  },
  
  /**
   * RGB转十六进制
   */
  rgbToHex: (r: number, g: number, b: number) => {
    return "#" + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join("");
  },
  
  /**
   * 根据背景色获取最佳文本颜色
   */
  getTextColor: (backgroundColor: string) => {
    const rgb = colorUtils.hexToRgb(backgroundColor);
    if (!rgb) return '#000000';
    
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return brightness > 155 ? '#000000' : '#ffffff';
  }
};

/**
 * URL工具函数
 */
export const urlUtils = {
  /**
   * 构建查询字符串
   */
  buildQuery: (params: Record<string, any>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    }
    return query.toString();
  },
  
  /**
   * 解析查询字符串
   */
  parseQuery: (queryString: string) => {
    const params = new URLSearchParams(queryString);
    const result: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    return result;
  }
};