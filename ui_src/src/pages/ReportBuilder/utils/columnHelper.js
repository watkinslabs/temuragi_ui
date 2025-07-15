// utils/columnHelpers.js

export const getDefaultDataType = (sqlType, dataTypes) => {
    const typeMap = {
        'VARCHAR': 'string',
        'TEXT': 'string',
        'CHAR': 'string',
        'INT': 'integer',
        'INTEGER': 'integer',
        'BIGINT': 'integer',
        'SMALLINT': 'integer',
        'DECIMAL': 'decimal',
        'NUMERIC': 'decimal',
        'FLOAT': 'decimal',
        'DOUBLE': 'decimal',
        'REAL': 'decimal',
        'DATE': 'date',
        'DATETIME': 'datetime',
        'TIMESTAMP': 'datetime',
        'TIME': 'time',
        'BOOLEAN': 'boolean',
        'BOOL': 'boolean'
    };

    const upperType = (sqlType || '').toUpperCase();

    // Check for matches in the type map
    for (const [key, value] of Object.entries(typeMap)) {
        if (upperType.includes(key)) {
            const dataType = Object.values(dataTypes).find(dt => dt.name === value);
            if (dataType) return dataType.id;
        }
    }

    // Default to string
    const stringType = Object.values(dataTypes).find(dt => dt.name === 'string');
    if (stringType) return stringType.id;

    // Ultimate fallback - return first available data type
    const firstType = Object.values(dataTypes)[0];
    if (firstType) return firstType.id;

    console.error('No data types available!');
    return null;
};

export const getDefaultVariableType = (type, variableTypes) => {
    const varType = Object.values(variableTypes).find(vt => vt.name === type);
    if (varType) return varType.id;
    
    // Default to text type if specified type not found
    const textType = Object.values(variableTypes).find(vt => vt.name === 'text');
    if (textType) return textType.id;
    
    // Ultimate fallback - return first available variable type
    const firstType = Object.values(variableTypes)[0];
    if (firstType) return firstType.id;
    
    console.error('No variable types available!');
    return null;
};

export const formatColumnName = (name) => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};
