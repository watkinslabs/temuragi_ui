// react/src/utils/component_registry.js
import React from 'react';

// Import COMPONENTS (reusable UI pieces)
import LoadingScreen from '../components/LoadingScreen';
import HtmlRenderer from '../components/HtmlRenderer';
import ComponentBuilder from '../components/ComponentBuilder';
import ServerDataTable from '../components/ServerDataTable';
import ReportBuilder from '../components/ReportBuilder/ReportBuilder';

// Import PAGES (full views/screens)
import Login from '../pages/Login/Login';
import ReportList from '../pages/ReportBuilder/ReportList';

// Import LAYOUTS
import DefaultLayout from '../components/DefaultLayout/DefaultLayout';

// Initialize namespaces
window.Components = window.Components || {};
window.Pages = window.Pages || {};
window.Layouts = window.Layouts || {};

// Register all default components
const register_default_components = () => {
    // Register actual reusable components
    window.Components.LoadingScreen = LoadingScreen;
    window.Components.HtmlRenderer = HtmlRenderer;
    window.Components.ComponentBuilder = ComponentBuilder;
    window.Components.ServerDataTable = ServerDataTable;
    window.Components.ReportBuilder = ReportBuilder;
    
    // Register pages separately
    window.Pages.Login = Login;
    window.Pages.ReportList= ReportList
    // Register layouts
    window.Layouts.DefaultLayout = DefaultLayout;
    
    // IMPORTANT: For DynamicPage compatibility, also register pages in Components
    // DynamicPage looks for components in window.Components
    window.Components.Login = Login;
    window.Components.ReportList= ReportList
    window.Components.DefaultLayout = DefaultLayout;

    
    // Register any core pages that should always be available
    // These will be bundled with the main app
    register_core_pages();
    
    console.log('Components registered:', Object.keys(window.Components));
    console.log('Pages registered:', Object.keys(window.Pages));
    console.log('Layouts registered:', Object.keys(window.Layouts));
};

// Register core pages that are always bundled with the app
const register_core_pages = () => {
    // Example: Register pages that should always be available
    // window.Pages.NotFound = NotFound;
    // window.Components.NotFound = NotFound; // Also in Components for DynamicPage
    
    // window.Pages.ErrorPage = ErrorPage;
    // window.Components.ErrorPage = ErrorPage;
};

// Helper function to register a new page dynamically
window.register_page = (name, page_component) => {
    window.Pages[name] = page_component;
    // Also add to Components for backward compatibility
    window.Components[name] = page_component;
    console.log(`Page '${name}' registered`);
};

// Helper function to register a new component dynamically
window.register_component = (name, component) => {
    window.Components[name] = component;
    console.log(`Component '${name}' registered`);
};

// Helper to list all registered items
window.list_registry = () => {
    console.log('=== REGISTRY ===');
    console.log('Pages:', Object.keys(window.Pages));
    console.log('Components:', Object.keys(window.Components));
    console.log('Layouts:', Object.keys(window.Layouts));
    return {
        pages: window.Pages,
        components: window.Components,
        layouts: window.Layouts
    };
};

// Export for use in index.js
export default register_default_components;