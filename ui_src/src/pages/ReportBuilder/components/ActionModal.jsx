// components/ActionModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { UnControlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/mode/javascript/javascript';

const ActionModal = ({ show, onHide, action, onSave, routes }) => {
    console.log('ActionModal routes:', routes);
    const [formData, setFormData] = useState({
        name: '',
        label: '',
        mode: 'row',
        action_type: 'navigate',
        icon: '',
        color: '',
        route_id: '',
        url: '',
        url_for: '',
        method: 'GET',
        order_index:0,
        target: '_self',
        headers: '{}',
        payload: '{}',
        javascript_code: '',
        confirm: false,
        confirm_message: 'Are you sure you want to perform this action?'
    });

    const [errors, setErrors] = useState({});
    const jsEditorRef = useRef(null);

    useEffect(() => {
        if (action) {
            setFormData({
                ...formData,
                ...action,
                headers: JSON.stringify(action.headers || {}, null, 2),
                payload: JSON.stringify(action.payload || {}, null, 2)
            });
        } else {
            setFormData({
                name: '',
                label: '',
                mode: 'row',
                action_type: 'navigate',
                icon: '',
                color: '',
                route_id: '',
                url: '',
                url_for: '',
                order_index:0,
                method: 'GET',
                target: '_self',
                headers: '{}',
                payload: '{}',
                javascript_code: '',
                confirm: false,
                confirm_message: 'Are you sure you want to perform this action?'
            });
        }
    }, [action, show]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: null }));
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name) newErrors.name = 'Name is required';
        if (!formData.label) newErrors.label = 'Label text is required';

        if (formData.action_type !== 'javascript' && !formData.url) {
            newErrors.url = 'URL is required for HTMX and API actions';
        }

        if (formData.action_type === 'javascript' && !formData.javascript_code.trim()) {
            newErrors.javascript_code = 'JavaScript code is required';
        }

        try {
            JSON.parse(formData.headers);
        } catch (e) {
            newErrors.headers = 'Invalid JSON';
        }

        try {
            JSON.parse(formData.payload);
        } catch (e) {
            newErrors.payload = 'Invalid JSON';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;

        const actionData = {
            ...formData,
            headers: JSON.parse(formData.headers),
            payload: JSON.parse(formData.payload),
            javascript_code: formData.action_type === 'javascript' ? formData.javascript_code : null
        };

        onSave(actionData);
    };

    return (
        <Modal show={show} onHide={onHide} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>{action ? 'Edit Action' : 'Add Action'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Row>
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label>Name *</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                isInvalid={!!errors.name}
                            />
                            <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label>Label Text *</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.label}
                                onChange={(e) => handleChange('label', e.target.value)}
                                isInvalid={!!errors.label}
                            />
                            <Form.Control.Feedback type="invalid">{errors.label}</Form.Control.Feedback>
                        </Form.Group>
                    </Col>
                </Row>

                <Row>
                    <Col md={4}>
                        <Form.Group className="mb-3">
                            <Form.Label>Mode</Form.Label>
                            <Form.Select
                                value={formData.mode}
                                onChange={(e) => handleChange('mode', e.target.value)}
                            >
                                <option value="row">Row Action</option>
                                <option value="bulk">Bulk Action</option>
                                <option value="page">Page Action</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={4}>
                        <Form.Group className="mb-3">
                            <Form.Label>Action Type</Form.Label>
                            <Form.Select
                                value={formData.action_type}
                                onChange={(e) => handleChange('action_type', e.target.value)}
                            >
                                <option value="navigate">React View</option>
                                <option value="api">API</option>
                                <option value="javascript">JavaScript</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={4}>
                        <Form.Group className="mb-3">
                            <Form.Label>Icon</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.icon}
                                onChange={(e) => handleChange('icon', e.target.value)}
                                placeholder="fas fa-edit"
                            />
                        </Form.Group>
                    </Col>
                </Row>

                <Row>
                    <Col md={4}>
                        <Form.Group className="mb-3">
                            <Form.Label>Color</Form.Label>
                            <Form.Select
                                value={formData.color}
                                onChange={(e) => handleChange('color', e.target.value)}
                            >
                                <option value="">Default</option>
                                <option value="primary">Primary</option>
                                <option value="secondary">Secondary</option>
                                <option value="success">Success</option>
                                <option value="danger">Danger</option>
                                <option value="warning">Warning</option>
                                <option value="info">Info</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>

                {formData.action_type !== 'javascript' ? (
                    <>
                        {formData.action_type === 'navigate' && (
                            <Form.Group className="mb-3">
                                <Form.Label>Route</Form.Label>
                                <Form.Select
                                    value={formData.route_id || ''}
                                    onChange={(e) => handleChange('route_id', e.target.value)}
                                >
                                    <option value="">Select a route...</option>
                                    {(routes || []).map(route => (
                                        <option key={route.id} value={route.id}>
                                            {route.name} ({route.path})
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        )}
                        
                        <Form.Group className="mb-3">
                            <Form.Label>URL *</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.url}
                                onChange={(e) => handleChange('url', e.target.value)}
                                isInvalid={!!errors.url}
                                placeholder="/api/reports/{id}/action"
                            />
                            <Form.Control.Feedback type="invalid">{errors.url}</Form.Control.Feedback>
                        </Form.Group>

                        <Row>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Method</Form.Label>
                                    <Form.Select
                                        value={formData.method}
                                        onChange={(e) => handleChange('method', e.target.value)}
                                    >
                                        <option value="GET">GET</option>
                                        <option value="POST">POST</option>
                                        <option value="PUT">PUT</option>
                                        <option value="DELETE">DELETE</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Target</Form.Label>
                                    <Form.Select
                                        value={formData.target}
                                        onChange={(e) => handleChange('target', e.target.value)}
                                    >
                                        <option value="_self">Same Window</option>
                                        <option value="_blank">New Window</option>
                                        <option value="#modal">Modal</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Headers (JSON)</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        value={formData.headers}
                                        onChange={(e) => handleChange('headers', e.target.value)}
                                        isInvalid={!!errors.headers}
                                    />
                                    <Form.Control.Feedback type="invalid">{errors.headers}</Form.Control.Feedback>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Payload (JSON)</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        value={formData.payload}
                                        onChange={(e) => handleChange('payload', e.target.value)}
                                        isInvalid={!!errors.payload}
                                    />
                                    <Form.Control.Feedback type="invalid">{errors.payload}</Form.Control.Feedback>
                                </Form.Group>
                            </Col>
                        </Row>
                    </>
                ) : (
                    <Form.Group className="mb-3">
                        <Form.Label>JavaScript Code *</Form.Label>
                        <div style={{ border: '1px solid #ddd' }}>
                            <CodeMirror
                                value={formData.javascript_code}
                                options={{
                                    mode: 'javascript',
                                    theme: 'monokai',
                                    lineNumbers: true,
                                    lineWrapping: true
                                }}
                                onChange={(editor, data, value) => {
                                    handleChange('javascript_code', value);
                                }}
                                editorDidMount={(editor) => {
                                    jsEditorRef.current = editor;
                                    editor.setSize(null, 200);
                                }}
                            />
                        </div>
                        {errors.javascript_code && (
                            <div className="text-danger small mt-1">{errors.javascript_code}</div>
                        )}
                    </Form.Group>
                )}

                <Form.Group className="mb-3">
                    <Form.Check
                        type="checkbox"
                        label="Require Confirmation"
                        checked={formData.confirm}
                        onChange={(e) => handleChange('confirm', e.target.checked)}
                    />
                </Form.Group>

                {formData.confirm && (
                    <Form.Group className="mb-3">
                        <Form.Label>Confirmation Message</Form.Label>
                        <Form.Control
                            type="text"
                            value={formData.confirm_message}
                            onChange={(e) => handleChange('confirm_message', e.target.value)}
                        />
                    </Form.Group>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Cancel
                </Button>
                <Button variant="primary" onClick={handleSubmit}>
                    Save Action
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ActionModal;