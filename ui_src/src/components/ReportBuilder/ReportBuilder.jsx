// ReportBuilder.jsx
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Tabs, Tab, Spinner, Alert } from 'react-bootstrap';
import BasicInfoTab from './components/BasicInfoTab';
import QueryTab from './components/QueryTab';
import ColumnsTab from './components/ColumnsTab';
import VariablesTab from './components/VariablesTab';
import ActionsTab from './components/ActionsTab';
import PreviewTab from './components/PreviewTab';
import { useReportData } from './hooks/useReportData';
import { useApi } from './hooks/useApi';
import config from '../config';

const ReportBuilder = ({ report_id = null }) => {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');
    const [alerts, setAlerts] = useState([]);
    
    const api = useApi();
    const {
        reportData,
        setReportData,
        columns,
        setColumns,
        variables,
        setVariables,
        actions,
        setActions,
        connections,
        setConnections,
        templates,
        setTemplates,
        models,
        setModels,
        dataTypes,
        setDataTypes,
        variableTypes,
        setVariableTypes,
        categories,
        setCategories,
        isEditMode,
        setIsEditMode,
        reportId,
        setReportId
    } = useReportData(report_id);
    
    // Alert management
    const showAlert = (message, type = 'danger') => {
        const id = Date.now();
        setAlerts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setAlerts(prev => prev.filter(alert => alert.id !== id));
        }, 5000);
    };
    
    const showSuccess = (message) => window.showToast?.(message, 'success');
    const showError = (message) => window.showToast?.(message, 'error');
    const showInfo = (message) => window.showToast?.(message, 'info');
    
    // Initialize data on mount
    useEffect(() => {
        const initializeData = async () => {
            setLoading(true);
            try {
                // Load all lookup data in parallel
                const [connectionsData, templatesData, dataTypesData, variableTypesData, modelsData] = await Promise.all([
                    api.loadConnections(),
                    api.loadTemplates(),
                    api.loadDataTypes(),
                    api.loadVariableTypes(),
                    api.loadModels()
                ]);
                
                setConnections(connectionsData);
                setTemplates(templatesData);
                setDataTypes(dataTypesData);
                setVariableTypes(variableTypesData);
                setModels(modelsData);
                
                // If editing, load existing report
                if (isEditMode && reportId) {
                    const reportResult = await api.loadReport(reportId);
                    if (reportResult) {
                        setReportData(reportResult.report);
                        setColumns(reportResult.columns);
                        setVariables(reportResult.variables);
                        setActions(reportResult.actions || []);
                    }
                }
                
                // Load categories
                const categoriesData = await api.loadCategories();
                setCategories(categoriesData);
                
            } catch (error) {
                showError('Failed to initialize: ' + error.message);
            } finally {
                setLoading(false);
            }
        };
        
        initializeData();
    }, []);
    
    // Save report
    const saveReport = async () => {
        setLoading(true);
        try {
            const result = await api.saveReport({
                reportData,
                columns,
                variables,
                actions,
                isEditMode,
                reportId
            });
            
            if (result.success) {
                showSuccess('Report saved successfully!');
                
                if (!isEditMode) {
                    setReportId(result.reportId);
                    setIsEditMode(true);
                    // Update URL if needed
                    window.history.replaceState({}, '', `/reports/builder/${result.reportId}`);
                }
            }
        } catch (error) {
            showError('Failed to save report: ' + error.message);
        } finally {
            setLoading(false);
        }
    };
    
    if (loading && !reportData.name) {
        return (
            <Container className="text-center p-5">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </Container>
        );
    }
    
    return (
        <Container fluid>
            {/* Alerts */}
            <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1050 }}>
                {alerts.map(alert => (
                    <Alert
                        key={alert.id}
                        variant={alert.type}
                        dismissible
                        onClose={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
                    >
                        {alert.message}
                    </Alert>
                ))}
            </div>
            
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <h2>{isEditMode ? 'Edit Report' : 'Create Report'}</h2>
                    <Button 
                        variant="success" 
                        onClick={saveReport}
                        disabled={loading}
                    >
                        {loading && <Spinner size="sm" animation="border" className="me-2" />}
                        {isEditMode ? 'Save Report' : 'Create Report'}
                    </Button>
                </Col>
            </Row>
            
            {/* Main Content */}
            <Card>
                <Card.Body>
                    <Tabs activeKey={activeTab} onSelect={setActiveTab}>
                        <Tab eventKey="basic" title="Basic Info">
                            <BasicInfoTab
                                reportData={reportData}
                                setReportData={setReportData}
                                connections={connections}
                                templates={templates}
                                models={models}
                                categories={categories}
                                isEditMode={isEditMode}
                                onModelSelect={(modelId) => api.loadModelQuery(modelId)}
                            />
                        </Tab>
                        
                        <Tab eventKey="query" title="Query">
                            <QueryTab
                                reportData={reportData}
                                setReportData={setReportData}
                                onTestQuery={() => api.testQuery(reportData.query, reportData.connection_id)}
                                onDetectVariables={() => api.detectVariables(reportData.query)}
                                onColumnsDetected={setColumns}
                                onVariablesDetected={setVariables}
                                showSuccess={showSuccess}
                                showError={showError}
                                showInfo={showInfo}
                            />
                        </Tab>
                        
                        <Tab eventKey="columns" title="Columns">
                            <ColumnsTab
                                columns={columns}
                                setColumns={setColumns}
                                dataTypes={dataTypes}
                                isEditMode={isEditMode}
                                reportId={reportId}
                                api={api}
                                showSuccess={showSuccess}
                                showError={showError}
                            />
                        </Tab>
                        
                        <Tab eventKey="variables" title="Variables">
                            <VariablesTab
                                variables={variables}
                                setVariables={setVariables}
                                variableTypes={variableTypes}
                            />
                        </Tab>
                        
                        <Tab eventKey="actions" title="Actions">
                            <ActionsTab
                                actions={actions}
                                setActions={setActions}
                            />
                        </Tab>
                        
                        <Tab eventKey="preview" title="Preview">
                            <PreviewTab
                                isEditMode={isEditMode}
                                reportId={reportId}
                                variables={variables}
                                variableTypes={variableTypes}
                                api={api}
                                showError={showError}
                                showInfo={showInfo}
                            />
                        </Tab>
                    </Tabs>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default ReportBuilder;

// Register globally
window.Components = window.Components || {};
window.Components.ReportBuilder = ReportBuilder;