// components/VariablesTab.jsx
import React from 'react';
import { Card, Button, Form, Row, Col, Alert } from 'react-bootstrap';

const VariablesTab = ({ variables, setVariables, variableTypes }) => {
    const updateVariable = (index, field, value) => {
        const newVariables = [...variables];
        if (field === 'is_required' || field === 'is_hidden') {
            value = value === 'true' || value === true;
        }
        newVariables[index][field] = value;
        setVariables(newVariables);
    };
    
    const removeVariable = (index) => {
        if (window.confirm('Remove this variable?')) {
            const newVariables = [...variables];
            newVariables.splice(index, 1);
            setVariables(newVariables);
        }
    };
    
    const addVariable = () => {
        const name = window.prompt('Variable name (without colon):');
        if (name) {
            const defaultTypeId = Object.values(variableTypes).find(vt => vt.name === 'text')?.id || Object.values(variableTypes)[0]?.id;
            
            const newVariable = {
                name: name,
                label: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                variable_type_id: defaultTypeId,
                order_index: variables.length,
                is_required: true,
                is_hidden: false,
                default_value: '',
                placeholder: '',
                help_text: ''
            };
            setVariables([...variables, newVariable]);
        }
    };
    
    return (
        <div className="mt-3">
            <div className="mb-3">
                <Button variant="primary" size="sm" onClick={addVariable}>
                    Add Variable
                </Button>
            </div>
            
            {variables.length === 0 ? (
                <Alert variant="info">
                    No variables defined. Use :variable_name in your query.
                </Alert>
            ) : (
                variables.map((variable, index) => (
                    <Card key={index} className="mb-3">
                        <Card.Body>
                            <Row>
                                <Col md={3}>
                                    <Form.Label>Variable Name</Form.Label>
                                    <Form.Control
                                        value={variable.name}
                                        readOnly
                                    />
                                </Col>
                                <Col md={3}>
                                    <Form.Label>Label</Form.Label>
                                    <Form.Control
                                        value={variable.label}
                                        onChange={(e) => updateVariable(index, 'label', e.target.value)}
                                    />
                                </Col>
                                <Col md={3}>
                                    <Form.Label>Variable Type</Form.Label>
                                    <Form.Select
                                        value={variable.variable_type_id}
                                        onChange={(e) => updateVariable(index, 'variable_type_id', e.target.value)}
                                    >
                                        {Object.values(variableTypes).map(vt => (
                                            <option key={vt.id} value={vt.id}>{vt.label}</option>
                                        ))}
                                    </Form.Select>
                                </Col>
                                <Col md={3}>
                                    <Form.Label>Default Value</Form.Label>
                                    <Form.Control
                                        value={variable.default_value || ''}
                                        onChange={(e) => updateVariable(index, 'default_value', e.target.value)}
                                    />
                                </Col>
                            </Row>
                            <Row className="mt-2">
                                <Col md={4}>
                                    <Form.Label>Placeholder</Form.Label>
                                    <Form.Control
                                        value={variable.placeholder || ''}
                                        onChange={(e) => updateVariable(index, 'placeholder', e.target.value)}
                                    />
                                </Col>
                                <Col md={4}>
                                    <Form.Label>Options</Form.Label>
                                    <div>
                                        <Form.Check
                                            inline
                                            type="checkbox"
                                            label="Required"
                                            checked={variable.is_required}
                                            onChange={(e) => updateVariable(index, 'is_required', e.target.checked)}
                                        />
                                        <Form.Check
                                            inline
                                            type="checkbox"
                                            label="Hidden"
                                            checked={variable.is_hidden}
                                            onChange={(e) => updateVariable(index, 'is_hidden', e.target.checked)}
                                        />
                                    </div>
                                </Col>
                                <Col md={4} className="text-end">
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => removeVariable(index)}
                                        className="mt-4"
                                    >
                                        Remove
                                    </Button>
                                </Col>
                            </Row>
                            <Row className="mt-2">
                                <Col>
                                    <Form.Label>Help Text</Form.Label>
                                    <Form.Control
                                        value={variable.help_text || ''}
                                        onChange={(e) => updateVariable(index, 'help_text', e.target.value)}
                                        placeholder="Help text for users"
                                    />
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                ))
            )}
        </div>
    );
};

export default VariablesTab;