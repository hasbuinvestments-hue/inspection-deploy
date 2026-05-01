const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const setTokens = (access, refresh) => {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
};

export const clearTokens = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
};

const getAccessToken = () => localStorage.getItem('access_token');
const getRefreshToken = () => localStorage.getItem('refresh_token');

export const apiFetch = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    let headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }

    const token = getAccessToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let response;
    try {
        response = await fetch(url, { ...options, headers });
    } catch (error) {
        // Network error (likely offline)
        if (!navigator.onLine) {
            throw new Error('OFFLINE_ERROR');
        }
        throw error;
    }

    if (response.status === 401 && token) {
        const refresh = getRefreshToken();
        if (refresh) {
            const refreshRes = await fetch(`${API_BASE_URL}/token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh })
            });
            if (refreshRes.ok) {
                const data = await refreshRes.json();
                setTokens(data.access, refresh); // simplejwt usually returns only access if not blacklisting
                
                headers['Authorization'] = `Bearer ${data.access}`;
                response = await fetch(url, { ...options, headers });
            } else {
                clearTokens();
                window.location.href = '/login';
            }
        } else {
            clearTokens();
            window.location.href = '/login';
        }
    }

    if (!response.ok) {
        let err;
        const text = await response.text();
        try { err = JSON.parse(text); } catch { err = text; }
        if (typeof err === 'object') {
            throw new Error(err?.detail || err?.error || JSON.stringify(err));
        } else {
             throw new Error(typeof err === 'string' && err.length < 200 ? err : 'API Error');
        }
    }

    // Return empty for 204
    if (response.status === 204) return null;

    return response.json();
};
