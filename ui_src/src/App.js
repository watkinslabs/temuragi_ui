// src/App.js
import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SiteProvider, useSite } from './contexts/SiteContext';
import Login from './pages/Login/Login';
import DynamicPage from './components/DynamicPage';
import LoadingScreen from './components/LoadingScreen';
import DefaultLayout from './components/DefaultLayout/DefaultLayout';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Navigation context for state-based routing
const NavigationContext = React.createContext();

export const useNavigation = () => {
    const context = React.useContext(NavigationContext);
    if (!context) throw new Error('useNavigation must be used within NavigationProvider');
    return context;
};

// Protected app wrapper
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

// Wire up the auth and site contexts
const ContextConnector = ({ children }) => {
    const { register_clear_site } = useAuth();
    const { clear_context } = useSite();

    useEffect(() => {
        // Register the site clear function with auth context
        register_clear_site(clear_context);
    }, [register_clear_site, clear_context]);

    return children;
};

// Main app content
const AppContent = () => {
    const [current_view, setCurrentView] = useState('home');
    const [view_params, setViewParams] = useState({});
    const { initialize_context, fetch_site_config } = useSite();
    const { isAuthenticated } = useAuth();

    // Initialize app
    useEffect(() => {
        if (!isAuthenticated) return;

        const init_app = async () => {
            // Initialize context
            const stored_context = sessionStorage.getItem('current_context') || 
                                 localStorage.getItem('default_context');
            
            if (stored_context) {
                initialize_context(stored_context);
            }

            // Fetch site config
            await fetch_site_config('/');

            // Check for initial view
            const initial_view = sessionStorage.getItem('initial_view');
            if (initial_view) {
                navigate_to(initial_view);
                sessionStorage.removeItem('initial_view');
            }
        };

        init_app();
    }, [isAuthenticated]);

    // Navigation function
    const navigate_to = (view, params = {}) => {
        console.log('Navigating to:', view, params);
        setCurrentView(view);
        setViewParams(params);
    };

    // Make navigate_to globally available
    useEffect(() => {
        window.navigate_to = navigate_to;
        return () => {
            delete window.navigate_to;
        };
    }, []);

    // Setup global showToast function
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

    const navigation_value = {
        current_view,
        view_params,
        navigate_to
    };

    return (
        <NavigationContext.Provider value={navigation_value}>
            <ProtectedApp>
                <DefaultLayout>
                    <DynamicPage />
                </DefaultLayout>
                <ToastContainer />
            </ProtectedApp>
        </NavigationContext.Provider>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <SiteProvider>
                <ContextConnector>
                    <AppContent />
                </ContextConnector>
            </SiteProvider>
        </AuthProvider>
    );
};

export default App;
export { NavigationContext };