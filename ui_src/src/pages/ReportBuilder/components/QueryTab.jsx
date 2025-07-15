// components/QueryTab.jsx
import React, { useRef, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import { UnControlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/monokai.css';
import 'codemirror/mode/sql/sql';

const QueryTab = ({
    reportData,
    setReportData,
    dataTypes,
    onTestQuery,
    onDetectVariables,
    onColumnsDetected,
    onVariablesDetected,
    showSuccess,
    showError,
    showInfo,
    isActive  // Add this prop
}) => {
    const editorRef = useRef(null);

    // Refresh CodeMirror when tab becomes active
    useEffect(() => {
        if (isActive && editorRef.current) {
            setTimeout(() => {
                editorRef.current.refresh();
            }, 50);
        }
    }, [isActive]);

    const formatQuery = () => {
        if (!editorRef.current) return;

        const query = editorRef.current.getValue();
        const formatted = query
            .replace(/SELECT/gi, 'SELECT')
            .replace(/FROM/gi, '\nFROM')
            .replace(/WHERE/gi, '\nWHERE')
            .replace(/GROUP BY/gi, '\nGROUP BY')
            .replace(/ORDER BY/gi, '\nORDER BY')
            .replace(/HAVING/gi, '\nHAVING')
            .replace(/JOIN/gi, '\nJOIN')
            .replace(/LEFT JOIN/gi, '\nLEFT JOIN')
            .replace(/RIGHT JOIN/gi, '\nRIGHT JOIN')
            .replace(/INNER JOIN/gi, '\nINNER JOIN');

        editorRef.current.setValue(formatted);
    };

    const handleTestQuery = async () => {
        const query = editorRef.current?.getValue();
        if (!query || !reportData.connection_id) {
            showError('Please select a connection and enter a query');
            return;
        }

        try {
            const result = await onTestQuery(dataTypes);
            if (result.columns) {
                onColumnsDetected(result.columns);
                showSuccess(`Query validated! Found ${result.columns.length} columns.`);
            }
            // Also detect variables
            const varsResult = await onDetectVariables();
            if (varsResult.variables) {
                onVariablesDetected(varsResult.variables);
                if (varsResult.variables.length > 0) {
                    showInfo(`Also found ${varsResult.variables.length} variables`);
                }
            }
        } catch (error) {
            showError('Query validation failed: ' + error.message);
        }
    };

    const handleDetectVariables = async () => {
        try {
            const result = await onDetectVariables();
            if (result.variables) {
                onVariablesDetected(result.variables);
                if (result.variables.length > 0) {
                    showSuccess(`Found ${result.variables.length} variables`);
                } else {
                    showInfo('No variables found in query');
                }
            }
        } catch (error) {
            showError('Failed to detect variables: ' + error.message);
        }
    };

    return (
        <div className="mt-3">
            <div className="mb-3">
                <Button variant="secondary" size="sm" onClick={handleTestQuery} className="me-2">
                    Test Query
                </Button>
                <Button variant="secondary" size="sm" onClick={handleDetectVariables} className="me-2">
                    Detect Variables
                </Button>
                <Button variant="secondary" size="sm" onClick={formatQuery}>
                    Format Query
                </Button>
            </div>

            <div style={{ border: '1px solid #ddd' }}>
                <CodeMirror
                    value={reportData.query}
                    options={{
                        mode: 'sql',
                        theme: 'monokai',
                        lineNumbers: true,
                        lineWrapping: true,
                        viewportMargin: Infinity,
                        indentUnit: 4,
                        tabSize: 4,
                        indentWithTabs: true
                    }}
                    onChange={(editor, data, value) => {
                        setReportData(prev => ({ ...prev, query: value }));
                    }}
                    editorDidMount={(editor) => {
                        editorRef.current = editor;
                        editor.setSize(null, 400);
                        // Force refresh after mount
                        setTimeout(() => editor.refresh(), 100);
                    }}
                />
            </div>
        </div>
    );
};

export default QueryTab;