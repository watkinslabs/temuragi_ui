// components/BasicInfoTab.jsx
import React from 'react';
import { Row, Col, Form } from 'react-bootstrap';

const BasicInfoTab = ({
    reportData,
    setReportData,
    connections,
    templates,
    models,
    categories,
    isEditMode,
    onModelSelect
}) => {
    const handleFieldChange = (field, value) => {
        setReportData(prev => ({ ...prev, [field]: value }));
    };

    const handleOptionChange = (field, value) => {
        setReportData(prev => ({
            ...prev,
            options: { ...prev.options, [field]: value }
        }));
    };

    const handleNameChange = (name) => {
        const changes = { name };
        if (!isEditMode) {
            // Auto-generate slug from name
            changes.slug = name.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
        }
        setReportData(prev => ({ ...prev, ...changes }));
    };

    const handleModelChange = (modelId) => {
        handleFieldChange('model_id', modelId);
        if (modelId && reportData.is_model) {
            onModelSelect(modelId);
        }
    };

    return (
        <Row className="mt-3">
            <Col md={6}>
                <Form.Group className="mb-3">
                    <Form.Label>Report Name *</Form.Label>
                    <Form.Control
                        type="text"
                        value={reportData.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="My Report"
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Report Slug *</Form.Label>
                    <Form.Control
                        type="text"
                        value={reportData.slug}
                        onChange={(e) => handleFieldChange('slug', e.target.value)}
                        placeholder="my-report"
                        readOnly={isEditMode}
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Display Name</Form.Label>
                    <Form.Control
                        type="text"
                        value={reportData.display}
                        onChange={(e) => handleFieldChange('display', e.target.value)}
                        placeholder="Display name (optional)"
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Connection *</Form.Label>
                    <Form.Select
                        value={reportData.connection_id || ''}
                        onChange={(e) => handleFieldChange('connection_id', e.target.value)}
                    >
                        <option value="">Select a connection...</option>
                        {(connections || []).map(conn => (
                            <option key={conn.id} value={conn.id}>
                                {conn.name} {conn.db_type ? `(${conn.db_type})` : ''}
                            </option>
                        ))}
                    </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Template</Form.Label>
                    <Form.Select
                        value={reportData.report_template_id || ''}
                        onChange={(e) => handleFieldChange('report_template_id', e.target.value)}
                    >
                        <option value="">Default template</option>
                        {(templates || []).map(template => (
                            <option key={template.id} value={template.id}>
                                {template.display_name}
                            </option>
                        ))}
                    </Form.Select>
                </Form.Group>
            </Col>

            <Col md={6}>
                <Form.Group className="mb-3">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        value={reportData.description}
                        onChange={(e) => handleFieldChange('description', e.target.value)}
                        placeholder="Report description..."
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Category</Form.Label>
                    <Form.Control
                        type="text"
                        list="categoryList"
                        value={reportData.category}
                        onChange={(e) => handleFieldChange('category', e.target.value)}
                        placeholder="Category"
                    />
                    <datalist id="categoryList">
                        {(categories || []).map(cat => (
                            <option key={cat} value={cat} />
                        ))}
                    </datalist>
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Tags</Form.Label>
                    <Form.Control
                        type="text"
                        value={reportData.tags}
                        onChange={(e) => handleFieldChange('tags', e.target.value)}
                        placeholder="tag1, tag2, tag3"
                    />
                    <Form.Text className="text-muted">Comma-separated list of tags</Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Check
                        type="checkbox"
                        label="Use Model"
                        checked={reportData.is_model}
                        onChange={(e) => {
                            const checked = e.target.checked;
                            handleFieldChange('is_model', checked);
                            if (!checked) {
                                handleFieldChange('model_id', '');
                            }
                        }}
                    />
                </Form.Group>

                {reportData.is_model && (
                    <Form.Group className="mb-3">
                        <Form.Label>Model</Form.Label>
                        <Form.Select
                            value={reportData.model_id}
                            onChange={(e) => handleModelChange(e.target.value)}
                        >
                            <option value="">None - Custom Query</option>
                            {(models || []).map(model => (
                                <option key={model.id} value={model.id || ''}>
                                    {model.name} {model.table_name ? `(${model.table_name})` : ''}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                )}
            </Col>

            <Col md={12}>
                <h5>Report Options</h5>
                <Row>
                    <Col md={3}>
                        <Form.Check
                            type="checkbox"
                            label="Wide Layout"
                            checked={reportData.is_wide}
                            onChange={(e) => handleFieldChange('is_wide', e.target.checked)}
                        />
                        <Form.Check
                            type="checkbox"
                            label="AJAX Loading"
                            checked={reportData.is_ajax}
                            onChange={(e) => handleFieldChange('is_ajax', e.target.checked)}
                        />
                        <Form.Check
                            type="checkbox"
                            label="Auto Run"
                            checked={reportData.is_auto_run}
                            onChange={(e) => handleFieldChange('is_auto_run', e.target.checked)}
                        />
                    </Col>
                    <Col md={3}>
                        <Form.Check
                            type="checkbox"
                            label="Searchable"
                            checked={reportData.is_searchable}
                            onChange={(e) => handleFieldChange('is_searchable', e.target.checked)}
                        />
                        <Form.Check
                            type="checkbox"
                            label="Public"
                            checked={reportData.is_public}
                            onChange={(e) => handleFieldChange('is_public', e.target.checked)}
                        />
                        <Form.Check
                            type="checkbox"
                            label="Published"
                            checked={reportData.is_published}
                            onChange={(e) => handleFieldChange('is_published', e.target.checked)}
                        />
                    </Col>
                    <Col md={3}>
                        <Form.Check
                            type="checkbox"
                            label="Download CSV"
                            checked={reportData.is_download_csv}
                            onChange={(e) => handleFieldChange('is_download_csv', e.target.checked)}
                        />
                        <Form.Check
                            type="checkbox"
                            label="Download XLSX"
                            checked={reportData.is_download_xlsx}
                            onChange={(e) => handleFieldChange('is_download_xlsx', e.target.checked)}
                        />
                    </Col>
                    <Col md={3}>
                        <Form.Group className="mb-2">
                            <Form.Label>Results Limit</Form.Label>
                            <Form.Control
                                type="number"
                                size="sm"
                                value={reportData.options.results_limit}
                                onChange={(e) => handleOptionChange('results_limit', parseInt(e.target.value) || 0)}
                            />
                        </Form.Group>
                        <Form.Group>
                            <Form.Label>Cache (minutes)</Form.Label>
                            <Form.Control
                                type="number"
                                size="sm"
                                value={reportData.options.cache_duration_minutes}
                                onChange={(e) => handleOptionChange('cache_duration_minutes', parseInt(e.target.value) || 60)}
                            />
                        </Form.Group>
                    </Col>
                </Row>
            </Col>
        </Row>
    );
};

export default BasicInfoTab;