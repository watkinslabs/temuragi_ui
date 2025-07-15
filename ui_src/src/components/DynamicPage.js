import React, { useState, useEffect, useRef } from 'react';
import { useNavigation } from '../App';
import { useSite } from '../contexts/SiteContext';
import config from '../config';

// Cache for resolved routes
const route_cache = new Map();

const DynamicPage = () => {
    const { current_view, view_params } = useNavigation();
    const { get_current_context } = useSite();
    const [component_info, set_component_info] = useState(null);
    const [loading, set_loading] = useState(true);
    const [error, set_error] = useState(null);
    const [page_data, set_page_data] = useState(null);
    
    // Track current load operation to prevent race conditions
    const current_load_ref = useRef(null);

    useEffect(() => {
        // Reset state when view changes
        set_component_info(null);
        set_error(null);
        set_page_data(null);
        
        load_page();
    }, [current_view]);

    const load_page = async () => {
        // Create a unique key for this load operation
        const load_id = `${current_view}-${Date.now()}`;
        current_load_ref.current = load_id;
        
        try {
            set_loading(true);
            set_error(null);

            const context = get_current_context();
            const cache_key = `${context}:${current_view}`;
            
            // Check cache first
            if (route_cache.has(cache_key)) {
                console.log('Using cached route data for:', current_view);
                const cached_data = route_cache.get(cache_key);
                
                // Only proceed if this is still the current load operation
                if (current_load_ref.current !== load_id) return;
                
                await handle_route_data(cached_data, load_id);
                return;
            }

            console.log('Resolving route:', current_view);
            const response = await config.apiCall(config.getUrl('/routes/resolve'), {
                method: 'POST',
                headers: config.getAuthHeaders(),
                body: JSON.stringify({
                    path: current_view,
                    context: context,
                    params: view_params
                })
            });

            const data = await response.json();

            // Check if we got an error response
            if (!data.success && data.error) {
                throw new Error(data.error);
            }

            // Check if we have required data
            if (!data.component_name && !data.html) {
                throw new Error('No component or HTML content returned');
            }

            // Cache the resolved data
            route_cache.set(cache_key, data);
            
            // Only proceed if this is still the current load operation
            if (current_load_ref.current !== load_id) return;
            
            await handle_route_data(data, load_id);

        } catch (err) {
            // Only update error if this is still the current load operation
            if (current_load_ref.current === load_id) {
                console.error('Failed to load page:', err);
                set_error(err.message);
                set_loading(false);
            }
        }
    };

    const handle_route_data = async (data, load_id) => {
        // If HTML response
        if (data.type === 'html' && data.html) {
            set_page_data({ type: 'html', html: data.html });
            set_loading(false);
            return;
        }

        // Component response
        const module_name = data.component_name;
        const module_type = data.component_type || 'page';

        // Store info for later retrieval
        set_component_info({
            name: module_name,
            type: module_type,
            props: data.props
        });

        // Check if already loaded in registry
        if (window.app_registry.is_loaded(module_type, module_name)) {
            console.log('Component already loaded:', module_name);
            set_loading(false);
            return;
        }

        // Validate bundle URL
        if (!data.bundle_url) {
            throw new Error('No bundle URL provided');
        }

        // Load the bundle
        await load_bundle(data.bundle_url, module_name, module_type);
        
        // Only update loading state if this is still the current load operation
        if (current_load_ref.current === load_id) {
            set_loading(false);
        }
    };

    const load_bundle = async (bundle_url, module_name, module_type) => {
        return new Promise((resolve, reject) => {
            console.log('Loading bundle for:', module_name);

            const handle_registration = (event) => {
                if (event.detail.name === module_name) {
                    console.log('Module registered:', module_name);
                    window.removeEventListener('module_registered', handle_registration);
                    resolve();
                }
            };

            window.addEventListener('module_registered', handle_registration);

            const script = document.createElement('script');
            script.src = bundle_url;
            script.async = true;

            script.onload = () => {
                console.log('Script loaded:', bundle_url);
                // Give it a moment to register
                setTimeout(() => {
                    if (!window.app_registry.is_loaded(module_type, module_name)) {
                        window.removeEventListener('module_registered', handle_registration);
                        reject(new Error(`Component ${module_name} did not register properly`));
                    }
                }, 100);
            };

            script.onerror = () => {
                console.error('Script failed to load:', bundle_url);
                window.removeEventListener('module_registered', handle_registration);
                reject(new Error(`Failed to load: ${bundle_url}`));
            };

            document.head.appendChild(script);
        });
    };

    // Clear cache when context changes
    useEffect(() => {
        const handle_context_change = () => {
            console.log('Context changed, clearing route cache');
            route_cache.clear();
        };

        // Listen for context changes
        window.addEventListener('context_changed', handle_context_change);
        
        return () => {
            window.removeEventListener('context_changed', handle_context_change);
        };
    }, []);

    console.log('DynamicPage render - loading:', loading, 'component_info:', component_info, 'error:', error);

    if (loading) {
        return (
            <div className="d-flex justify-content-center p-5">
                <div className="spinner-border" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger m-3">
                <h5>Error Loading Page</h5>
                <p>{error}</p>
                <small className="text-muted">View: {current_view}</small>
            </div>
        );
    }

    // HTML response
    if (page_data?.type === 'html' && page_data?.html) {
        return (
            <div dangerouslySetInnerHTML={{ __html: page_data.html }} />
        );
    }

    // Component response
    if (component_info) {
        // Get component from registry at render time
        const PageComponent = window.app_registry[`get_${component_info.type}`](component_info.name);
        
        if (!PageComponent) {
            return (
                <div className="alert alert-danger m-3">
                    Component {component_info.name} not found in registry
                </div>
            );
        }

        console.log('Rendering component:', component_info.name);
        return <PageComponent key={`${component_info.name}-${current_view}`} {...component_info.props} route_params={view_params} />;
    }

    return <div className="alert alert-warning m-3">Nothing to display</div>;
};

export default DynamicPage;