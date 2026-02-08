import { useState, useEffect, useCallback } from 'react';

export function useQuery<T>(loader: () => Promise<T>, deps: unknown[] = []): [T | null, boolean, () => void] {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    loader()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [...deps]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return [data, loading, refetch];
}
