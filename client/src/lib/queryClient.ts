import { QueryClient } from "@tanstack/react-query";

// __PORT_5000__ is replaced by deploy_website with the actual proxy path
const PORT_PLACEHOLDER = "__PORT_5000__";
export const API_BASE = PORT_PLACEHOLDER.startsWith("__")
  ? ""
  : PORT_PLACEHOLDER;

export async function apiRequest(
  method: string,
  url: string,
  body?: unknown
): Promise<Response> {
  const fullUrl = `${API_BASE}${url}`;
  const res = await fetch(fullUrl, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res;
}

const defaultQueryFn = async ({ queryKey }: { queryKey: readonly unknown[] }) => {
  const key = queryKey[0] as string;
  const url = queryKey.length > 1
    ? `${key}/${queryKey.slice(1).join("/")}`
    : key;
  const res = await fetch(`${API_BASE}${url}`);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    },
  },
});
