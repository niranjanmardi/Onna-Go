const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('onnago_token') || localStorage.getItem('rupaii_token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Normalize endpoint URL
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Sends HttpOnly session cookies
  });

  if (!response.ok) {
    let errorDetail = 'An unexpected error occurred';
    let errorData = null;
    try {
      errorData = await response.json();
      if (typeof errorData.detail === 'string') {
        errorDetail = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        errorDetail = errorData.detail.map((err: any) => err.msg || JSON.stringify(err)).join(', ');
      }
    } catch {
      errorDetail = response.statusText || `Request failed with status ${response.status}`;
    }

    if (
      response.status === 401 &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/register') &&
      !endpoint.includes('/auth/me')
    ) {
      // Token expired or invalid
      localStorage.removeItem('onnago_token');
      localStorage.removeItem('onnago_user');
      localStorage.removeItem('rupaii_token');
      localStorage.removeItem('rupaii_user');
      const publicPaths = ['/', '/login', '/register', '/forgot-password'];
      const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
      if (!publicPaths.includes(currentPath)) {
        window.location.href = '/login?expired=true';
      }
    }

    throw new ApiError(response.status, errorDetail, errorData);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  uploadFile: async (endpoint: string, file: File): Promise<any> => {
    const token = localStorage.getItem('onnago_token') || localStorage.getItem('rupaii_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const formData = new FormData();
    formData.append('file', file);

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new ApiError(response.status, err.detail || 'Upload failed');
    }
    return response.json();
  },
};

export function getAvatarUrl(avatarUrl?: string | null): string | undefined {
  if (!avatarUrl) return undefined;
  if (
    avatarUrl.startsWith('http://') ||
    avatarUrl.startsWith('https://') ||
    avatarUrl.startsWith('data:') ||
    avatarUrl.startsWith('blob:')
  ) {
    return avatarUrl;
  }
  if (avatarUrl.startsWith('/api/')) {
    if (API_BASE_URL.startsWith('http')) {
      try {
        const parsedBase = new URL(API_BASE_URL);
        return `${parsedBase.origin}${avatarUrl}`;
      } catch {
        // Fallback
      }
    }
  }
  return avatarUrl;
}

