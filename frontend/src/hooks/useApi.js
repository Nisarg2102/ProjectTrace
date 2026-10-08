import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
export function useApi(path) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, loading: true, error: '' });
    api(path, { signal: controller.signal }).then(data => setState({ data, loading: false, error: '' }))
      .catch(error => { if (!controller.signal.aborted) setState({ data: null, loading: false, error: error.message }); });
    return () => controller.abort();
  }, [path, revision]);
  return { ...state, reload };
}
