import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  customHeaders?: Record<string, string>,
): Promise<Response> {
  const headers: Record<string, string> = {};

  if (data) {
    headers["Content-Type"] = "application/json";
  }

  // Add session ID from localStorage if available
  const sessionId = localStorage.getItem('sessionId');
  if (sessionId) {
    headers["X-Session-Id"] = sessionId;
  }

  if (customHeaders) {
    Object.assign(headers, customHeaders);
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};

    // Add JWT token from localStorage if available
    const token = localStorage.getItem('authToken');
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Function to clear all user-specific cache data
export const clearUserCache = () => {
  console.log('Clearing user-specific cache data');
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey[0] as string;
      return queryKey.includes('/api/datasets') || 
             queryKey.includes('/api/folders') || 
             queryKey.includes('/api/stats') ||
             queryKey.includes('/api/user') ||
             queryKey.includes('/api/admin') ||
             queryKey.includes('/api/preload');
    }
  });
  queryClient.removeQueries({
    predicate: (query) => {
      const queryKey = query.queryKey[0] as string;
      return queryKey.includes('/api/datasets') || 
             queryKey.includes('/api/folders') || 
             queryKey.includes('/api/stats') ||
             queryKey.includes('/api/preload');
    }
  });
};