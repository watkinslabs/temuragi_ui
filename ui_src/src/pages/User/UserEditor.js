/**
 * @routes ["UserEditor"]
*/

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Spinner, Nav, Tab } from 'react-bootstrap';
import { userAPI } from './hooks/userAPI';

// Phone component
const PhonesTab = ({ phones, set_phones }) => {
    const phone_types = ['mobile', 'home', 'work', 'fax', 'other'];

    const add_phone = () => {
        set_phones([...phones, {
            _is_new: true,
            phone_type: 'mobile',
            country_code: '+1',
            phone_number: '',
            extension: '',
            is_primary: phones.length === 0,
            is_verified: false
        }]);
    };

    const update_phone = (index, field, value) => {
        const new_phones = [...phones];
        new_phones[index][field] = value;

        // If setting as primary, unset others
        if (field === 'is_primary' && value) {
            new_phones.forEach((p, i) => {
                if (i !== index) p.is_primary = false;
            });
        }

        set_phones(new_phones);
    };

    const remove_phone = (index) => {
        const new_phones = [...phones];
        if (new_phones[index].id) {
            new_phones[index]._deleted = true;
        } else {
            new_phones.splice(index, 1);
        }
        set_phones(new_phones);
    };

    return (
        <div className="mt-3">
            <Button variant="primary" size="sm" onClick={add_phone} className="mb-3">
                Add Phone Number
            </Button>

            {phones.filter(p => !p._deleted).map((phone, index) => (
                <Card key={index} className="mb-3">
                    <Card.Body>
                        <Row>
                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Type</Form.Label>
                                    <Form.Select
                                        value={phone.phone_type}
                                        onChange={(e) => update_phone(index, 'phone_type', e.target.value)}
                                    >
                                        {phone_types.map(type => (
                                            <option key={type} value={type}>
                                                {type.charAt(0).toUpperCase() + type.slice(1)}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Country</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={phone.country_code}
                                        onChange={(e) => update_phone(index, 'country_code', e.target.value)}
                                        placeholder="+1"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Number</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={phone.phone_number}
                                        onChange={(e) => update_phone(index, 'phone_number', e.target.value)}
                                        placeholder="555-1234"
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Ext</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={phone.extension || ''}
                                        onChange={(e) => update_phone(index, 'extension', e.target.value)}
                                        placeholder="123"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Actions</Form.Label>
                                    <div className="d-flex gap-2 align-items-center">
                                        <Form.Check
                                            type="checkbox"
                                            label="Primary"
                                            checked={phone.is_primary}
                                            onChange={(e) => update_phone(index, 'is_primary', e.target.checked)}
                                        />
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => remove_phone(index)}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            ))}
        </div>
    );
};

// Emails component
const EmailsTab = ({ emails, set_emails }) => {
    const email_types = ['personal', 'work', 'other'];

    const add_email = () => {
        set_emails([...emails, {
            _is_new: true,
            email_type: 'personal',
            email_address: '',
            is_primary: emails.length === 0,
            is_verified: false
        }]);
    };

    const update_email = (index, field, value) => {
        const new_emails = [...emails];
        new_emails[index][field] = value;

        if (field === 'is_primary' && value) {
            new_emails.forEach((e, i) => {
                if (i !== index) e.is_primary = false;
            });
        }

        set_emails(new_emails);
    };

    const remove_email = (index) => {
        const new_emails = [...emails];
        if (new_emails[index].id) {
            new_emails[index]._deleted = true;
        } else {
            new_emails.splice(index, 1);
        }
        set_emails(new_emails);
    };

    return (
        <div className="mt-3">
            <Button variant="primary" size="sm" onClick={add_email} className="mb-3">
                Add Email
            </Button>

            {emails.filter(e => !e._deleted).map((email, index) => (
                <Card key={index} className="mb-3">
                    <Card.Body>
                        <Row>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Type</Form.Label>
                                    <Form.Select
                                        value={email.email_type}
                                        onChange={(e) => update_email(index, 'email_type', e.target.value)}
                                    >
                                        {email_types.map(type => (
                                            <option key={type} value={type}>
                                                {type.charAt(0).toUpperCase() + type.slice(1)}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={5}>
                                <Form.Group>
                                    <Form.Label>Email Address</Form.Label>
                                    <Form.Control
                                        type="email"
                                        value={email.email_address}
                                        onChange={(e) => update_email(index, 'email_address', e.target.value)}
                                        placeholder="user@example.com"
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Actions</Form.Label>
                                    <div className="d-flex gap-2 align-items-center">
                                        <Form.Check
                                            type="checkbox"
                                            label="Primary"
                                            checked={email.is_primary}
                                            onChange={(e) => update_email(index, 'is_primary', e.target.checked)}
                                        />
                                        <Form.Check
                                            type="checkbox"
                                            label="Verified"
                                            checked={email.is_verified}
                                            onChange={(e) => update_email(index, 'is_verified', e.target.checked)}
                                        />
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => remove_email(index)}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            ))}
        </div>
    );
};

// Names component
const NamesTab = ({ names, set_names }) => {
    const name_types = ['legal', 'preferred', 'maiden', 'nickname', 'professional', 'other'];

    const add_name = () => {
        set_names([...names, {
            _is_new: true,
            name_type: 'legal',
            first_name: '',
            middle_name: '',
            last_name: '',
            full_name: '',
            display_name: '',
            prefix: '',
            suffix: '',
            is_current: names.length === 0
        }]);
    };

    const update_name = (index, field, value) => {
        const new_names = [...names];
        new_names[index][field] = value;

        // If setting as current, unset others
        if (field === 'is_current' && value) {
            new_names.forEach((n, i) => {
                if (i !== index) n.is_current = false;
            });
        }

        set_names(new_names);
    };

    const remove_name = (index) => {
        const new_names = [...names];
        if (new_names[index].id) {
            new_names[index]._deleted = true;
        } else {
            new_names.splice(index, 1);
        }
        set_names(new_names);
    };

    return (
        <div className="mt-3">
            <Button variant="primary" size="sm" onClick={add_name} className="mb-3">
                Add Name
            </Button>

            {names.filter(n => !n._deleted).map((name, index) => (
                <Card key={index} className="mb-3">
                    <Card.Body>
                        <Row className="mb-3">
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Type</Form.Label>
                                    <Form.Select
                                        value={name.name_type}
                                        onChange={(e) => update_name(index, 'name_type', e.target.value)}
                                    >
                                        {name_types.map(type => (
                                            <option key={type} value={type}>
                                                {type.charAt(0).toUpperCase() + type.slice(1)}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Prefix</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={name.prefix || ''}
                                        onChange={(e) => update_name(index, 'prefix', e.target.value)}
                                        placeholder="Dr., Mr., Ms."
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={5}>
                                <Form.Group>
                                    <Form.Label>Display Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={name.display_name || ''}
                                        onChange={(e) => update_name(index, 'display_name', e.target.value)}
                                        placeholder="How the name should be displayed"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Actions</Form.Label>
                                    <div className="d-flex gap-2">
                                        <Form.Check
                                            type="checkbox"
                                            label="Current"
                                            checked={name.is_current}
                                            onChange={(e) => update_name(index, 'is_current', e.target.checked)}
                                        />
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => remove_name(index)}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>First Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={name.first_name || ''}
                                        onChange={(e) => update_name(index, 'first_name', e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Middle Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={name.middle_name || ''}
                                        onChange={(e) => update_name(index, 'middle_name', e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Last Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={name.last_name || ''}
                                        onChange={(e) => update_name(index, 'last_name', e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Suffix</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={name.suffix || ''}
                                        onChange={(e) => update_name(index, 'suffix', e.target.value)}
                                        placeholder="Jr., III, PhD"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row className="mt-3">
                            <Col>
                                <Form.Group>
                                    <Form.Label>Full Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={name.full_name || ''}
                                        onChange={(e) => update_name(index, 'full_name', e.target.value)}
                                        placeholder="Complete name if different from parts"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            ))}
        </div>
    );
};

// Social contacts component
const SocialsTab = ({ socials, set_socials }) => {
    const platforms = [
        'whatsapp', 'telegram', 'signal', 'discord', 'slack',
        'facebook', 'instagram', 'twitter', 'linkedin', 'github',
        'other'
    ];

    const add_social = () => {
        set_socials([...socials, {
            _is_new: true,
            platform: 'whatsapp',
            handle: '',
            label: '',
            platform_user_id: '',
            profile_url: '',
            is_primary: false,
            is_verified: false
        }]);
    };

    const update_social = (index, field, value) => {
        const new_socials = [...socials];
        new_socials[index][field] = value;
        set_socials(new_socials);
    };

    const remove_social = (index) => {
        const new_socials = [...socials];
        if (new_socials[index].id) {
            new_socials[index]._deleted = true;
        } else {
            new_socials.splice(index, 1);
        }
        set_socials(new_socials);
    };

    return (
        <div className="mt-3">
            <Button variant="primary" size="sm" onClick={add_social} className="mb-3">
                Add Social Contact
            </Button>

            {socials.filter(s => !s._deleted).map((social, index) => (
                <Card key={index} className="mb-3">
                    <Card.Body>
                        <Row>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Platform</Form.Label>
                                    <Form.Select
                                        value={social.platform}
                                        onChange={(e) => update_social(index, 'platform', e.target.value)}
                                    >
                                        {platforms.map(platform => (
                                            <option key={platform} value={platform}>
                                                {platform.charAt(0).toUpperCase() + platform.slice(1)}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Handle/Username</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={social.handle}
                                        onChange={(e) => update_social(index, 'handle', e.target.value)}
                                        placeholder="@username"
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Label</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={social.label || ''}
                                        onChange={(e) => update_social(index, 'label', e.target.value)}
                                        placeholder="Work, Personal..."
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Actions</Form.Label>
                                    <div className="d-flex gap-2 align-items-center">
                                        <Form.Check
                                            type="checkbox"
                                            label="Verified"
                                            checked={social.is_verified}
                                            onChange={(e) => update_social(index, 'is_verified', e.target.checked)}
                                        />
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => remove_social(index)}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            ))}
        </div>
    );
};

// Main UserEditor component
const UserEditor = ({ route_params = {} }) => {
    const user_id = route_params.id || route_params.user_id || null;
    const from_view = route_params.from || 'UserList';
    const from_params = route_params.from_params || {};

    const use_navigation = window.useNavigation;
    const { navigate_to } = use_navigation ? use_navigation() : { navigate_to: window.navigate_to };

    const [loading, set_loading] = useState(false);
    const [active_tab, set_active_tab] = useState('basic');
    const [is_edit_mode] = useState(!!user_id);

    // Core user data
    const [user_data, set_user_data] = useState({
        username: '',
        email: '',
        role_id: '',
        landing_page: '/dashboard',
        is_active: true,
        password: '',
        confirm_password: ''
    });

    // Related data
    const [names, set_names] = useState([]);
    const [phones, set_phones] = useState([]);
    const [emails, set_emails] = useState([]);
    const [socials, set_socials] = useState([]);
    const [addresses, set_addresses] = useState([]);
    const [roles, set_roles] = useState([]);

    const api = userAPI();

    // Toast functions
    const show_success = (message) => window.showToast?.(message, 'success') || console.log('Success:', message);
    const show_error = (message) => window.showToast?.(message, 'error') || console.error('Error:', message);

    // Navigation
    const handle_back = () => {
        navigate_to(from_view, from_params);
    };

    // Initialize data
    useEffect(() => {
        const initialize_data = async () => {
            set_loading(true);
            try {
                const roles_data = await api.load_roles();
                set_roles(roles_data);

                if (is_edit_mode && user_id) {
                    const user_result = await api.load_user(user_id);
                    if (user_result) {
                        set_user_data({
                            ...user_result.user,
                            password: '',
                            confirm_password: ''
                        });
                        set_names(user_result.names);
                        set_phones(user_result.phones);
                        set_emails(user_result.emails);
                        set_socials(user_result.socials);
                        set_addresses(user_result.addresses);
                    }
                }
            } catch (error) {
                show_error('Failed to initialize: ' + error.message);
            } finally {
                set_loading(false);
            }
        };

        initialize_data();
    }, []);

    // Save user
    const save_user = async () => {
        // Validation
        if (!user_data.username || !user_data.email) {
            show_error('Username and email are required');
            return;
        }

        // Email format validation
        const email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email_regex.test(user_data.email)) {
            show_error('Please enter a valid email address');
            return;
        }

        // Password validation
        if (!is_edit_mode && !user_data.password) {
            show_error('Password is required for new users');
            return;
        }

        if (user_data.password && user_data.password !== user_data.confirm_password) {
            show_error('Password and confirmation must match');
            return;
        }

        // Password strength validation (if password is provided)
        if (user_data.password && user_data.password.length < 8) {
            show_error('Password must be at least 8 characters long');
            return;
        }

        // Validate at least one email if emails exist
        const valid_emails = emails.filter(e => !e._deleted);
        if (valid_emails.length > 0) {
            const has_valid_email = valid_emails.every(e => email_regex.test(e.email_address));
            if (!has_valid_email) {
                show_error('All email addresses must be valid');
                set_active_tab('emails');
                return;
            }
        }

        // Validate phone numbers
        const valid_phones = phones.filter(p => !p._deleted);
        if (valid_phones.length > 0) {
            const has_invalid_phone = valid_phones.some(p => !p.phone_number || p.phone_number.length < 7);
            if (has_invalid_phone) {
                show_error('All phone numbers must be valid');
                set_active_tab('phones');
                return;
            }
        }

        // Validate social handles
        const valid_socials = socials.filter(s => !s._deleted);
        if (valid_socials.length > 0) {
            const has_invalid_social = valid_socials.some(s => !s.handle || s.handle.trim().length === 0);
            if (has_invalid_social) {
                show_error('All social contacts must have a handle/username');
                set_active_tab('socials');
                return;
            }
        }

        set_loading(true);
        try {
            const save_data = {
                ...user_data
            };
            
            // Only include password if it's set
            if (!user_data.password) {
                delete save_data.password;
            }
            delete save_data.confirm_password;

            const result = await api.save_user({
                user_data: save_data,
                names,
                phones,
                emails,
                socials,
                addresses,
                is_edit_mode,
                user_id
            });

            if (result.success) {
                show_success('User saved successfully!');

                if (!is_edit_mode) {
                    navigate_to('UserEditor', {
                        id: result.user_id,
                        from: from_view,
                        from_params: from_params
                    });
                }
            }
        } catch (error) {
            show_error('Failed to save user: ' + error.message);
        } finally {
            set_loading(false);
        }
    };

    if (loading && !user_data.username) {
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
            <Row className="mb-4">
                <Col>
                    <div className="d-flex align-items-center justify-content-between">
                        <h4 className="mb-0">
                            <i className="fas fa-user-edit me-2"></i>
                            {is_edit_mode ? 'Edit User' : 'Create User'}
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

            <Card>
                <Card.Body>
                    <Tab.Container activeKey={active_tab} onSelect={(k) => set_active_tab(k)}>
                        <Nav variant="tabs" className="mb-3">
                            <Nav.Item>
                                <Nav.Link eventKey="basic">Basic Info</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="names">Names</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="phones">Phone Numbers</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="emails">Email Addresses</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="socials">Social Contacts</Nav.Link>
                            </Nav.Item>
                        </Nav>

                        <Tab.Content>
                            <Tab.Pane eventKey="basic">
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Username *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={user_data.username}
                                                onChange={(e) => set_user_data(prev => ({ ...prev, username: e.target.value }))}
                                                placeholder="jdoe"
                                            />
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Email *</Form.Label>
                                            <Form.Control
                                                type="email"
                                                value={user_data.email}
                                                onChange={(e) => set_user_data(prev => ({ ...prev, email: e.target.value }))}
                                                placeholder="user@example.com"
                                            />
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Role</Form.Label>
                                            <Form.Select
                                                value={user_data.role_id || ''}
                                                onChange={(e) => set_user_data(prev => ({ ...prev, role_id: e.target.value }))}
                                            >
                                                <option value="">No Role</option>
                                                {roles.map(role => (
                                                    <option key={role.id} value={role.id}>
                                                        {role.display || role.name}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>

                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Landing Page</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={user_data.landing_page}
                                                onChange={(e) => set_user_data(prev => ({ ...prev, landing_page: e.target.value }))}
                                                placeholder="/dashboard"
                                            />
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Password {!is_edit_mode && '*'}</Form.Label>
                                            <Form.Control
                                                type="password"
                                                value={user_data.password}
                                                onChange={(e) => set_user_data(prev => ({ ...prev, password: e.target.value }))}
                                                placeholder={is_edit_mode ? "Leave blank to keep current password" : "Enter password"}
                                            />
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Confirm Password {!is_edit_mode && '*'}</Form.Label>
                                            <Form.Control
                                                type="password"
                                                value={user_data.confirm_password}
                                                onChange={(e) => set_user_data(prev => ({ ...prev, confirm_password: e.target.value }))}
                                                placeholder={is_edit_mode ? "Leave blank to keep current password" : "Confirm password"}
                                            />
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Check
                                                type="checkbox"
                                                label="Active"
                                                checked={user_data.is_active}
                                                onChange={(e) => set_user_data(prev => ({ ...prev, is_active: e.target.checked }))}
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                {is_edit_mode && (
                                    <Alert variant="info">
                                        <i className="fas fa-info-circle me-2"></i>
                                        Leave password fields blank to keep the current password.
                                    </Alert>
                                )}
                            </Tab.Pane>

                            <Tab.Pane eventKey="names">
                                <NamesTab names={names} set_names={set_names} />
                            </Tab.Pane>

                            <Tab.Pane eventKey="phones">
                                <PhonesTab phones={phones} set_phones={set_phones} />
                            </Tab.Pane>

                            <Tab.Pane eventKey="emails">
                                <EmailsTab emails={emails} set_emails={set_emails} />
                            </Tab.Pane>

                            <Tab.Pane eventKey="socials">
                                <SocialsTab socials={socials} set_socials={set_socials} />
                            </Tab.Pane>
                        </Tab.Content>
                    </Tab.Container>
                </Card.Body>
                <Card.Footer className="text-end">
                    <Button
                        variant="success"
                        onClick={save_user}
                        disabled={loading}
                    >
                        {loading && <Spinner size="sm" animation="border" className="me-2" />}
                        <i className={is_edit_mode ? "fas fa-save me-2" : "fas fa-user-plus me-2"}></i>
                        {is_edit_mode ? 'Save Changes' : 'Create User'}
                    </Button>
                </Card.Footer>
            </Card>
        </Container>
    );
};

export default UserEditor;

// Self-register when loaded as dynamic bundle
if (window.app_registry) {
    window.app_registry.register_page('UserEditor', UserEditor);
    window.dispatchEvent(new CustomEvent('module_registered', {
        detail: { name: 'UserEditor', type: 'page', module: UserEditor }
    }));
}