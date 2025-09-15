import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getSafeAuthToken } from "./auth-utils";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      // Clone the response so we can read it
      const clonedRes = res.clone();
      const jsonResponse = await clonedRes.json();
      errorMessage = jsonResponse.message || JSON.stringify(jsonResponse);
    } catch {
      try {
        const textResponse = await res.text();
        errorMessage = textResponse || res.statusText;
      } catch {
        errorMessage = res.statusText;
      }
    }
    throw new Error(errorMessage);
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
  
  // Add JWT token from localStorage if available
  const token = getSafeAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  if (customHeaders) {
    Object.assign(headers, customHeaders);
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : null,
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
    const token = getSafeAuthToken();
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
      staleTime: 300000, // 5 minutes default
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
