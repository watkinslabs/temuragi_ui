// src/App.js
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, useSearchParams, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SiteProvider, useSite } from './contexts/SiteContext';
import Login from './pages/Login/Login';
import DynamicPage from './components/DynamicPage';
import LoadingScreen from './components/LoadingScreen';
import DefaultLayout from './components/DefaultLayout/DefaultLayout';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Navigation hook that wraps React Router's navigation
const useNavigation = () => {
    const navigate = useNavigate();
    const params = useParams();
    const [search_params] = useSearchParams();

    // Convert search params to object
    const view_params = Object.fromEntries(search_params);

    // Add any route params
    Object.assign(view_params, params);

    const navigate_to = (view, params = {}) => {
        const path = view === 'home' ? '/' : `/${view}`;
        const search = new URLSearchParams(params).toString();
        navigate(path + (search ? `?${search}` : ''));
    };

    return {
        current_view: params['*'] || 'home',
        view_params,
        navigate_to
    };
};

// Protected wrapper
const ProtectedApp = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return <LoadingScreen />;
    }

    if (!isAuthenticated) {
        return <Login />;
    }

    return children;
};

// Main app content that uses routing
const AppContent = () => {
    const { initialize_context, fetch_site_config, site_info } = useSite();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [initial_navigation_done, setInitialNavigationDone] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) return;

        let mounted = true;

        const init_app = async () => {
            if (!mounted) return;

            const stored_context = sessionStorage.getItem('current_context') ||
                                localStorage.getItem('default_context');

            if (stored_context) {
                initialize_context(stored_context);
            }

            // Only fetch if we don't have site info yet
            if (!site_info) {
                await fetch_site_config('/');
            }

            // Handle initial navigation only once
            if (!initial_navigation_done) {
                setInitialNavigationDone(true);
                
                // Check if login stored an initial view
                const initial_view = sessionStorage.getItem('initial_view');
                if (initial_view) {
                    sessionStorage.removeItem('initial_view');
                    // Only navigate if we're at root
                    if (location.pathname === '/') {
                        navigate(`/${initial_view}`);
                    }
                }
                // If already on a specific path, stay there
                // This allows direct URL navigation to work
            }
        };

        init_app();

        return () => {
            mounted = false;
        };
    }, [isAuthenticated, initialize_context, fetch_site_config, site_info, navigate, location.pathname, initial_navigation_done]);


    useEffect(() => {
        window.navigate_to = (view, params = {}) => {
            const path = view === 'home' ? '/' : `/${view}`;
            const search = new URLSearchParams(params).toString();
            navigate(path + (search ? `?${search}` : ''));
        };

        // Also make useNavigation available globally for backward compatibility
        window.useNavigation = useNavigation;

        return () => {
            delete window.navigate_to;
            delete window.useNavigation;
        };
    }, [navigate]);

    // Setup global showToast
    useEffect(() => {
        window.showToast = (message, type = 'info') => {
            const toast_options = {
                position: "top-right",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            };

            switch (type) {
                case 'success':
                    toast.success(message, toast_options);
                    break;
                case 'error':
                    toast.error(message, toast_options);
                    break;
                case 'warning':
                    toast.warning(message, toast_options);
                    break;
                case 'info':
                default:
                    toast.info(message, toast_options);
                    break;
            }
        };

        return () => {
            delete window.showToast;
        };
    }, []);

    return (
        <>
            <Routes>
                {/* Login route - only accessible when NOT authenticated */}
                <Route path="/login" element={
                    isAuthenticated ? <Navigate to="/" replace /> : <Login />
                } />
                
                {/* All other routes - require authentication */}
                <Route path="/*" element={
                    <ProtectedApp>
                        <DefaultLayout>
                            <DynamicPage />
                        </DefaultLayout>
                    </ProtectedApp>
                } />
            </Routes>
            <ToastContainer />
        </>
    );
};

// Wire up contexts
const ContextConnector = ({ children }) => {
    const { register_clear_site } = useAuth();
    const { clear_context } = useSite();

    useEffect(() => {
        register_clear_site(clear_context);
    }, [register_clear_site, clear_context]);

    return children;
};

// Main App with Router
const App = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <SiteProvider>
                    <ContextConnector>
                        <AppContent />
                    </ContextConnector>
                </SiteProvider>
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;
export { useNavigation };