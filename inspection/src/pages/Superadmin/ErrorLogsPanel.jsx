import React, { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import { getLocalErrorLogs } from '../../lib/logger';

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function getBadgeType(level) {
  if (level === 'error') return 'red';
  if (level === 'warning' || level === 'warn') return 'amber';
  return 'blue';
}

export default function ErrorLogsPanel() {
  const [selectedLog, setSelectedLog] = useState(null);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const [levelFilter, setLevelFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [environmentFilter, setEnvironmentFilter] = useState('');

  const remoteFilters = useMemo(
    () => ({
      ...(levelFilter ? { level: levelFilter } : {}),
      ...(sourceFilter ? { source: sourceFilter } : {}),
      ...(environmentFilter ? { environment: environmentFilter } : {}),
    }),
    [environmentFilter, levelFilter, sourceFilter]
  );

  const { data, loading, error, page, totalPages, setPage, refetch, totalCount } = usePaginatedData({
    table: 'inspections/client-error-logs',
    columns: 'id, level, source, environment, message, error_name, route, user_role, created_at, client_created_at, context',
    itemsPerPage: 15,
    filters: remoteFilters,
    orderBy: { column: 'created_at', ascending: false },
  });

  const localLogsSnapshot = useMemo(() => {
    if (localRefreshKey < 0) return [];
    return getLocalErrorLogs();
  }, [localRefreshKey]);

  const localLogs = useMemo(() => {
    return localLogsSnapshot.filter(log => {
      const matchesLevel = !levelFilter || (log.level || '') === levelFilter;
      const matchesSource = !sourceFilter || (log.source || '').toLowerCase().includes(sourceFilter.toLowerCase());
      const matchesEnvironment = !environmentFilter || (log.environment || '') === environmentFilter;
      return matchesLevel && matchesSource && matchesEnvironment;
    });
  }, [environmentFilter, levelFilter, localLogsSnapshot, sourceFilter]);

  const remoteSourceOptions = useMemo(() => {
    return Array.from(new Set(data.map(log => log.source).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const localSourceOptions = useMemo(() => {
    return Array.from(new Set(localLogsSnapshot.map(log => log.source).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [localLogsSnapshot]);

  const sourceOptions = useMemo(() => {
    return Array.from(new Set([...remoteSourceOptions, ...localSourceOptions])).sort((a, b) => a.localeCompare(b));
  }, [localSourceOptions, remoteSourceOptions]);

  const hasActiveFilters = Boolean(levelFilter || sourceFilter || environmentFilter);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Remote Logs</div>
          <div className="text-2xl font-bold text-slate-800">{totalCount || 0}</div>
          <div className="text-sm text-slate-500">Saved to Cloud</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Local Logs</div>
          <div className="text-2xl font-bold text-slate-800">{localLogs.length}</div>
          <div className="text-sm text-slate-500">Stored in this browser</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Actions</div>
            <div className="text-sm text-slate-500">Refresh both log sources</div>
          </div>
          <button
            type="button"
            onClick={() => {
              refetch();
              setLocalRefreshKey(key => key + 1);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Level</label>
            <select
              value={levelFilter}
              onChange={event => setLevelFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">All levels</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="warn">Warn</option>
              <option value="info">Info</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Source</label>
            <input
              list="error-log-source-options"
              type="text"
              value={sourceFilter}
              onChange={event => setSourceFilter(event.target.value)}
              placeholder="All sources"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <datalist id="error-log-source-options">
              {sourceOptions.map(source => (
                <option key={source} value={source} />
              ))}
            </datalist>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Environment</label>
            <select
              value={environmentFilter}
              onChange={event => setEnvironmentFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">All environments</option>
              <option value="development">Development</option>
              <option value="production">Production</option>
              <option value="test">Test</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setLevelFilter('');
                setSourceFilter('');
                setEnvironmentFilter('');
              }}
              disabled={!hasActiveFilters}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear filters
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Production / Live Error Logs</h2>
            <p className="text-sm text-slate-500">Captured by the global logger and written to `client_error_logs`.</p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading remote error logs...</div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">
            Failed to load remote logs: {error.message}
          </div>
        ) : (
          <>
            <Table
              headers={['Time', 'Level', 'Source', 'Message', 'Route', 'Role', 'Action']}
              emptyMessage="No remote errors have been logged yet."
            >
              {data.map(log => (
                <tr key={log.id}>
                  <td className="p-4 text-slate-500 whitespace-nowrap">{formatDate(log.client_created_at || log.created_at)}</td>
                  <td className="p-4"><Badge type={getBadgeType(log.level)}>{String(log.level || 'error').toUpperCase()}</Badge></td>
                  <td className="p-4 text-slate-700">{log.source || 'client'}</td>
                  <td className="p-4 text-slate-800 max-w-xs truncate">{log.message}</td>
                  <td className="p-4 text-slate-500">{log.route || '—'}</td>
                  <td className="p-4 text-slate-500">{log.user_role || 'anonymous'}</td>
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => setSelectedLog({ ...log, origin: 'remote' })}
                      className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage(page - 1)}
              onNext={() => setPage(page + 1)}
              label="remote"
            />
          </>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Local Development Logs</h2>
            <p className="text-sm text-slate-500">Stored in `localStorage` for quick debugging on this browser.</p>
          </div>
        </div>

        <Table
          headers={['Time', 'Level', 'Source', 'Message', 'Route', 'Action']}
          emptyMessage="No local browser logs found."
        >
          {localLogs.map(log => (
            <tr key={log.id}>
              <td className="p-4 text-slate-500 whitespace-nowrap">{formatDate(log.created_at)}</td>
              <td className="p-4"><Badge type={getBadgeType(log.level)}>{String(log.level || 'error').toUpperCase()}</Badge></td>
              <td className="p-4 text-slate-700">{log.source || 'client'}</td>
              <td className="p-4 text-slate-800 max-w-xs truncate">{log.message}</td>
              <td className="p-4 text-slate-500">{log.route || '—'}</td>
              <td className="p-4">
                <button
                  type="button"
                  onClick={() => setSelectedLog({ ...log, origin: 'local' })}
                  className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                >
                  Inspect
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </div>

      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Error Log Details (${selectedLog?.origin || 'log'})`}
      >
        {selectedLog && (
          <div className="space-y-5 text-left">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-lg border border-slate-100 p-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Timestamp</div>
                <div className="text-slate-800 font-medium">{formatDate(selectedLog.client_created_at || selectedLog.created_at)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Level</div>
                <Badge type={getBadgeType(selectedLog.level)}>{String(selectedLog.level || 'error').toUpperCase()}</Badge>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Source</div>
                <div className="text-slate-800 font-medium break-all">{selectedLog.source || 'client'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Environment</div>
                <div className="text-slate-800 font-medium">{selectedLog.environment || selectedLog.origin || 'unknown'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Route</div>
                <div className="text-slate-800 font-medium break-all">{selectedLog.route || '—'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Role</div>
                <div className="text-slate-800 font-medium">{selectedLog.user_role || 'anonymous'}</div>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Message</div>
              <pre className="bg-slate-950 text-slate-100 rounded-lg p-4 text-xs whitespace-pre-wrap break-words">{selectedLog.message || '—'}</pre>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Stack</div>
              <pre className="bg-slate-950 text-slate-100 rounded-lg p-4 text-xs whitespace-pre-wrap break-words">{selectedLog.stack || 'No stack trace recorded.'}</pre>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Context</div>
              <pre className="bg-slate-100 text-slate-700 rounded-lg p-4 text-xs whitespace-pre-wrap break-words">{JSON.stringify(selectedLog.context || {}, null, 2)}</pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
