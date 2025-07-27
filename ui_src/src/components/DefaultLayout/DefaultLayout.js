import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSite } from '../../contexts/SiteContext';
import { useNavigation } from '../../App';
import NineDotMenu from './layout/NineDotMenu';
import Breadcrumbs from './layout/Breadcrumbs';
import SidebarMenu from './layout/SidebarMenu';

const DefaultLayout = ({ children }) => {
    const { user, logout } = useAuth();
    const { site_info, context_loading } = useSite();

    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme_preference') || 'light';
    });
    const [sidebar_collapsed, setSidebarCollapsed] = useState(false);

    // Apply theme
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme_preference', theme);
    }, [theme]);

    const handle_theme_toggle = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const toggle_sidebar = () => {
        setSidebarCollapsed(!sidebar_collapsed);
    };

    // Show loading while site config is being fetched
    if (!site_info || context_loading) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div id="app-content">
            <div className="topbar htmx-indicator"></div>

            <header className="header">
                <div className="header_brand">
                    <div className="logo_wrapper">
                        {theme === 'light' ? (
                            site_info.logo_desktop && (
                                <img
                                    src={site_info.logo_desktop}
                                    alt={`${site_info.name || 'Site'} logo`}
                                    className="header_logo"
                                />
                            )
                        ) : (
                            site_info.logo_desktop_dark && (
                                <img
                                    src={site_info.logo_desktop_dark}
                                    alt={`${site_info.name || 'Site'} logo`}
                                    className="header_logo"
                                />
                            )
                        )}
                    </div>
                    <h1>{site_info.name || 'Dashboard'}</h1>
                </div>

                <div className="header_actions">
                    {site_info.maintenance_mode && (
                        <div className="maintenance_indicator me-3">
                            <span className="badge bg-warning text-dark">
                                <i className="fas fa-tools me-1"></i>
                                Maintenance Mode
                            </span>
                        </div>
                    )}

                    <NineDotMenu
                        theme={theme}
                        user={user}
                        onToggleTheme={handle_theme_toggle}
                        onLogout={logout}
                    />
                </div>
            </header>

            <Breadcrumbs />

            <div className={`content_area ${sidebar_collapsed ? 'collapsed' : ''}`}>
                <SidebarMenu
                    collapsed={sidebar_collapsed}
                    onToggleCollapse={toggle_sidebar}
                />

                <div className="main_content" id="main-content">
                    {children}
                </div>
            </div>

            <footer className="footer">
                <div className="footer_content">
                    <p>{site_info.footer_text || `© ${new Date().getFullYear()} ${site_info.name || 'Your Company'}. All rights reserved.`}</p>
                    {site_info.tagline && (
                        <p className="tagline">{site_info.tagline}</p>
                    )}
                </div>
            </footer>
        </div>
    );
};

export default React.memo(DefaultLayout);