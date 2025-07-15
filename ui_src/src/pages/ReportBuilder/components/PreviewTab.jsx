// components/PreviewTab.jsx
import React, { useState } from 'react';
import { Row, Col, Form, Button, Alert, Table, Spinner } from 'react-bootstrap';

const PreviewTab = ({
    isEditMode,
    reportId,
    variables,
    variableTypes,
    api,
    showError,
    showInfo
}) => {
    const [variableValues, setVariableValues] = useState({});
    const [previewData, setPreviewData] = useState(null);
    const [loading, setLoading] = useState(false);
    
    const handleVariableChange = (varName, value) => {
        setVariableValues(prev => ({ ...prev, [varName]: value }));
    };
    
    const runPreview = async () => {
        if (!isEditMode) {
            showInfo('Save the report first to preview it');
            return;
        }
        
        setLoading(true);
        try {
            const data = await api.runPreview(reportId, variableValues);
            setPreviewData(data);
        } catch (error) {
            showError('Preview failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };
    
    const renderVariableInput = (variable) => {
        const varType = variableTypes[variable.variable_type_id];
        const value = variableValues[variable.name] || variable.default_value || '';
        
        switch (varType?.name) {
            case 'date':
                return (
                    <Form.Control
                        type="date"
                        value={value}
                        onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                        required={variable.is_required}
                    />
                );
            
            case 'datetime':
                return (
                    <Form.Control
                        type="datetime-local"
                        value={value}
                        onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                        required={variable.is_required}
                    />
                );
            
            case 'number':
                return (
                    <Form.Control
                        type="number"
                        value={value}
                        onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                        required={variable.is_required}
                    />
                );
            
            case 'select':
                // TODO: Handle select options from variable configuration
                return (
                    <Form.Select
                        value={value}
                        onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                        required={variable.is_required}
                    >
                        <option value="">Select...</option>
                    </Form.Select>
                );
            
            default:
                return (
                    <Form.Control
                        type="text"
                        value={value}
                        onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                        placeholder={variable.placeholder}
                        required={variable.is_required}
                    />
                );
        }
    };
    
    if (!isEditMode) {
        return (
            <Alert variant="info" className="mt-3">
                Save the report first to preview it.
            </Alert>
        );
    }
    
    return (
        <div className="mt-3">
            <Row>
                <Col md={6}>
                    <h5>Variable Values</h5>
                    {variables.filter(v => !v.is_hidden).length === 0 ? (
                        <p className="text-muted">No variables required for this report.</p>
                    ) : (
                        variables.filter(v => !v.is_hidden).map(variable => (
                            <Form.Group key={variable.name} className="mb-3">
                                <Form.Label>
                                    {variable.display_name}
                                    {variable.is_required && ' *'}
                                </Form.Label>
                                {renderVariableInput(variable)}
                                {variable.help_text && (
                                    <Form.Text className="text-muted">{variable.help_text}</Form.Text>
                                )}
                            </Form.Group>
                        ))
                    )}
                    
                    <Button 
                        variant="primary" 
                        onClick={runPreview}
                        disabled={loading}
                    >
                        {loading && <Spinner size="sm" animation="border" className="me-2" />}
                        Run Preview
                    </Button>
                </Col>
            </Row>
            
            {previewData && (
                <div className="mt-4">
                    <h5>Preview Results</h5>
                    {previewData.data && previewData.data.length > 0 ? (
                        <>
                            <div className="table-responsive">
                                <Table striped bordered hover>
                                    <thead className="table-dark">
                                        <tr>
                                            {Object.keys(previewData.data[0]).map(header => (
                                                <th key={header}>{header}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.data.map((row, idx) => (
                                            <tr key={idx}>
                                                {Object.values(row).map((value, vidx) => (
                                                    <td key={vidx}>
                                                        {value !== null ? String(value) : <em className="text-muted">null</em>}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                            <p className="text-muted mt-2">
                                Showing {previewData.data.length} of {previewData.recordsTotal || previewData.data.length} total records
                            </p>
                        </>
                    ) : (
                        <Alert variant="info">No results found</Alert>
                    )}
                </div>
            )}
        </div>
    );
};

export default PreviewTab;