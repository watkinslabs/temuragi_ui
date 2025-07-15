// components/ActionsTab.jsx
import React, { useState } from 'react';
import { Card, Button, Badge, Alert } from 'react-bootstrap';
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
import ActionModal from './ActionModal';

const SortableAction = ({ action, index, onEdit, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: `action-${index}` });

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
            <Card.Body className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                    <span {...attributes} {...listeners} style={{ cursor: 'move', marginRight: '1rem' }}>≡</span>
                    <div>
                        <strong>
                            {action.icon && <i className={`${action.icon} me-1`}></i>}
                            {action.label}
                        </strong>
                        <div className="small text-muted">
                            {action.name} <Badge bg="info">{action.mode}</Badge> <Badge bg="secondary">{action.action_type}</Badge>
                            {action.action_type !== 'javascript' ? ` - ${action.method} ${action.url}` : ' - JavaScript'}
                        </div>
                    </div>
                </div>
                <div>
                    <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => onEdit(action, index)}
                        className="me-2"
                    >
                        <i className="fas fa-edit"></i>
                    </Button>
                    <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => onDelete(index)}
                    >
                        <i className="fas fa-trash"></i>
                    </Button>
                </div>
            </Card.Body>
        </Card>
    );
};

const ActionsTab = ({ actions, setActions, routes }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingAction, setEditingAction] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleAddAction = () => {
        setEditingAction(null);
        setShowModal(true);
    };

    const handleEditAction = (action, index) => {
        setEditingAction({ ...action, index });
        setShowModal(true);
    };

    const handleSaveAction = (action) => {
        if (editingAction && editingAction.index !== undefined) {
            const newActions = [...actions];
            newActions[editingAction.index] = action;
            setActions(newActions);
        } else {
            setActions([...actions, action]);
        }
        setShowModal(false);
    };

    const handleDeleteAction = (index) => {
        if (window.confirm('Delete this action?')) {
            const newActions = [...actions];
            newActions.splice(index, 1);
            setActions(newActions);
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = parseInt(active.id.replace('action-', ''));
            const newIndex = parseInt(over.id.replace('action-', ''));

            const reordered_actions = arrayMove(actions, oldIndex, newIndex);
            
            // Update order_index for all actions based on their new positions
            const updated_actions = reordered_actions.map((action, index) => ({
                ...action,
                order_index: index
            }));
            
            setActions(updated_actions);
        }
    };

    return (
        <div className="mt-3">
            <div className="mb-3">
                <Button variant="primary" size="sm" onClick={handleAddAction}>
                    Add Action
                </Button>
            </div>

            {actions.length === 0 ? (
                <Alert variant="info">No actions defined.</Alert>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={actions.map((_, index) => `action-${index}`)}
                        strategy={verticalListSortingStrategy}
                    >
                        {actions.map((action, index) => (
                            <SortableAction
                                key={`action-${index}`}
                                action={action}
                                index={index}
                                onEdit={handleEditAction}
                                onDelete={handleDeleteAction}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            )}

            <ActionModal
                show={showModal}
                onHide={() => setShowModal(false)}
                action={editingAction}
                onSave={handleSaveAction}
                routes={routes}
            />
        </div>
    );
};

export default ActionsTab;