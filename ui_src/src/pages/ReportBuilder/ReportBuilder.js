/**
 * @routes ["ReportBuilder"]
*/
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

const ReportBuilder = ({ route_params = {} }) => {
    // Get navigation from route_params or extract from URL
    const report_id = route_params.id || route_params.report_id || null;
    const from_view = route_params.from || 'ReportList';
    const from_params = route_params.from_params || {};

    // Get navigation hook
    const useNavigation = window.useNavigation;
    const { navigate_to } = useNavigation ? useNavigation() : { navigate_to: window.navigate_to };

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
        routes,
        setRoutes,
        dataTypes,
        setDataTypes,
        variableTypes,
        setVariableTypes,
        categories,
        isEditMode,
        setIsEditMode,
        reportId,
        setReportId
    } = useReportData(report_id);

    // Navigation handlers
    const handle_back = () => {
        navigate_to(from_view, from_params);
    };

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
                const [connectionsData, dataTypesData, variableTypesData, modelsData, routesData, templatesData] = await Promise.all([
                    api.loadConnections(),
                    api.loadDataTypes(),
                    api.loadVariableTypes(),
                    api.loadModels(),
                    api.loadRoutes(),
                    api.loadTemplates()
                    
                ]);

                setConnections(connectionsData);
                setTemplates(templatesData);
                setDataTypes(dataTypesData);
                setVariableTypes(variableTypesData);
                setModels(modelsData);
                setRoutes(routesData);

                // If editing, load existing report
                if (isEditMode && reportId) {
                    const reportResult = await api.loadReport(reportId);
                    console.log(reportResult);

                    if (reportResult) {
                        console.log(reportResult);
                        setReportData(reportResult.report);
                        setColumns(reportResult.columns);
                        setVariables(reportResult.variables);
                        setActions(reportResult.actions || []);
                    }
                }

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
                    // Navigate to edit mode with the new report ID
                    navigate_to('ReportBuilder', {
                        id: result.reportId,
                        from: from_view,
                        from_params: from_params
                    });
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

            {/* Header with Back Button */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex align-items-center justify-content-between">
                        <h4 className="mb-0">
                            <i className="fas fa-chart-line me-2"></i>
                            {isEditMode ? 'Edit Report' : 'Create Report'}
                        </h4>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handle_back}
                        >
                            <i className="fas fa-arrow-left me-2"></i>
                            Back
                        </Button>
                    </div>
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
                                dataTypes={dataTypes}
                                onTestQuery={(dataTypes) => api.testQuery(reportData.query, reportData.connection_id, dataTypes)}
                                onDetectVariables={() => api.detectVariables(reportData.query, variableTypes)}
                                onColumnsDetected={setColumns}
                                onVariablesDetected={setVariables}
                                showSuccess={showSuccess}
                                showError={showError}
                                showInfo={showInfo}
                                isActive={activeTab === 'query'}
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
                                routes={routes}
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
                <Card.Footer className="text-end">
                    <Button
                        variant="success"
                        onClick={saveReport}
                        disabled={loading}
                    >
                        {loading && <Spinner size="sm" animation="border" className="me-2" />}
                        <i className={isEditMode ? "fas fa-save me-2" : "fas fa-plus-circle me-2"}></i>
                        {isEditMode ? 'Save Changes' : 'Create Report'}
                    </Button>
                </Card.Footer>
            </Card>
        </Container>
    );
};

export default ReportBuilder;
