import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '../lib/api';
import { logError } from '../lib/logger';

// Generic hook to fetch paginated data from Django API
export function usePaginatedData({
  table, // maps to django endpoint, e.g. 'inspections', 'users' 
  rpc, // endpoints under /metrics/ or custom
  columns = '*',
  itemsPerPage = 10,
  filters = {},   
  orFilters = '', 
  inFilters = [], 
  authQuery = false, 
  serviceQuery = false, 
  orderBy = { column: 'created_at', ascending: false },
  skip = false 
}) {
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0); // 0-indexed offset pages
  const [error, setError] = useState(null);

  const normalizedFilters = useMemo(() => JSON.stringify(filters), [filters]);
  const parsedFilters = useMemo(() => {
    try { return JSON.parse(normalizedFilters); } catch { return {}; }
  }, [normalizedFilters]);

  const fetchData = useCallback(async () => {
    if (skip) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (rpc) {
        // Assume RPC maps to a specific URL and doesn't exactly use these generic limits unless specified
        const urlParams = new URLSearchParams({ ...parsedFilters });
        const result = await apiFetch(`/metrics/${rpc}/?${urlParams.toString()}`);
        setData(result || []);
        return;
      }

      const offset = page * itemsPerPage;
      let urlParams = new URLSearchParams({
        limit: itemsPerPage,
        offset: offset,
      });

      // Simple filter mapping
      Object.keys(parsedFilters).forEach(key => {
        if (parsedFilters[key] !== undefined && parsedFilters[key] !== null) {
          urlParams.append(key, parsedFilters[key]);
        }
      });

      // We skip complex orFilters and inFilters right now to get basic list working.
      // A more extensive django-filter backend would be needed for complex dynamic queries.

      const response = await apiFetch(`/${table}/?${urlParams.toString()}`);
      
      if (response && response.results) {
          setData(response.results);
          setTotalCount(response.count);
      } else {
          setData(response || []);
          setTotalCount(response?.length || 0);
      }

    } catch (err) {
      logError(err, { source: 'hooks.usePaginatedData' });
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [
    itemsPerPage,
    page,
    parsedFilters,
    rpc,
    skip,
    table,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = itemsPerPage > 0 ? Math.ceil(totalCount / itemsPerPage) : 0;
  
  return {
    data,
    loading,
    error,
    page,
    totalPages,
    totalCount,
    setPage,
    refetch: fetchData
  };
}
