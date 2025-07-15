/**
 * @routes ["UserList"]
*/

import React from 'react';

const UserList = () => {
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
            report_id="2b8d43ac-d293-41fd-bfaa-bfd91882c02f"
        />
    );
};

export default UserList;

// Self-register when loaded as dynamic bundle
if (window.app_registry) {
    window.app_registry.register_page('UserList', UserList);
    window.dispatchEvent(new CustomEvent('module_registered', {
        detail: { name: 'ReportList', type: 'page', module: UserList }
    }));
}