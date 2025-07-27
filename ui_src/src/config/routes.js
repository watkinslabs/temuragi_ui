// src/config/routes.js
import { lazy } from 'react';

// Lazy load all your pages
const routes = {
    home: {
        component: lazy(() => import('../pages/Dashboard/Dashboard')),
        title: 'Dashboard'
    },
    Login: {
        component: lazy(() => import('../pages/Login/Login')),
        title: 'Login'
    },
    ReportBuilder: {
        component: lazy(() => import('../pages/ReportBuilder/ReportBuilder')),
        title: 'Report Editor'
    },
    UserList: {
        component: lazy(() => import('../pages/User/UserList')),
        title: 'Users'
    },
    UserEditor: {
        component: lazy(() => import('../pages/User/UserEditor')),
        title: 'User Editor'
    }
};

export default routes;