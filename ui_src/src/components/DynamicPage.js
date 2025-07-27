// src/components/DynamicPage.js
import React, { Suspense } from 'react';
import { useNavigation } from '../App';
import routes from '../config/routes';
import LoadingScreen from './LoadingScreen';

const DynamicPage = () => {
    const { current_view, view_params } = useNavigation();

    // NEVER render Login component through dynamic routing
    // Login should only be rendered by the main App router
    if (current_view === 'Login' || current_view === 'login') {
        // Redirect to home instead
        const route = routes.home;
        const PageComponent = route.component;
        return (
            <Suspense fallback={<LoadingScreen />}>
                <PageComponent {...view_params} />
            </Suspense>
        );
    }

    // Get the route config
    const route = routes[current_view] || routes.home;
    const PageComponent = route.component;

    return (
        <Suspense fallback={<LoadingScreen />}>
            <PageComponent {...view_params} />
        </Suspense>
    );
};

export default DynamicPage;