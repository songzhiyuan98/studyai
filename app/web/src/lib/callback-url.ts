const DEFAULT_CALLBACK_URL = '/dashboard';

export function sanitizeCallbackUrl(input: string | null | undefined): string {
  if (!input) {
    return DEFAULT_CALLBACK_URL;
  }

  if (!input.startsWith('/') || input.startsWith('//')) {
    return DEFAULT_CALLBACK_URL;
  }

  return input;
}
