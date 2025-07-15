// hooks/useApi.js
import { useCallback } from 'react';
import config from '../../../config';
import { getDefaultDataType, getDefaultVariableType } from '../utils/columnHelper';

export const useApi = () => {
    // Load functions
    const loadConnections = useCallback(async () => {
        const response = await config.apiCall(config.api.base + '/data', {
            method: 'POST',
            headers: config.getAuthHeaders(),
            body: JSON.stringify({
                model: 'Connection',
                operation: 'list'
            })
        });
        const result = await response.json();
        return result.success ? result.data || [] : [];
    }, []);

    const loadTemplates = useCallback(async () => {
        const response = await config.apiCall(config.api.base + '/data', {
            method: 'POST',
            headers: config.getAuthHeaders(),
            body: JSON.stringify({
                model: 'ReportTemplate',
                operation: 'list'
            })
        });
        const result = await response.json();
        return result.success ? result.data || [] : [];
    }, []);


    const loadDataTypes = useCallback(async () => {
        const response = await config.apiCall(config.api.base + '/data', {
            method: 'POST',
            headers: config.getAuthHeaders(),
            body: JSON.stringify({
                model: 'DataType',
                operation: 'list'
            })
        });
        const result = await response.json();
        if (result.success) {
            const types = {};
            result.data.forEach(dt => {
                types[dt.id] = dt;
            });
            return types;
        }
        return {};
    }, []);

    const loadVariableTypes = useCallback(async () => {
        const response = await config.apiCall(config.api.base + '/data', {
            method: 'POST',
            headers: config.getAuthHeaders(),
            body: JSON.stringify({
                model: 'VariableType',
                operation: 'list'
            })
        });
        const result = await response.json();
        if (result.success) {
            const types = {};
            result.data.forEach(vt => {
                types[vt.id] = vt;
            });
            return types;
        }
        return {};
    }, []);

    const loadModels = useCallback(async () => {
        const response = await config.apiCall(config.api.base + '/data', {
            method: 'POST',
            headers: config.getAuthHeaders(),
            body: JSON.stringify({
                model: 'Model',
                operation: 'list',
                order_by: 'name',
                length: 0
            })
        });
        const result = await response.json();
        return result.success ? result.data || [] : [];
    }, []);


    const loadReport = useCallback(async (reportId) => {
        const response = await config.apiCall(config.api.base + '/data', {
            method: 'POST',
            headers: config.getAuthHeaders(),
            body: JSON.stringify({
                model: 'Report',
                operation: 'read',
                id: reportId
            })
        });
        console.log("IN REPORT LOAD");
        const result = await response.json();
        if (result.success && result.data) {
            const report = result.data;

            console.log("IN TAGS");

            // Parse tags
            let tags = '';
            if (report.tags) {
                if (Array.isArray(report.tags)) {
                    tags = report.tags.join(', ');
                } else if (typeof report.tags === 'string') {
                    tags = report.tags;
                }
            }

            console.log("IN DATA");

            const reportData = {
                ...report,
                tags: tags,
                options: report.options || { results_limit: 0, cache_duration_minutes: 60 }
            };

            console.log("IN LOAD THE OTHER STUFF");

            // Load columns and variables
            const [columns, variables, actions] = await Promise.all([
                loadColumns(reportId),
                loadVariables(reportId),
                loadActions(reportId)
            ]);

            console.log("IN LOAD RETURN IT ALL");

            return {
                report: reportData,
                columns,
                variables,
                actions
            };
        }
        return null;
    }, []);

    const loadColumns = useCallback(async (reportId) => {
        const response = await config.apiCall(config.api.base + '/data', {
            method: 'POST',
            headers: config.getAuthHeaders(),
            body: JSON.stringify({
                model: 'ReportColumn',
                operation: 'list',
                filters: { report_id: reportId },
                length: 100
            })
        });
        const result = await response.json();
        return result.success ? result.data || [] : [];
    }, []);

    const loadVariables = useCallback(async (reportId) => {
        const response = await config.apiCall(config.api.base + '/data', {
            method: 'POST',
            headers: config.getAuthHeaders(),
            body: JSON.stringify({
                model: 'ReportVariable',
                operation: 'list',
                filters: { report_id: reportId }
            })
        });
        const result = await response.json();
        return result.success ? result.data || [] : [];
    }, []);

    const loadActions = useCallback(async (reportId) => {
        const response = await config.apiCall(config.api.base + '/data', {
            method: 'POST',
            headers: config.getAuthHeaders(),
            body: JSON.stringify({
                model: 'PageAction',
                operation: 'list',
                filters: { report_id: reportId },
                order_by: 'order_index'
            })
        });
        const result = await response.json();
        return result.success ? result.data || [] : [];
    }, []);

    // Query operations
    const testQuery = useCallback(async (query, connectionId, dataTypes) => {
        // Validate query
        const validateResponse = await config.apiCall(config.api.base + '/reports/validate-query', {
            method: 'POST',
            headers: config.getAuthHeaders(),
            body: JSON.stringify({
                query: query,
                connection_id: connectionId
            })
        });

        const validateResult = await validateResponse.json();
        if (!validateResult.success) {
            throw new Error(validateResult.error || 'Query validation failed');
        }

        // Get metadata
        const metadataResponse = await config.apiCall(config.api.base + '/reports/query-metadata', {
            method: 'POST',
            headers: config.getAuthHeaders(),
            body: JSON.stringify({
                query: query,
                connection_id: connectionId,
                params: {}
            })
        });

        const metadataResult = await metadataResponse.json();
        if (metadataResult.success && metadataResult.data?.columns) {
            const columns = await createColumnsFromMetadata(metadataResult.data.columns, dataTypes);
            return { columns };
        }

        return { columns: [] };
    }, []);

    const createColumnsFromMetadata = useCallback(async (metadataColumns, dataTypes) => {
        const columns = [];

        for (let idx = 0; idx < metadataColumns.length; idx++) {
            const metaCol = metadataColumns[idx];

            // Get suggested settings
            let suggestions = {};
            if (config.suggest_column_settings) {
                try {
                    const response = await config.apiCall(config.suggest_column_settings, {
                        method: 'POST',
                        headers: config.getAuthHeaders(),
                        body: JSON.stringify({
                            column_name: metaCol.name,
                            column_type: metaCol.type
                        })
                    });
                    const result = await response.json();
                    suggestions = result.data || {};
                } catch (error) {
                    console.warn('Failed to get column suggestions:', error);
                }
            }

            // Get default data type based on SQL type
            const defaultDataTypeId = getDefaultDataType(metaCol.type, dataTypes);

            columns.push({
                name: metaCol.name,
                label: suggestions.label || metaCol.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                data_type_id: suggestions.data_type_id || defaultDataTypeId,
                order_index: idx,
                is_searchable: suggestions.is_searchable !== undefined ? suggestions.is_searchable : true,
                is_visible: suggestions.is_visible !== undefined ? suggestions.is_visible : true,
                is_sortable: suggestions.is_sortable !== undefined ? suggestions.is_sortable : true,
                alignment: suggestions.alignment || 'left',
                format_string: suggestions.format_string || null,
                search_type: suggestions.search_type || 'contains',
                width: null,
                options: {}
            });
        }

        return columns;
    }, []);

    const detectVariables = useCallback(async (query, variableTypes) => {
        const response = await config.apiCall(config.api.base + '/reports/detect-variables', {
            method: 'POST',
            headers: config.getAuthHeaders(),
            body: JSON.stringify({ query })
        });

        const result = await response.json();
        if (result.success && result.data?.variables) {
            // Get default variable type (text)
            const defaultVariableTypeId = getDefaultVariableType('text', variableTypes);
            
            const variables = result.data.variables.map((varName, idx) => ({
                name: varName,
                label: varName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                variable_type_id: defaultVariableTypeId,
                order_index: idx,
                is_required: true,
                is_hidden: false,
                default_value: '',
                placeholder: '',
                help_text: ''
            }));

            return { variables };
        }

        return { variables: [] };
    }, []);

    const loadModelQuery = useCallback(async (modelId) => {
        const response = await config.apiCall(config.api.base + '/data', {
            method: 'POST',
            headers: config.getAuthHeaders(),
            body: JSON.stringify({
                model: 'Model',
                operation: 'read',
                id: modelId
            })
        });

        const result = await response.json();
        if (result.success && result.data) {
            const model = result.data;
            let query = '';

            if (model.default_query) {
                query = model.default_query;
            } else if (model.table_name) {
                query = `SELECT * FROM ${model.table_name}`;
            }

            return { query, model };
        }

        throw new Error('No query information available for this model');
    }, []);

    const loadRoutes = useCallback(async () => {
        const response = await config.apiCall(config.api.base + '/data', {
            method: 'POST',
            headers: config.getAuthHeaders(),
            body: JSON.stringify({
                model: 'RouteMapping',
                operation: 'list',
                filters: { is_active: true },
                order_by: 'path',
                length: 0
            })
        });
        const result = await response.json();
        return result.success ? result.data || [] : [];
    }, []);
    
    // Save operations
    const saveReport = useCallback(async ({ reportData, columns, variables, actions, isEditMode, reportId }) => {
        const query = reportData.query;
        const tags = reportData.tags ? reportData.tags.split(',').map(t => t.trim()).filter(t => t) : [];

        const saveData = {
            ...reportData,
            tags: tags,
            model_id: reportData.model_id || null,
            is_model: reportData.is_model && reportData.model_id !== ''
        };

        let response;
        if (isEditMode) {
            response = await config.apiCall(config.api.base + '/data', {
                method: 'POST',
                headers: config.getAuthHeaders(),
                body: JSON.stringify({
                    model: 'Report',
                    operation: 'update',
                    id: reportId,
                    data: saveData
                })
            });
        } else {
            response = await config.apiCall(config.api.base + '/data', {
                method: 'POST',
                headers: config.getAuthHeaders(),
                body: JSON.stringify({
                    model: 'Report',
                    operation: 'create',
                    data: saveData
                })
            });
        }

        const result = await response.json();
        if (result.success) {
            const savedReportId = isEditMode ? reportId : result.data.id;

            // Save columns, variables, and actions
            await Promise.all([
                saveColumns(savedReportId, columns, isEditMode),
                saveVariables(savedReportId, variables, isEditMode),
                saveActions(savedReportId, actions, isEditMode)
            ]);

            return { success: true, reportId: savedReportId };
        }

        throw new Error(result.error || 'Failed to save report');
    }, []);

    const saveColumns = useCallback(async (reportId, columns, isEditMode) => {
        if (columns.length === 0) return;

        // Get existing columns if editing
        let existingColumnsMap = {};
        if (isEditMode) {
            const existingColumns = await loadColumns(reportId);
            existingColumns.forEach(col => {
                existingColumnsMap[col.name] = col;
            });
        }

        // Save each column
        for (let i = 0; i < columns.length; i++) {
            const column = columns[i];
            const existingCol = existingColumnsMap[column.name];

            const columnData = {
                report_id: reportId,
                name: column.name,
                label: column.label,
                data_type_id: column.data_type_id,
                order_index: i,
                is_searchable: column.is_searchable ?? true,
                is_visible: column.is_visible ?? true,
                is_sortable: column.is_sortable ?? true,
                is_pk: column.is_pk ?? false,
                is_identity: column.is_identity ?? false,
                alignment: column.alignment || 'left',
                format_string: column.format_string || null,
                search_type: column.search_type || 'contains',
                width: column.width || null,
                options: column.options || {}
            };

            let response;
            if (existingCol) {
                response = await config.apiCall(config.api.base + '/data', {
                    method: 'POST',
                    headers: config.getAuthHeaders(),
                    body: JSON.stringify({
                        model: 'ReportColumn',
                        operation: 'update',
                        id: existingCol.id,
                        data: columnData
                    })
                });
            } else {
                response = await config.apiCall(config.api.base + '/data', {
                    method: 'POST',
                    headers: config.getAuthHeaders(),
                    body: JSON.stringify({
                        model: 'ReportColumn',
                        operation: 'create',
                        data: columnData
                    })
                });
            }
            
            const result = await response.json();
            if (!result.success) {
                console.error(`Failed to save column ${column.name}:`, result.error);
            }
            
            if (existingCol) {
                delete existingColumnsMap[column.name];
            }
        }

        // Delete removed columns
        for (const colName in existingColumnsMap) {
            const response = await config.apiCall(config.api.base + '/data', {
                method: 'POST',
                headers: config.getAuthHeaders(),
                body: JSON.stringify({
                    model: 'ReportColumn',
                    operation: 'delete',
                    id: existingColumnsMap[colName].id
                })
            });
            const result = await response.json();
            if (!result.success) {
                console.error(`Failed to delete column ${colName}:`, result.error);
            }
        }
    }, [loadColumns]);

    const saveVariables = useCallback(async (reportId, variables, isEditMode) => {
        if (variables.length === 0) return;

        // Get existing variables if editing
        let existingVariablesMap = {};
        if (isEditMode) {
            const existingVariables = await loadVariables(reportId);
            existingVariables.forEach(v => {
                existingVariablesMap[v.name] = v;
            });
        }

        // Save each variable
        for (let i = 0; i < variables.length; i++) {
            const variable = variables[i];
            const existingVar = existingVariablesMap[variable.name];

            const variableData = {
                report_id: reportId,
                name: variable.name,
                label: variable.label,
                variable_type_id: variable.variable_type_id,
                default_value: variable.default_value || null,
                placeholder: variable.placeholder || null,
                help_text: variable.help_text || null,
                is_required: variable.is_required,
                is_hidden: variable.is_hidden || false,
                order_index: i
            };

            let response;
            if (existingVar) {
                response = await config.apiCall(config.api.base + '/data', {
                    method: 'POST',
                    headers: config.getAuthHeaders(),
                    body: JSON.stringify({
                        model: 'ReportVariable',
                        operation: 'update',
                        id: existingVar.id,
                        data: variableData
                    })
                });
            } else {
                response = await config.apiCall(config.api.base + '/data', {
                    method: 'POST',
                    headers: config.getAuthHeaders(),
                    body: JSON.stringify({
                        model: 'ReportVariable',
                        operation: 'create',
                        data: variableData
                    })
                });
            }
            
            const result = await response.json();
            if (!result.success) {
                console.error(`Failed to save variable ${variable.name}:`, result.error);
            }
            
            if (existingVar) {
                delete existingVariablesMap[variable.name];
            }
        }

        // Delete removed variables
        for (const varName in existingVariablesMap) {
            const response = await config.apiCall(config.api.base + '/data', {
                method: 'POST',
                headers: config.getAuthHeaders(),
                body: JSON.stringify({
                    model: 'ReportVariable',
                    operation: 'delete',
                    id: existingVariablesMap[varName].id
                })
            });
            const result = await response.json();
            if (!result.success) {
                console.error(`Failed to delete variable ${varName}:`, result.error);
            }
        }
    }, [loadVariables]);

    const saveActions = useCallback(async (reportId, actions, isEditMode) => {
        // Get existing actions if editing
        let existingActionsMap = {};
        if (isEditMode) {
            const existingActions = await loadActions(reportId);
            existingActions.forEach(action => {
                existingActionsMap[action.name] = action;
            });
        }

        // Save each action
        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            const existingAction = existingActionsMap[action.name];

            const actionData = {
                ...action,
                report_id: reportId,
                order_index: i
            };

            // Remove id from actionData if it exists to avoid conflicts
            delete actionData.id;
            delete actionData.index;

            let response;
            if (existingAction) {
                response = await config.apiCall(config.api.base + '/data', {
                    method: 'POST',
                    headers: config.getAuthHeaders(),
                    body: JSON.stringify({
                        model: 'PageAction',
                        operation: 'update',
                        id: existingAction.id,
                        data: actionData
                    })
                });
            } else {
                response = await config.apiCall(config.api.base + '/data', {
                    method: 'POST',
                    headers: config.getAuthHeaders(),
                    body: JSON.stringify({
                        model: 'PageAction',
                        operation: 'create',
                        data: actionData
                    })
                });
            }

            const result = await response.json();
            if (!result.success) {
                console.error(`Failed to save action ${action.name}:`, result.error);
            }

            if (existingAction) {
                delete existingActionsMap[action.name];
            }
        }

        // Delete removed actions
        for (const actionName in existingActionsMap) {
            const response = await config.apiCall(config.api.base + '/data', {
                method: 'POST',
                headers: config.getAuthHeaders(),
                body: JSON.stringify({
                    model: 'PageAction',
                    operation: 'delete',
                    id: existingActionsMap[actionName].id
                })
            });
            const result = await response.json();
            if (!result.success) {
                console.error(`Failed to delete action ${actionName}:`, result.error);
            }
        }
    }, [loadActions]);
    

    const syncColumns = useCallback(async (reportId, removeMissing) => {
        const response = await config.apiCall(config.api.base + '/reports/sync-columns', {
            method: 'POST',
            headers: config.getAuthHeaders(),
            body: JSON.stringify({
                report_id: reportId,
                remove_missing: removeMissing
            })
        });
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Failed to sync columns');
        }
        return result;
    }, []);

    const runPreview = useCallback(async (reportId, variables) => {
        const response = await config.apiCall(config.api.base + '/reports/preview', {
            method: 'POST',
            headers: config.getAuthHeaders(),
            body: JSON.stringify({
                report_id: reportId,
                limit: 10,
                vars: variables
            })
        });
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Failed to run preview');
        }
        return result.data;
    }, []);

    return {
        // Load functions
        loadConnections,
        loadTemplates,
        loadDataTypes,
        loadVariableTypes,
        loadModels,
        loadReport,
        loadColumns,
        loadVariables,
        loadActions,
        loadRoutes,

        // Query operations
        testQuery,
        detectVariables,
        loadModelQuery,

        // Save operations
        saveReport,

        // Other operations
        syncColumns,
        runPreview
    };
};