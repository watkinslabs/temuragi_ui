// src/contexts/SiteContext.js
import React, { createContext, useState, useContext, useRef, useCallback, useEffect } from 'react';
import config from '../config';

export const SiteContext = createContext(null);

export const useSite = () => {
    const context = useContext(SiteContext);
    if (!context) throw new Error('useSite must be used within SiteProvider');
    return context;
};

export const SiteProvider = ({ children }) => {
    const [current_context, setCurrentContext] = useState(() => {
        return sessionStorage.getItem('current_context') || null;
    });

    const [available_contexts, setAvailableContexts] = useState([]);
    const [context_loading, setContextLoading] = useState(false);
    const [site_info, setSiteInfo] = useState(null);
    const [menu_items, setMenuItems] = useState([]);

    // Track what we're currently fetching to prevent duplicate requests
    const fetch_promise_ref = useRef(null);
    const last_fetched_context = useRef(null);

    // Get the current context, with fallback to default
    const get_current_context = useCallback(() => {
        const context = current_context ||
                       sessionStorage.getItem('current_context') ||
                       localStorage.getItem('default_context') ||
                       'default';
        return context;
    }, [current_context]);

    // Fetch site config - memoized and controlled
    const fetch_site_config = useCallback(async (path = '/', force = false) => {
        const context = get_current_context();

        // Skip if we already fetched this context (unless forced)
        if (!force && last_fetched_context.current === context && site_info) {
            console.log('SiteContext: Already have data for context:', context);
            return;
        }

        // If there's an existing fetch in progress, return that promise
        if (fetch_promise_ref.current) {
            console.log('SiteContext: Already fetching, returning existing promise');
            return fetch_promise_ref.current;
        }

        console.log('SiteContext: Fetching config for context:', context);
        
        // Create the fetch promise
        fetch_promise_ref.current = (async () => {
            setContextLoading(true);

            try {
                const request_body = {
                    path: path,
                    context: context,
                    include_contexts: !available_contexts.length // Only fetch contexts if we don't have them
                };

                const response = await config.apiCall(config.getUrl('/site/config'), {
                    method: 'POST',
                    headers: config.getAuthHeaders(),
                    body: JSON.stringify(request_body)
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('SiteContext: Received site config');

                    // Update site info
                    setSiteInfo({
                        name: data.site.name,
                        logo_desktop: data.site.logo_desktop,
                        logo_desktop_dark: data.site.logo_desktop_dark,
                        footer_text: data.site.footer_text,
                        tagline: data.site.tagline,
                        maintenance_mode: data.site.maintenance_mode
                    });

                    // Update menu items
                    setMenuItems(data.menu?.items || []);

                    // Update contexts only if provided
                    if (data.contexts) {
                        setAvailableContexts(data.contexts);
                    }

                    // Update current context if server says it's different
                    if (data.current_context && data.current_context !== context) {
                        console.log('SiteContext: Server returned different context:', data.current_context);
                        setCurrentContext(data.current_context);
                        sessionStorage.setItem('current_context', data.current_context);
                    }

                    last_fetched_context.current = context;
                } else {
                    console.error('SiteContext: Failed to fetch site config:', response.status);
                }
            } catch (error) {
                console.error('SiteContext: Site config fetch error:', error);
            } finally {
                setContextLoading(false);
                fetch_promise_ref.current = null;
            }
        })();

        return fetch_promise_ref.current;
    }, [get_current_context, available_contexts.length, site_info]);

    // Initialize context
    const initialize_context = useCallback((default_context) => {
        console.log('SiteContext: Initializing context:', default_context);
        if (default_context && default_context !== current_context) {
            setCurrentContext(default_context);
            sessionStorage.setItem('current_context', default_context);
        }
    }, [current_context]);

    // Context switch
    const switch_context = useCallback(async (context_name) => {
        console.log('SiteContext: Switching context to', context_name);

        if (context_name === current_context) {
            console.log('SiteContext: Same context, not switching');
            return;
        }

        const old_context = current_context;

        // Update the context
        setCurrentContext(context_name);
        sessionStorage.setItem('current_context', context_name);

        // Reset last fetched context so we fetch the new menu
        last_fetched_context.current = null;

        // Emit context change event
        window.dispatchEvent(new CustomEvent('context_changed', {
            detail: { new_context: context_name, old_context: old_context }
        }));

        // Navigate to home
        if (window.navigate_to) {
            window.navigate_to('home');
        }

        // Fetch new config for this context
        await fetch_site_config('/', true);
    }, [current_context, fetch_site_config]);

    // Clear context data on logout
    const clear_context = useCallback(() => {
        console.log('SiteContext: Clearing all context data');
        setCurrentContext(null);
        setAvailableContexts([]);
        setSiteInfo(null);
        setMenuItems([]);
        sessionStorage.removeItem('current_context');
        last_fetched_context.current = null;
        fetch_promise_ref.current = null;
    }, []);

    // Provide combined site_config for backward compatibility
    const site_config = site_info ? {
        ...site_info,
        menu_items,
        contexts: available_contexts,
        current_context
    } : null;

    const value = {
        current_context,
        available_contexts,
        context_loading,
        site_config,
        site_info,
        menu_items,
        setAvailableContexts,
        setContextLoading,
        initialize_context,
        switch_context,
        clear_context,
        get_current_context,
        fetch_site_config
    };

    return (
        <SiteContext.Provider value={value}>
            {children}
        </SiteContext.Provider>
    );
};