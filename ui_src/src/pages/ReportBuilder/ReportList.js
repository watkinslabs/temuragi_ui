/**
 * @routes ["ReportList"]
*/

import React from 'react';

const ReportList = () => {
    // ServerDataTable should already be in the registry as it's part of the main bundle
    const ServerDataTable = window.app_registry?.get_component('ServerDataTable');

    if (!ServerDataTable) {
        return (
            <div className="alert alert-warning m-3">
                ServerDataTable component not found in registry. 
                It should be registered as part of the main application bundle.
            </div>
        );
    }

    return (
        <ServerDataTable
            report_id="982c9323-c62a-4276-87dc-f5eafde78dbc"
        />
    );
};

export default ReportList;

// Self-register when loaded as dynamic bundle
if (window.app_registry) {
    window.app_registry.register_page('ReportList', ReportList);
    window.dispatchEvent(new CustomEvent('module_registered', {
        detail: { name: 'ReportList', type: 'page', module: ReportList }
    }));
}