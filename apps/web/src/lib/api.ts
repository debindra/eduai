export type ApiHealthResponse = {
  status: string;
  dbPackage?: string;
  database?: {
    configured: boolean;
    ok: boolean;
    schoolCount: number | null;
    error?: string;
  };
};

export function getApiBaseUrl(): string {
  return (
    import.meta.env.VITE_API_URL ??
    import.meta.env.PUBLIC_API_URL ??
    'http://localhost:3000'
  );
}

export async function fetchApiHealth(): Promise<ApiHealthResponse> {
  const response = await fetch(`${getApiBaseUrl()}/health`);

  if (!response.ok) {
    throw new Error(`API health check failed (${response.status})`);
  }

  return response.json() as Promise<ApiHealthResponse>;
}
