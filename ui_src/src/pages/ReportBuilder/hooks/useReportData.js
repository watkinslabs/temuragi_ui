// hooks/useReportData.js
import { useState, useEffect } from 'react';

export const useReportData = (initialReportId) => {
    const [reportId, setReportId] = useState(initialReportId || null);
    const [isEditMode, setIsEditMode] = useState(!!initialReportId);
    
    // Report data
    const [reportData, setReportData] = useState({
        name: '',
        slug: '',
        display: '',
        description: '',
        category: '',
        tags: '',
        query: 'SELECT * FROM temuragi.public.users',
        connection_id: '',
        report_template_id: '',
        model_id: '',
        is_wide: false,
        is_ajax: false,
        is_auto_run: false,
        is_searchable: false,
        is_public: false,
        is_model: false,
        is_download_csv: false,
        is_download_xlsx: false,
        is_published: true,
        options: {
            results_limit: 0,
            cache_duration_minutes: 60
        }
    });
    
    // Lists and lookups
    const [connections, setConnections] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [models, setModels] = useState([]);
    const [categories, setCategories] = useState([]);
    const [dataTypes, setDataTypes] = useState({});
    const [variableTypes, setVariableTypes] = useState({});
    const [routes, setRoutes] = useState([]);

    
    // Columns and variables
    const [columns, setColumns] = useState([]);
    const [variables, setVariables] = useState([]);
    const [columnIds, setColumnIds] = useState({});
    const [variableIds, setVariableIds] = useState({});
    
    // Actions
    const [actions, setActions] = useState([]);
    
    return {
        // Core state
        reportId,
        setReportId,
        isEditMode,
        setIsEditMode,
        
        // Report data
        reportData,
        setReportData,
        
        // Lists
        connections,
        setConnections,
        templates,
        setTemplates,
        models,
        setModels,
        categories,
        setCategories,
        dataTypes,
        setDataTypes,
        variableTypes,
        setVariableTypes,
        routes,    
        setRoutes, 
        
        // Columns and variables
        columns,
        setColumns,
        variables,
        setVariables,
        columnIds,
        setColumnIds,
        variableIds,
        setVariableIds,
        
        // Actions
        actions,
        setActions
    };
};