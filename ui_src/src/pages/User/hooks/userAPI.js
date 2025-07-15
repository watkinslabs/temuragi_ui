import { useCallback } from 'react';

export const userAPI = () => {
    // Get config from window for external components
    const config = window.app_utils?.config || window.appConfig;
    
    if (!config) {
        console.error('userAPI: config not found on window');
        return {
            load_roles: () => Promise.resolve([]),
            load_user: () => Promise.resolve(null),
            save_user: () => Promise.resolve({ success: false })
        };
    }

    const show_error = (message) => window.showToast?.(message, 'error') || console.error('Error:', message);

    // Load functions
    const load_roles = useCallback(async () => {
        try {
            const response = await config.apiCall(config.api.base + '/data', {
                method: 'POST',
                headers: config.getAuthHeaders(),
                body: JSON.stringify({
                    model: 'Role',
                    operation: 'list',
                    filters: { is_active: true },
                    order_by: 'name'
                })
            });
            const result = await response.json();
            if (!result.success) {
                show_error(result.message || 'Failed to load roles');
            }
            return result.success ? result.data || [] : [];
        } catch (error) {
            show_error('Network error loading roles');
            return [];
        }
    }, []);

    const load_user = useCallback(async (user_id) => {
        try {
            const response = await config.apiCall(config.api.base + '/data', {
                method: 'POST',
                headers: config.getAuthHeaders(),
                body: JSON.stringify({
                    model: 'User',
                    operation: 'read',
                    id: user_id
                })
            });
            const result = await response.json();
            if (!result.success) {
                show_error(result.message || 'Failed to load user');
                return null;
            }
            if (result.success && result.data) {
                // Load related data
                const [names, phones, emails, socials, addresses] = await Promise.all([
                    load_user_names(user_id),
                    load_user_phones(user_id),
                    load_user_emails(user_id),
                    load_user_socials(user_id),
                    load_user_addresses(user_id)
                ]);

                return {
                    user: result.data,
                    names,
                    phones,
                    emails,
                    socials,
                    addresses
                };
            }
            return null;
        } catch (error) {
            show_error('Network error loading user data');
            return null;
        }
    }, []);

    const load_user_names = useCallback(async (user_id) => {
        try {
            const response = await config.apiCall(config.api.base + '/data', {
                method: 'POST',
                headers: config.getAuthHeaders(),
                body: JSON.stringify({
                    model: 'Name',
                    operation: 'list',
                    filters: { user_id: user_id },
                    order_by: '-is_current'
                })
            });
            const result = await response.json();
            return result.success ? result.data || [] : [];
        } catch (error) {
            show_error('Failed to load user names');
            return [];
        }
    }, []);

    const load_user_phones = useCallback(async (user_id) => {
        try {
            const response = await config.apiCall(config.api.base + '/data', {
                method: 'POST',
                headers: config.getAuthHeaders(),
                body: JSON.stringify({
                    model: 'PhoneNumber',
                    operation: 'list',
                    filters: { user_id: user_id },
                    order_by: '-is_primary'
                })
            });
            const result = await response.json();
            return result.success ? result.data || [] : [];
        } catch (error) {
            show_error('Failed to load phone numbers');
            return [];
        }
    }, []);

    const load_user_emails = useCallback(async (user_id) => {
        try {
            const response = await config.apiCall(config.api.base + '/data', {
                method: 'POST',
                headers: config.getAuthHeaders(),
                body: JSON.stringify({
                    model: 'Email',
                    operation: 'list',
                    filters: { user_id: user_id },
                    order_by: '-is_primary'
                })
            });
            const result = await response.json();
            return result.success ? result.data || [] : [];
        } catch (error) {
            show_error('Failed to load email addresses');
            return [];
        }
    }, []);

    const load_user_socials = useCallback(async (user_id) => {
        try {
            const response = await config.apiCall(config.api.base + '/data', {
                method: 'POST',
                headers: config.getAuthHeaders(),
                body: JSON.stringify({
                    model: 'SocialContact',
                    operation: 'list',
                    filters: { user_id: user_id },
                    order_by: 'platform'
                })
            });
            const result = await response.json();
            return result.success ? result.data || [] : [];
        } catch (error) {
            show_error('Failed to load social contacts');
            return [];
        }
    }, []);

    const load_user_addresses = useCallback(async (user_id) => {
        try {
            const response = await config.apiCall(config.api.base + '/data', {
                method: 'POST',
                headers: config.getAuthHeaders(),
                body: JSON.stringify({
                    model: 'Address',
                    operation: 'list',
                    filters: { user_id: user_id },
                    order_by: '-is_primary'
                })
            });
            const result = await response.json();
            return result.success ? result.data || [] : [];
        } catch (error) {
            show_error('Failed to load addresses');
            return [];
        }
    }, []);

    // Save functions
    const save_user = useCallback(async ({ user_data, names, phones, emails, socials, addresses, is_edit_mode, user_id }) => {
        let saved_user_id = user_id;

        try {
            // Save or update user
            if (is_edit_mode) {
                const response = await config.apiCall(config.api.base + '/data', {
                    method: 'POST',
                    headers: config.getAuthHeaders(),
                    body: JSON.stringify({
                        model: 'User',
                        operation: 'update',
                        id: user_id,
                        data: user_data
                    })
                });
                const result = await response.json();
                if (!result.success) {
                    show_error(result.message || 'Failed to update user');
                    return { success: false };
                }
            } else {
                const response = await config.apiCall(config.api.base + '/data', {
                    method: 'POST',
                    headers: config.getAuthHeaders(),
                    body: JSON.stringify({
                        model: 'User',
                        operation: 'create',
                        data: user_data
                    })
                });
                const result = await response.json();
                if (!result.success) {
                    show_error(result.message || 'Failed to create user');
                    return { success: false };
                }
                saved_user_id = result.data.id;
            }

            // Save related data
            await Promise.all([
                save_names(saved_user_id, names, is_edit_mode),
                save_phones(saved_user_id, phones, is_edit_mode),
                save_emails(saved_user_id, emails, is_edit_mode),
                save_socials(saved_user_id, socials, is_edit_mode),
                save_addresses(saved_user_id, addresses, is_edit_mode)
            ]);

            return { success: true, user_id: saved_user_id };
        } catch (error) {
            show_error('Network error saving user: ' + error.message);
            return { success: false };
        }
    }, []);

    const save_names = useCallback(async (user_id, names, is_edit_mode) => {
        for (const name of names) {
            try {
                if (name.id && !name._is_new && !name._deleted) {
                    const response = await config.apiCall(config.api.base + '/data', {
                        method: 'POST',
                        headers: config.getAuthHeaders(),
                        body: JSON.stringify({
                            model: 'Name',
                            operation: 'update',
                            id: name.id,
                            data: { ...name, user_id }
                        })
                    });
                    const result = await response.json();
                    if (!result.success) {
                        show_error(`Failed to update name: ${result.message || 'Unknown error'}`);
                    }
                } else if (!name._deleted && name._is_new) {
                    const response = await config.apiCall(config.api.base + '/data', {
                        method: 'POST',
                        headers: config.getAuthHeaders(),
                        body: JSON.stringify({
                            model: 'Name',
                            operation: 'create',
                            data: { ...name, user_id }
                        })
                    });
                    const result = await response.json();
                    if (!result.success) {
                        show_error(`Failed to create name: ${result.message || 'Unknown error'}`);
                    }
                } else if (name.id && name._deleted) {
                    const response = await config.apiCall(config.api.base + '/data', {
                        method: 'POST',
                        headers: config.getAuthHeaders(),
                        body: JSON.stringify({
                            model: 'Name',
                            operation: 'delete',
                            id: name.id
                        })
                    });
                    const result = await response.json();
                    if (!result.success) {
                        show_error(`Failed to delete name: ${result.message || 'Unknown error'}`);
                    }
                }
            } catch (error) {
                show_error('Network error saving names');
            }
        }
    }, []);

    const save_phones = useCallback(async (user_id, phones, is_edit_mode) => {
        for (const phone of phones) {
            try {
                if (phone.id && !phone._is_new && !phone._deleted) {
                    const response = await config.apiCall(config.api.base + '/data', {
                        method: 'POST',
                        headers: config.getAuthHeaders(),
                        body: JSON.stringify({
                            model: 'PhoneNumber',
                            operation: 'update',
                            id: phone.id,
                            data: { ...phone, user_id }
                        })
                    });
                    const result = await response.json();
                    if (!result.success) {
                        show_error(`Failed to update phone: ${result.message || 'Unknown error'}`);
                    }
                } else if (!phone._deleted && phone._is_new) {
                    const response = await config.apiCall(config.api.base + '/data', {
                        method: 'POST',
                        headers: config.getAuthHeaders(),
                        body: JSON.stringify({
                            model: 'PhoneNumber',
                            operation: 'create',
                            data: { ...phone, user_id }
                        })
                    });
                    const result = await response.json();
                    if (!result.success) {
                        show_error(`Failed to create phone: ${result.message || 'Unknown error'}`);
                    }
                } else if (phone.id && phone._deleted) {
                    const response = await config.apiCall(config.api.base + '/data', {
                        method: 'POST',
                        headers: config.getAuthHeaders(),
                        body: JSON.stringify({
                            model: 'PhoneNumber',
                            operation: 'delete',
                            id: phone.id
                        })
                    });
                    const result = await response.json();
                    if (!result.success) {
                        show_error(`Failed to delete phone: ${result.message || 'Unknown error'}`);
                    }
                }
            } catch (error) {
                show_error('Network error saving phones');
            }
        }
    }, []);

    const save_emails = useCallback(async (user_id, emails, is_edit_mode) => {
        for (const email of emails) {
            try {
                if (email.id && !email._is_new && !email._deleted) {
                    const response = await config.apiCall(config.api.base + '/data', {
                        method: 'POST',
                        headers: config.getAuthHeaders(),
                        body: JSON.stringify({
                            model: 'Email',
                            operation: 'update',
                            id: email.id,
                            data: { ...email, user_id }
                        })
                    });
                    const result = await response.json();
                    if (!result.success) {
                        show_error(`Failed to update email: ${result.message || 'Unknown error'}`);
                    }
                } else if (!email._deleted && email._is_new) {
                    const response = await config.apiCall(config.api.base + '/data', {
                        method: 'POST',
                        headers: config.getAuthHeaders(),
                        body: JSON.stringify({
                            model: 'Email',
                            operation: 'create',
                            data: { ...email, user_id }
                        })
                    });
                    const result = await response.json();
                    if (!result.success) {
                        show_error(`Failed to create email: ${result.message || 'Unknown error'}`);
                    }
                } else if (email.id && email._deleted) {
                    const response = await config.apiCall(config.api.base + '/data', {
                        method: 'POST',
                        headers: config.getAuthHeaders(),
                        body: JSON.stringify({
                            model: 'Email',
                            operation: 'delete',
                            id: email.id
                        })
                    });
                    const result = await response.json();
                    if (!result.success) {
                        show_error(`Failed to delete email: ${result.message || 'Unknown error'}`);
                    }
                }
            } catch (error) {
                show_error('Network error saving emails');
            }
        }
    }, []);

    const save_socials = useCallback(async (user_id, socials, is_edit_mode) => {
        for (const social of socials) {
            try {
                if (social.id && !social._is_new && !social._deleted) {
                    const response = await config.apiCall(config.api.base + '/data', {
                        method: 'POST',
                        headers: config.getAuthHeaders(),
                        body: JSON.stringify({
                            model: 'SocialContact',
                            operation: 'update',
                            id: social.id,
                            data: { ...social, user_id }
                        })
                    });
                    const result = await response.json();
                    if (!result.success) {
                        show_error(`Failed to update social: ${result.message || 'Unknown error'}`);
                    }
                } else if (!social._deleted && social._is_new) {
                    const response = await config.apiCall(config.api.base + '/data', {
                        method: 'POST',
                        headers: config.getAuthHeaders(),
                        body: JSON.stringify({
                            model: 'SocialContact',
                            operation: 'create',
                            data: { ...social, user_id }
                        })
                    });
                    const result = await response.json();
                    if (!result.success) {
                        show_error(`Failed to create social: ${result.message || 'Unknown error'}`);
                    }
                } else if (social.id && social._deleted) {
                    const response = await config.apiCall(config.api.base + '/data', {
                        method: 'POST',
                        headers: config.getAuthHeaders(),
                        body: JSON.stringify({
                            model: 'SocialContact',
                            operation: 'delete',
                            id: social.id
                        })
                    });
                    const result = await response.json();
                    if (!result.success) {
                        show_error(`Failed to delete social: ${result.message || 'Unknown error'}`);
                    }
                }
            } catch (error) {
                show_error('Network error saving socials');
            }
        }
    }, []);

    const save_addresses = useCallback(async (user_id, addresses, is_edit_mode) => {
        for (const address of addresses) {
            try {
                if (address.id && !address._is_new && !address._deleted) {
                    const response = await config.apiCall(config.api.base + '/data', {
                        method: 'POST',
                        headers: config.getAuthHeaders(),
                        body: JSON.stringify({
                            model: 'Address',
                            operation: 'update',
                            id: address.id,
                            data: { ...address, user_id }
                        })
                    });
                    const result = await response.json();
                    if (!result.success) {
                        show_error(`Failed to update address: ${result.message || 'Unknown error'}`);
                    }
                } else if (!address._deleted && address._is_new) {
                    const response = await config.apiCall(config.api.base + '/data', {
                        method: 'POST',
                        headers: config.getAuthHeaders(),
                        body: JSON.stringify({
                            model: 'Address',
                            operation: 'create',
                            data: { ...address, user_id }
                        })
                    });
                    const result = await response.json();
                    if (!result.success) {
                        show_error(`Failed to create address: ${result.message || 'Unknown error'}`);
                    }
                } else if (address.id && address._deleted) {
                    const response = await config.apiCall(config.api.base + '/data', {
                        method: 'POST',
                        headers: config.getAuthHeaders(),
                        body: JSON.stringify({
                            model: 'Address',
                            operation: 'delete',
                            id: address.id
                        })
                    });
                    const result = await response.json();
                    if (!result.success) {
                        show_error(`Failed to delete address: ${result.message || 'Unknown error'}`);
                    }
                }
            } catch (error) {
                show_error('Network error saving addresses');
            }
        }
    }, []);

    return {
        load_roles,
        load_user,
        save_user
    };
};