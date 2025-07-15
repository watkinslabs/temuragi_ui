#!/usr/bin/env node
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const glob = require('glob');

function parse_routes_from_source(source_code, component_name) {
    const routes = [];

    // Method 1: Check for @routes in JSDoc comments
    const jsdoc_pattern = /@routes\s*\[(.*?)\]/;
    const jsdoc_match = source_code.match(jsdoc_pattern);
    if (jsdoc_match) {
        const routes_string = jsdoc_match[1];
        const route_matches = routes_string.match(/["'`]([^"'`]+)["'`]/g);
        if (route_matches) {
            return route_matches.map(r => r.replace(/["'`]/g, ''));
        }
    }

    // Method 2: Check for ROUTES: comment
    const comment_pattern = /\/\/\s*ROUTES?:\s*(.+)/i;
    const comment_match = source_code.match(comment_pattern);
    if (comment_match) {
        return comment_match[1].split(',').map(r => r.trim());
    }

    // Method 3: Check for static routes property
    const static_pattern = new RegExp(`${component_name}\\.routes\\s*=\\s*\\[(.*?)\\]`, 's');
    const static_match = source_code.match(static_pattern);
    if (static_match) {
        const routes_string = static_match[1];
        const route_matches = routes_string.match(/["'`]([^"'`]+)["'`]/g);
        if (route_matches) {
            return route_matches.map(r => r.replace(/["'`]/g, ''));
        }
    }

    // Method 4: Generate default route from component name
    const default_route = '/' + component_name
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '');

    console.log(`  No explicit routes found, using default: ${default_route}`);
    return [default_route];
}

async function uploadComponents() {
    const API_BASE = process.env.API_BASE || 'http://localhost:5000';
    const API_TOKEN = process.env.API_TOKEN;

    if (!API_TOKEN) {
        console.error('ERROR: API_TOKEN environment variable is required');
        console.error('Usage: API_TOKEN="your-token" npm run upload:components');
        process.exit(1);
    }

    console.log(`Using API base: ${API_BASE}`);

    // Find built bundles in the actual nested structure
    const bundle_patterns = [
        path.join(__dirname, '../../app/static/js/bundles/pages/**/*.js'),
        path.join(__dirname, '../../app/static/js/bundles/components/**/*.js')
    ];

    const bundle_files = [];
    bundle_patterns.forEach(pattern => {
        bundle_files.push(...glob.sync(pattern));
    });

    console.log(`Found ${bundle_files.length} bundles to upload`);

    for (const file of bundle_files) {
        // Skip chunk files and manifests
        if (file.includes('/chunks/') || file.includes('manifest')) {
            continue;
        }

        // Extract component name and type from nested path
        const relative_path = path.relative(path.join(__dirname, '../../app/static/js/bundles'), file);
        const path_parts = relative_path.split(path.sep);
        const component_type = path_parts[0]; // 'pages' or 'components'
        const component_name = path.basename(file, '.js');
        
        const compiled_code = fs.readFileSync(file, 'utf8');

        // Look for source file in nested structure
        let source_code = '';
        let source_found = false;

        // Try multiple source locations for nested structure
        const source_paths = [
            path.join(__dirname, `../src/${component_type}/${component_name}/index.js`),
            path.join(__dirname, `../src/${component_type}/${component_name}/${component_name}.js`),
            path.join(__dirname, `../src/${component_type}/${component_name}.js`),
            // For nested pages like ReportBuilder/ReportList
            path.join(__dirname, `../src/${component_type}/${path_parts.slice(1).join('/')}`),
            path.join(__dirname, `../src/${component_type}/${path_parts.slice(1, -1).join('/')}/${component_name}.js`)
        ];

        for (const source_path of source_paths) {
            if (fs.existsSync(source_path)) {
                source_code = fs.readFileSync(source_path, 'utf8');
                source_found = true;
                console.log(`Found source for ${component_name} at ${source_path}`);
                break;
            }
        }

        if (!source_found) {
            console.warn(`⚠ Source file not found for ${component_name}, tried:`, source_paths);
            continue;
        }

        console.log(`Uploading ${component_name} (${component_type})...`);

        // Parse routes from source code
        const routes = parse_routes_from_source(source_code, component_name);
        console.log(`  Routes: ${routes.join(', ') || 'none'}`);

        try {
            const response = await fetch(`${API_BASE}/v2/api/components/sync`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: component_name,
                    source_code: source_code,
                    compiled_code: compiled_code,
                    version: '1.0.0',
                    description: `Component ${component_name}`,
                    routes: routes,
                    component_type: component_type === 'pages' ? 'page' : 'component',
                    // FORCE UPDATE WITH TIMESTAMP
                    force_update: true,
                    uploaded_at: new Date().toISOString(),
                    build_timestamp: Date.now()
                })
            });

            const result = await response.json();

            if (response.ok) {
                console.log(`✓ ${component_name} ${result.status} (build #${result.build_number})`);
            } else {
                console.error(`✗ ${component_name} failed:`, result.error || 'Unknown error');
                console.error(`  Status: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error(`✗ ${component_name} failed:`, error.message);
        }
    }

    console.log('\nUpload complete!');
}

// Run if called directly
if (require.main === module) {
    uploadComponents().catch(console.error);
}

module.exports = { uploadComponents };