// hooks/useApi.js
import { useCallback } from 'react';
import config from '../../config';
import { getDefaultDataType, getDefaultVariableType } from '../utils/columnHelpers';

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
        const response = await config.apiCall(config.api.base + '/reports/templates', {
            method: 'GET',
            headers: config.getAuthHeaders()
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
    
    const loadCategories = useCallback(async () => {
        const response = await config.apiCall(config.api.base + '/reports/stats', {
            method: 'GET',
            headers: config.getAuthHeaders()
        });
        const result = await response.json();
        if (result.success && result.data?.categories) {
            return Object.keys(result.data.categories).filter(c => c);
        }
        return [];
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
        
        const result = await response.json();
        if (result.success && result.data) {
            const report = result.data;
            
            // Parse tags
            let tags = '';
            if (report.tags) {
                if (Array.isArray(report.tags)) {
                    tags = report.tags.join(', ');
                } else if (typeof report.tags === 'string') {
                    tags = report.tags;
                }
            }
            
            const reportData = {
                ...report,
                tags: tags,
                options: report.options || { results_limit: 0, cache_duration_minutes: 60 }
            };
            
            // Load columns and variables
            const [columns, variables, actions] = await Promise.all([
                loadColumns(reportId),
                loadVariables(reportId),
                loadActions(reportId)
            ]);
            
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
        const result = await apiCall(config.data_api, {
            model: 'ReportColumn',
            operation: 'list',
            filters: { report_id: reportId },
            length: 100
        });
        return result.data || [];
    }, [config.data_api]);
    
    const loadVariables = useCallback(async (reportId) => {
        const result = await apiCall(config.data_api, {
            model: 'ReportVariable',
            operation: 'list',
            filters: { report_id: reportId }
        });
        return result.data || [];
    }, [config.data_api]);
    
    const loadActions = useCallback(async (reportId) => {
        const result = await apiCall(config.data_api, {
            model: 'PageAction',
            operation: 'list',
            filters: { report_id: reportId },
            order_by: 'order_index'
        });
        return result.data || [];
    }, [config.data_api]);
    
    // Query operations
    const testQuery = useCallback(async (query, connectionId) => {
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
            const columns = await createColumnsFromMetadata(metadataResult.data.columns);
            return { columns };
        }
        
        return { columns: [] };
    }, []);
    
    const createColumnsFromMetadata = useCallback(async (metadataColumns) => {
        const columns = [];
        
        for (let idx = 0; idx < metadataColumns.length; idx++) {
            const metaCol = metadataColumns[idx];
            
            // Get suggested settings
            let suggestions = {};
            if (config.suggest_column_settings) {
                try {
                    const result = await apiCall(config.suggest_column_settings, {
                        column_name: metaCol.name,
                        column_type: metaCol.type
                    });
                    suggestions = result.data || {};
                } catch (error) {
                    console.warn('Failed to get column suggestions:', error);
                }
            }
            
            columns.push({
                name: metaCol.name,
                display_name: suggestions.display_name || metaCol.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                data_type_id: suggestions.data_type_id || null, // Will be set by getDefaultDataType
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
    }, [config.suggest_column_settings]);
    
    const detectVariables = useCallback(async (query) => {
        const response = await config.apiCall(config.api.base + '/reports/detect-variables', {
            method: 'POST',
            headers: config.getAuthHeaders(),
            body: JSON.stringify({ query })
        });
        
        const result = await response.json();
        if (result.success && result.data?.variables) {
            const variables = result.data.variables.map((varName, idx) => ({
                name: varName,
                display_name: varName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                variable_type_id: null, // Will be set by getDefaultVariableType
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
        const result = await apiCall(config.data_api, {
            model: 'Model',
            operation: 'read',
            id: modelId
        });
        
        if (result.data) {
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
    }, [config.data_api]);
    
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
                display_name: column.display_name,
                data_type_id: column.data_type_id,
                order_index: i,
                is_searchable: column.is_searchable ?? true,
                is_visible: column.is_visible ?? true,
                is_sortable: column.is_sortable ?? true,
                alignment: column.alignment || 'left',
                format_string: column.format_string || null,
                search_type: column.search_type || 'contains',
                width: column.width || null,
                options: column.options || {}
            };
            
            if (existingCol) {
                await apiCall(config.data_api, {
                    model: 'ReportColumn',
                    operation: 'update',
                    id: existingCol.id,
                    data: columnData
                });
                delete existingColumnsMap[column.name];
            } else {
                await apiCall(config.data_api, {
                    model: 'ReportColumn',
                    operation: 'create',
                    data: columnData
                });
            }
        }
        
        // Delete removed columns
        for (const colName in existingColumnsMap) {
            await apiCall(config.data_api, {
                model: 'ReportColumn',
                operation: 'delete',
                id: existingColumnsMap[colName].id
            });
        }
    }, [config.data_api, loadColumns]);
    
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
                display_name: variable.display_name,
                variable_type_id: variable.variable_type_id,
                default_value: variable.default_value || null,
                placeholder: variable.placeholder || null,
                help_text: variable.help_text || null,
                is_required: variable.is_required,
                is_hidden: variable.is_hidden || false,
                order_index: i
            };
            
            if (existingVar) {
                await apiCall(config.data_api, {
                    model: 'ReportVariable',
                    operation: 'update',
                    id: existingVar.id,
                    data: variableData
                });
                delete existingVariablesMap[variable.name];
            } else {
                await apiCall(config.data_api, {
                    model: 'ReportVariable',
                    operation: 'create',
                    data: variableData
                });
            }
        }
        
        // Delete removed variables
        for (const varName in existingVariablesMap) {
            await apiCall(config.data_api, {
                model: 'ReportVariable',
                operation: 'delete',
                id: existingVariablesMap[varName].id
            });
        }
    }, [config.data_api, loadVariables]);
    
    const saveActions = useCallback(async (reportId, actions, isEditMode) => {
        // Delete existing actions first
        if (isEditMode) {
            const existing = await loadActions(reportId);
            for (const action of existing) {
                await apiCall(config.data_api, {
                    model: 'PageAction',
                    operation: 'delete',
                    id: action.id
                });
            }
        }
        
        // Create all current actions
        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            await apiCall(config.data_api, {
                model: 'PageAction',
                operation: 'create',
                data: {
                    ...action,
                    report_id: reportId,
                    order_index: i
                }
            });
        }
    }, [config.data_api, loadActions]);
    
    const syncColumns = useCallback(async (reportId, removeMissing) => {
        const result = await apiCall(config.sync_columns, {
            report_id: reportId,
            remove_missing: removeMissing
        });
        return result;
    }, [config.sync_columns]);
    
    const runPreview = useCallback(async (reportId, variables) => {
        const result = await apiCall(config.preview_report, {
            report_id: reportId,
            limit: 10,
            vars: variables
        });
        return result.data;
    }, [config.preview_report]);
    
    return {
        // Load functions
        loadConnections,
        loadTemplates,
        loadDataTypes,
        loadVariableTypes,
        loadModels,
        loadCategories,
        loadReport,
        loadColumns,
        loadVariables,
        loadActions,
        
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