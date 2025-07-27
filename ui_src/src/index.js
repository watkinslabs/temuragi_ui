import React from 'react';
import ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
import App from './App';
import { useAuth } from './contexts/AuthContext';
import { useSite } from './contexts/SiteContext';
import { useNavigation } from './App';


// Expose React
window.React = React;
window.ReactDOM = ReactDOM;

// Expose hooks so dynamic bundles can use them
window.useAuth = useAuth;
window.useSite = useSite;
window.useNavigation = useNavigation;

// Expose other shared utilities
window.app_utils = {
    config: require('./config').default,
    // Add other utilities as needed
};

// Also expose config directly for backward compatibility
window.appConfig = require('./config').default;

// Register core components
import Login from './pages/Login/Login';
import LoadingScreen from './components/LoadingScreen';
import DefaultLayout from './components/DefaultLayout/DefaultLayout';
import ServerDataTable from './components/ServerDataTable';



// Start app
const root = createRoot(document.getElementById('root'));
root.render(<App />);