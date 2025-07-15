// components/ColumnsTab.jsx
import React from 'react';
import { Card, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableColumn = ({ column, index, dataTypes, updateColumn, removeColumn }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: column.name });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <Card
            className="mb-2"
            ref={setNodeRef}
            style={style}
        >
            <Card.Body>
                <Row className="align-items-center">
                    <Col xs="auto" {...attributes} {...listeners}>
                        <span style={{ cursor: 'move' }}>≡</span>
                    </Col>
                    <Col md={2}>
                        <Form.Label>Column Name</Form.Label>
                        <Form.Control
                            size="sm"
                            value={column.name}
                            readOnly
                        />
                    </Col>
                    <Col md={2}>
                        <Form.Label>Label Name</Form.Label>
                        <Form.Control
                            size="sm"
                            value={column.label}
                            onChange={(e) => updateColumn(index, 'label', e.target.value)}
                        />
                    </Col>
                    <Col md={2}>
                        <Form.Label>Data Type</Form.Label>
                        <Form.Select
                            size="sm"
                            value={column.data_type_id}
                            onChange={(e) => updateColumn(index, 'data_type_id', e.target.value)}
                        >
                            {Object.values(dataTypes).map(dt => (
                                <option key={dt.id} value={dt.id}>{dt.label}</option>
                            ))}
                        </Form.Select>
                    </Col>
                    <Col md={2}>
                        <Form.Label>Alignment</Form.Label>
                        <Form.Select
                            size="sm"
                            value={column.alignment}
                            onChange={(e) => updateColumn(index, 'alignment', e.target.value)}
                        >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                        </Form.Select>
                    </Col>
                    <Col md={3}>
                        <Form.Label>Options</Form.Label>
                        <div>
                            <Form.Check
                                inline
                                type="checkbox"
                                label="Search"
                                checked={column.is_searchable}
                                onChange={(e) => updateColumn(index, 'is_searchable', e.target.checked)}
                            />
                            <Form.Check
                                inline
                                type="checkbox"
                                label="Sort"
                                checked={column.is_sortable}
                                onChange={(e) => updateColumn(index, 'is_sortable', e.target.checked)}
                            />
                            <Form.Check
                                inline
                                type="checkbox"
                                label="Visible"
                                checked={column.is_visible}
                                onChange={(e) => updateColumn(index, 'is_visible', e.target.checked)}
                            />
                        </div>
                    </Col>
                    <Col xs="auto">
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={() => removeColumn(index)}
                        >
                            ×
                        </Button>
                    </Col>
                </Row>
                <Row className="mt-2">
                    <Col md={3}>
                        <Form.Control
                            size="sm"
                            placeholder="Format string (e.g., {:.2f})"
                            value={column.format_string || ''}
                            onChange={(e) => updateColumn(index, 'format_string', e.target.value)}
                        />
                    </Col>
                    <Col md={3}>
                        <Form.Select
                            size="sm"
                            value={column.search_type}
                            onChange={(e) => updateColumn(index, 'search_type', e.target.value)}
                        >
                            <option value="contains">Contains</option>
                            <option value="exact">Exact Match</option>
                            <option value="range">Range</option>
                            <option value="date_range">Date Range</option>
                        </Form.Select>
                    </Col>
                    <Col md={2}>
                        <Form.Control
                            type="number"
                            size="sm"
                            placeholder="Width (pixels)"
                            value={column.width || ''}
                            onChange={(e) => updateColumn(index, 'width', e.target.value)}
                        />
                    </Col>
                    <Col md={4}>
                        <div className="d-flex align-items-center gap-3">
                            <Form.Check
                                type="checkbox"
                                label="Primary Key"
                                checked={column.is_pk || false}
                                onChange={(e) => updateColumn(index, 'is_pk', e.target.checked)}
                            />
                            <Form.Check
                                type="checkbox"
                                label="Identity"
                                checked={column.is_identity || false}
                                onChange={(e) => updateColumn(index, 'is_identity', e.target.checked)}
                            />
                        </div>
                    </Col>
                </Row>
            </Card.Body>
        </Card>
    );
};

const ColumnsTab = ({
    columns,
    setColumns,
    dataTypes,
    isEditMode,
    reportId,
    api,
    showSuccess,
    showError
}) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const updateColumn = (index, field, value) => {
        const newColumns = [...columns];
        if (field === 'is_searchable' || field === 'is_sortable' || field === 'is_visible' || field === 'is_pk' || field === 'is_identity') {
            value = value === 'true' || value === true;
        }
        newColumns[index][field] = value;
        setColumns(newColumns);
    };

    const removeColumn = (index) => {
        if (window.confirm('Remove this column?')) {
            const newColumns = [...columns];
            newColumns.splice(index, 1);
            setColumns(newColumns);
        }
    };

    const addColumn = () => {
        const name = window.prompt('Column name:');
        if (name) {
            const defaultTypeId = Object.values(dataTypes).find(dt => dt.name === 'string')?.id || Object.values(dataTypes)[0]?.id;

            const newColumn = {
                name: name,
                label: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                data_type_id: defaultTypeId,
                order_index: columns.length,
                is_searchable: true,
                is_visible: true,
                is_sortable: true,
                is_pk: false,
                is_identity: false,
                alignment: 'left',
                search_type: 'contains',
                format_string: null,
                width: null,
                options: {}
            };
            setColumns([...columns, newColumn]);
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = columns.findIndex(col => col.name === active.id);
            const newIndex = columns.findIndex(col => col.name === over.id);

            const newColumns = arrayMove(columns, oldIndex, newIndex);
            // Update order indices
            newColumns.forEach((col, idx) => {
                col.order_index = idx;
            });

            setColumns(newColumns);
        }
    };

    const syncColumns = async () => {
        if (!isEditMode) {
            showError('Save the report first to sync columns');
            return;
        }

        const removeMissing = window.confirm(
            'Sync columns with query?\n\n' +
            'This will:\n' +
            '• Add any new columns from the query\n' +
            '• Update column types based on the query\n' +
            '• Reorder columns to match the query\n\n' +
            'Remove columns not in the query?'
        );

        try {
            const result = await api.syncColumns(reportId, removeMissing);
            if (result.success) {
                showSuccess('Columns synced successfully!');
                // Reload columns
                const updatedColumns = await api.loadColumns(reportId);
                setColumns(updatedColumns);
            }
        } catch (error) {
            showError('Failed to sync columns: ' + error.message);
        }
    };

    return (
        <div className="mt-3">
            {isEditMode && columns.length > 0 && (
                <div className="mb-3">
                    <Button variant="warning" size="sm" onClick={syncColumns}>
                        <i className="fas fa-sync"></i> Sync with Query
                    </Button>
                </div>
            )}

            <div className="mb-3">
                <Button variant="primary" size="sm" onClick={addColumn}>
                    Add Column
                </Button>
            </div>

            {columns.length === 0 ? (
                <Alert variant="info">
                    No columns defined. Test your query to auto-detect columns.
                </Alert>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={columns.map(col => col.name)}
                        strategy={verticalListSortingStrategy}
                    >
                        {columns.map((col, index) => (
                            <SortableColumn
                                key={col.name}
                                column={col}
                                index={index}
                                dataTypes={dataTypes}
                                updateColumn={updateColumn}
                                removeColumn={removeColumn}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
};

export default ColumnsTab;