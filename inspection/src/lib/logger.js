import { apiFetch } from './api';

const LOCAL_LOG_KEY = 'IPCMS_CLIENT_ERROR_LOGS';
const MAX_LOCAL_LOGS = 50;
const REMOTE_LOG_TIMEOUT_MS = 2000;
let initialized = false;
let remoteLoggingDisabled = false;
let userContext = { id: null, role: null };

function getEnvironment() {
  return import.meta.env.DEV ? 'development' : 'production';
}

function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack || null,
    };
  }

  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: error,
      stack: null,
    };
  }

  return {
    name: 'UnknownError',
    message: safeStringify(error),
    stack: null,
  };
}

export function setLoggerUserContext(profile) {
  userContext = {
    id: profile?.id || null,
    role: profile?.role || null,
  };
}

function buildPayload(error, context = {}) {
  const normalized = normalizeError(error);

  return {
    id: globalThis.crypto?.randomUUID?.() || `err_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    level: context.level || 'error',
    source: context.source || 'client',
    environment: getEnvironment(),
    message: normalized.message,
    error_name: normalized.name,
    stack: normalized.stack,
    route: window.location.pathname,
    url: window.location.href,
    user_agent: navigator.userAgent,
    user_id: userContext.id,
    user_role: userContext.role,
    context: context.metadata || {},
    created_at: new Date().toISOString(),
  };
}

function persistLocal(payload) {
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_LOG_KEY) || '[]');
    const next = [payload, ...existing].slice(0, MAX_LOCAL_LOGS);
    localStorage.setItem(LOCAL_LOG_KEY, JSON.stringify(next));
  } catch {
    // Ignore local persistence failures.
  }
}

async function persistRemote(payload) {
  if (remoteLoggingDisabled) return;

  try {
    await Promise.race([
      apiFetch('/inspections/client-error-logs/', {method: 'POST', body: JSON.stringify({
        level: payload.level,
        source: payload.source,
        environment: payload.environment,
        message: payload.message,
        error_name: payload.error_name,
        stack: payload.stack,
        route: payload.route,
        url: payload.url,
        user_agent: payload.user_agent,
        user_id: payload.user_id,
        user_role: payload.user_role,
        context: payload.context,
        client_created_at: payload.created_at,
      })}),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Remote log timeout')), REMOTE_LOG_TIMEOUT_MS);
      }),
    ]);
  } catch (remoteError) {
    const message = (remoteError && remoteError.message) ? remoteError.message : String(remoteError || '');
    if (message.includes('404') || message.toLowerCase().includes('not found')) {
      remoteLoggingDisabled = true;
    }

    if (import.meta.env.DEV) {
      console.warn('[logger] remote persistence failed', remoteError);
    }
  }
}

export async function logError(error, context = {}) {
  const payload = buildPayload(error, context);

  persistLocal(payload);

  if (import.meta.env.DEV) {
    console.groupCollapsed(`[client-error] ${payload.source}: ${payload.message}`);
    console.error(error);
    console.log('context', payload);
    console.groupEnd();
  } else {
    console.error(error);
  }

  await persistRemote(payload);
  return payload;
}

export function initializeGlobalErrorLogging() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('error', (event) => {
    logError(event.error || event.message, {
      source: 'window.error',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logError(event.reason || 'Unhandled promise rejection', {
      source: 'window.unhandledrejection',
    });
  });
}

export function getLocalErrorLogs() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_LOG_KEY) || '[]');
  } catch {
    return [];
  }
}
