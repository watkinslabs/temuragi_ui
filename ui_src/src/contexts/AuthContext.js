// react/src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import config from '../config';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    // We'll need to access SiteContext's clear_section
    const [clear_site_callback, setClearSiteCallback] = useState(null);

    // Refresh handling state
    const refresh_lock = useRef(false);
    const refresh_promise = useRef(null);
    const token_expiry = useRef(null);
    const refresh_retry_count = useRef(0);
    const max_refresh_retries = 3;

    // Add helper functions for cookie management at the top of AuthProvider
    const set_cookie = (name, value, days = 365 * 10) => {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
    };

    const delete_cookie = (name) => {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
    };

    // Allow SiteProvider to register its clear function
    const register_clear_site = (callback) => {
        setClearSiteCallback(() => callback);
    };

    // Parse JWT to get expiry time
    const get_token_expiry = (token) => {
        if (!token) return null;

        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;

            const payload = JSON.parse(atob(parts[1]));
            // JWT exp is in seconds, convert to milliseconds
            return payload.exp ? payload.exp * 1000 : null;
        } catch (error) {
            console.error('Failed to parse token:', error);
            return null;
        }
    };

    // Check if token is expired or about to expire
    const is_token_expired = (expiry_time, buffer_minutes = 2) => {
        if (!expiry_time) return true;

        // Add buffer to refresh before actual expiry
        const buffer_ms = buffer_minutes * 60 * 1000;
        return Date.now() >= (expiry_time - buffer_ms);
    };

    // CENTRALIZED AUTH CLEARING FUNCTION
    const clear_all_auth_data = async () => {
        console.log('[AuthContext] Clearing all auth data');
        
        // Clear all auth-related localStorage items
        localStorage.removeItem('api_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_info');
        localStorage.removeItem('default_context');

        // Clear all sessionStorage
        sessionStorage.clear();

        // Clear cookies
        delete_cookie('user_id');
        delete_cookie('email');

        // Clear server session
        try {
            await config.apiCall(config.getUrl('/auth/clear_session'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
                },
                credentials: 'include'
            });
        } catch (error) {
            console.log('[AuthContext] Server session clear failed:', error);
        }

        // Clear state
        setIsAuthenticated(false);
        setUser(null);

        // Reset refresh state
        refresh_lock.current = false;
        refresh_promise.current = null;
        token_expiry.current = null;
        refresh_retry_count.current = 0;

        // Stop token check interval
        stop_token_check_interval();

        // Clear site context if callback is registered
        if (clear_site_callback) {
            clear_site_callback();
        }
    };

    // Check if we have valid tokens on mount
    useEffect(() => {
        check_auth();
    }, []);

    const check_auth = async () => {
        console.log('[AuthContext] Starting auth check');
        
        const api_token = localStorage.getItem('api_token');
        const refresh_token = localStorage.getItem('refresh_token');

        // If no tokens at all, you're not logged in - done
        if (!api_token || !refresh_token) {
            console.log('[AuthContext] No tokens found, user not authenticated');
            setIsAuthenticated(false);
            setLoading(false);
            return;
        }

        // Get token expiry for future checks
        const expiry = get_token_expiry(api_token);
        token_expiry.current = expiry;

        try {
            // Always try to validate with the backend first
            const response = await config.apiCall(config.getUrl(config.api.endpoints.auth.validate), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${api_token}`,
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[AuthContext] Token validation successful');
                setIsAuthenticated(true);
                setUser(data.user_info);

                // Start token check interval only for valid sessions
                start_token_check_interval();
            } else if (response.status === 401) {
                // Token might be expired, try to refresh
                console.log('[AuthContext] Token validation failed with 401, attempting refresh');
                const refresh_success = await refresh_token();
                
                if (refresh_success) {
                    // Refresh worked, we're authenticated
                    console.log('[AuthContext] Refresh successful, user authenticated');
                    setIsAuthenticated(true);
                    start_token_check_interval();
                } else {
                    // Refresh failed, clear everything
                    console.log('[AuthContext] Refresh failed, clearing auth');
                    await clear_all_auth_data();
                }
            } else {
                // Other error, clear auth
                console.log('[AuthContext] Token validation failed with status:', response.status);
                await clear_all_auth_data();
            }
        } catch (error) {
            console.error('[AuthContext] Auth check error:', error);
            // Network error - don't immediately clear auth, try refresh first
            if (refresh_token) {
                const refresh_success = await refresh_token();
                if (!refresh_success) {
                    await clear_all_auth_data();
                }
            } else {
                await clear_all_auth_data();
            }
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password, remember) => {
        try {
            const response = await config.apiCall(config.getUrl(config.api.endpoints.auth.login), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
                },
                body: JSON.stringify({ username, password, remember })
            });

            if (response.ok) {
                const data = await response.json();

                // Store tokens
                localStorage.setItem('api_token', data.api_token);
                localStorage.setItem('refresh_token', data.refresh_token);
                localStorage.setItem('user_id', data.user_id);
                localStorage.setItem('user_info', JSON.stringify(data.user_info));

                set_cookie('user_id', data.user_id);
                if (data.user_info && data.user_info.email) {
                    set_cookie('email', data.user_info.email);
                }

                // Store token expiry
                const expiry = get_token_expiry(data.api_token);
                token_expiry.current = expiry;

                // Store the ACTUAL default context from login
                if (data.default_context) {
                    localStorage.setItem('default_context', data.default_context);
                    sessionStorage.setItem('current_context', data.default_context);
                    sessionStorage.setItem('current_section', data.default_context); // Also store as section for compatibility
                }

                // Handle remember me
                if (remember) {
                    localStorage.setItem('remembered_username', username);
                } else {
                    localStorage.removeItem('remembered_username');
                }

                setIsAuthenticated(true);
                setUser(data.user_info);

                // Reset refresh retry count on successful login
                refresh_retry_count.current = 0;

                // Start token check interval after successful login
                start_token_check_interval();

                return {
                    success: true,
                    landing_page: data.landing_page || '/',
                    default_context: data.default_context
                };
            } else {
                const error_data = await response.json();
                return {
                    success: false,
                    message: error_data.message || 'Login failed'
                };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Login failed' };
        }
    };

    const refresh_token = async () => {
        // If already refreshing, wait for that refresh to complete
        if (refresh_lock.current && refresh_promise.current) {
            console.log('[AuthContext] Refresh already in progress, waiting...');
            return refresh_promise.current;
        }

        // Set the lock
        refresh_lock.current = true;

        // Create the refresh promise
        refresh_promise.current = (async () => {
            const refresh_token_value = localStorage.getItem('refresh_token');
            if (!refresh_token_value) {
                refresh_lock.current = false;
                refresh_promise.current = null;
                return false;
            }

            try {
                console.log('[AuthContext] Attempting token refresh...');
                const response = await config.apiCall(config.getUrl(config.api.endpoints.auth.refresh), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
                    },
                    body: JSON.stringify({ refresh_token: refresh_token_value })
                });

                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem('api_token', data.api_token);

                    // Update token expiry
                    const expiry = get_token_expiry(data.api_token);
                    token_expiry.current = expiry;

                    // Update user info if provided
                    if (data.user_info) {
                        localStorage.setItem('user_info', JSON.stringify(data.user_info));
                        setUser(data.user_info);
                    }

                    setIsAuthenticated(true);

                    // Reset retry count on successful refresh
                    refresh_retry_count.current = 0;

                    console.log('[AuthContext] Token refresh successful');
                    return true;
                } else {
                    // Check if this is a temporary failure or permanent
                    if (response.status === 401 || response.status === 403) {
                        // Refresh token is invalid, this is permanent
                        console.log('[AuthContext] Refresh token is invalid');
                        refresh_retry_count.current = max_refresh_retries; // Don't retry
                        return false;
                    } else if (response.status >= 500) {
                        // Server error, might be temporary
                        refresh_retry_count.current++;
                        console.log(`[AuthContext] Refresh failed with server error, retry count: ${refresh_retry_count.current}`);

                        if (refresh_retry_count.current < max_refresh_retries) {
                            // Wait and retry
                            await new Promise(resolve => setTimeout(resolve, 1000 * refresh_retry_count.current));
                            refresh_lock.current = false;
                            refresh_promise.current = null;
                            return refresh_token(); // Recursive retry
                        }
                    }
                    return false;
                }
            } catch (error) {
                console.error('[AuthContext] Token refresh failed:', error);
                refresh_retry_count.current++;

                if (refresh_retry_count.current < max_refresh_retries) {
                    // Network error, wait and retry
                    await new Promise(resolve => setTimeout(resolve, 1000 * refresh_retry_count.current));
                    refresh_lock.current = false;
                    refresh_promise.current = null;
                    return refresh_token(); // Recursive retry
                }

                return false;
            } finally {
                refresh_lock.current = false;
                refresh_promise.current = null;
            }
        })();

        return refresh_promise.current;
    };

    const logout = async () => {
        console.log('[AuthContext] User logout initiated');
        await clear_all_auth_data();
    };

    // Periodic token validation
    let token_check_interval = null;

    const start_token_check_interval = () => {
        // Clear any existing interval
        stop_token_check_interval();

        // Check token every minute
        token_check_interval = setInterval(async () => {
            const api_token = localStorage.getItem('api_token');
            if (!api_token) {
                await clear_all_auth_data();
                return;
            }

            // Let the backend validate the token
            try {
                const response = await config.apiCall(config.getUrl(config.api.endpoints.auth.validate), {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${api_token}`,
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
                    }
                });

                if (!response.ok && response.status === 401) {
                    console.log('[AuthContext] Token validation failed, attempting refresh');
                    // Try to refresh
                    const refresh_success = await refresh_token();
                    if (!refresh_success && refresh_retry_count.current >= max_refresh_retries) {
                        await clear_all_auth_data();
                    }
                }
            } catch (error) {
                console.error('[AuthContext] Token validation error:', error);
                // Don't clear auth on network errors
            }
        }, 60 * 1000); // Check every minute
    };

    const stop_token_check_interval = () => {
        if (token_check_interval) {
            clearInterval(token_check_interval);
            token_check_interval = null;
        }
    };

    // Clean up interval on unmount
    useEffect(() => {
        return () => {
            stop_token_check_interval();
        };
    }, []);

    // Set up global auth headers helper
    useEffect(() => {
        if (!window.app) window.app = {};

        window.app.getAuthHeaders = () => {
            const token = localStorage.getItem('api_token');
            return {
                'Authorization': token ? `Bearer ${token}` : '',
                'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
            };
        };
    }, []);

    // Global fetch interceptor
    useEffect(() => {
        // Only set up interceptor after initial auth check is complete
        if (loading) return;

        const original_fetch = window.fetch;
        window.fetch = async (...args) => {
            let response = await original_fetch(...args);

            // If we get a 401 and we're not already on the login page
            if (response.status === 401 && !window.location.pathname.includes('/login')) {
                const url = typeof args[0] === 'string' ? args[0] : args[0].url;

                // Don't intercept auth endpoints
                if (!url.includes('/auth/')) {
                    // Try to refresh token
                    const refresh_success = await refresh_token();
                    if (refresh_success) {
                        // Retry the original request with new token
                        const new_token = localStorage.getItem('api_token');
                        if (args[1] && args[1].headers) {
                            args[1].headers['Authorization'] = `Bearer ${new_token}`;
                        } else if (args[1]) {
                            args[1].headers = {
                                ...args[1].headers,
                                'Authorization': `Bearer ${new_token}`
                            };
                        } else {
                            args[1] = {
                                headers: {
                                    'Authorization': `Bearer ${new_token}`
                                }
                            };
                        }
                        response = await original_fetch(...args);
                    } else if (refresh_retry_count.current >= max_refresh_retries) {
                        // Only clear auth if we've exhausted retries
                        await clear_all_auth_data();
                    }
                }
            }

            return response;
        };

        // Restore original fetch on cleanup
        return () => {
            window.fetch = original_fetch;
        };
    }, [loading]); // Only run after loading is complete

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            loading,
            user,
            login,
            logout,
            refreshToken: refresh_token,
            checkAuth: check_auth,
            register_clear_site,
            clear_all_auth_data  // Expose this for special cases
        }}>
            {children}
        </AuthContext.Provider>
    );
};