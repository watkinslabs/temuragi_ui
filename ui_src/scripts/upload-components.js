#!/usr/bin/env node
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const net = require('net');
const http = require('http');
const https = require('https');

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
    let API_BASE = process.env.API_BASE || 'http://localhost:5050';
    const API_TOKEN = process.env.API_TOKEN;

    // Clean up common API_BASE issues
    API_BASE = API_BASE.trim();
    
    // Add protocol if missing
    if (!API_BASE.startsWith('http://') && !API_BASE.startsWith('https://')) {
        console.log(`WARNING: API_BASE missing protocol, adding http://`);
        API_BASE = 'http://' + API_BASE;
    }
    
    // Remove trailing slash
    if (API_BASE.endsWith('/')) {
        API_BASE = API_BASE.slice(0, -1);
    }

    if (!API_TOKEN) {
        console.error('ERROR: API_TOKEN environment variable is required');
        console.error('Usage: API_TOKEN="your-token" npm run upload:components');
        process.exit(1);
    }

    console.log(`=== UPLOAD COMPONENTS START ===`);
    console.log(`API_BASE: ${API_BASE}`);
    console.log(`API_TOKEN: ${API_TOKEN ? `${API_TOKEN.substring(0, 8)}...` : 'NOT SET'}`);
    console.log(`Node version: ${process.version}`);
    console.log(`Working directory: ${process.cwd()}`);
    console.log(`Script location: ${__dirname}`);
    
    // Validate and parse the API_BASE URL
    try {
        const url_obj = new URL(API_BASE);
        console.log(`\nParsed API_BASE:`);
        console.log(`  Protocol: ${url_obj.protocol}`);
        console.log(`  Hostname: ${url_obj.hostname}`);
        console.log(`  Port: ${url_obj.port || '(default)'}`);
        console.log(`  Full origin: ${url_obj.origin}`);
        
        // Test port connectivity
        const port = url_obj.port || (url_obj.protocol === 'https:' ? 443 : 80);
        const hostname = url_obj.hostname;
        
        console.log(`\nTesting connectivity to ${hostname}:${port}...`);
        
        await new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(5000);
            
            socket.on('connect', () => {
                console.log(`  ✓ Successfully connected to ${hostname}:${port}`);
                socket.end();
                resolve();
            });
            
            socket.on('timeout', () => {
                console.error(`  ✗ Connection timeout to ${hostname}:${port}`);
                socket.destroy();
                resolve();
            });
            
            socket.on('error', (err) => {
                console.error(`  ✗ Connection error to ${hostname}:${port}: ${err.message}`);
                if (err.code === 'ECONNREFUSED') {
                    console.error(`     → Server is not running or port is closed`);
                    console.error(`     → Check if your API server is running on port ${port}`);
                    console.error(`     → Try: sudo ss -tlnp | grep :${port}`);
                }
                resolve();
            });
            
            socket.connect(port, hostname);
        });
        
        // Try a simple HTTP request to test the endpoint
        console.log(`\nTesting HTTP endpoint...`);
        await new Promise((resolve) => {
            const test_url = `${url_obj.origin}/`;
            const http_module = url_obj.protocol === 'https:' ? https : http;
            
            const req = http_module.get(test_url, (res) => {
                console.log(`  HTTP Status: ${res.statusCode} ${res.statusMessage}`);
                console.log(`  Headers:`, res.headers);
                
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    console.log(`  Response preview: ${body.substring(0, 200)}...`);
                    resolve();
                });
            });
            
            req.on('error', (err) => {
                console.error(`  HTTP Error: ${err.message}`);
                resolve();
            });
            
            req.setTimeout(5000, () => {
                console.error(`  HTTP request timeout`);
                req.destroy();
                resolve();
            });
        });
        
    } catch (url_error) {
        console.error(`\nERROR: Invalid API_BASE URL: ${API_BASE}`);
        console.error(`  ${url_error.message}`);
        process.exit(1);
    }

    // Find built bundles in the actual nested structure - now includes user directory
    const bundle_patterns = [
        path.join(__dirname, '../../app/static/js/bundles/pages/**/*.js'),
        path.join(__dirname, '../../app/static/js/bundles/user/**/*.js'),
        path.join(__dirname, '../../app/static/js/bundles/components/**/*.js')
    ];

    console.log(`\nSearching for bundles with patterns:`);
    bundle_patterns.forEach(pattern => console.log(`  - ${pattern}`));

    const bundle_files = [];
    bundle_patterns.forEach(pattern => {
        const found = glob.sync(pattern);
        console.log(`  Found ${found.length} files matching ${pattern}`);
        bundle_files.push(...found);
    });

    console.log(`\nTotal bundles found: ${bundle_files.length}`);

    let upload_count = 0;
    let skip_count = 0;
    let error_count = 0;

    for (const file of bundle_files) {
        // Skip chunk files and manifests
        if (file.includes('/chunks/') || file.includes('manifest')) {
            skip_count++;
            continue;
        }

        // Extract component name and type from nested path
        const relative_path = path.relative(path.join(__dirname, '../../app/static/js/bundles'), file);
        const path_parts = relative_path.split(path.sep);
        const component_type = path_parts[0]; // 'pages', 'user', or 'components'
        const component_name = path.basename(file, '.js');
        
        console.log(`\n=== Processing ${component_name} ===`);
        console.log(`  File: ${file}`);
        console.log(`  Type: ${component_type}`);
        console.log(`  Relative path: ${relative_path}`);

        let compiled_code;
        try {
            compiled_code = fs.readFileSync(file, 'utf8');
            console.log(`  Compiled code size: ${compiled_code.length} bytes`);
        } catch (err) {
            console.error(`  ERROR reading compiled file: ${err.message}`);
            error_count++;
            continue;
        }

        // Look for source file in nested structure
        let source_code = '';
        let source_found = false;

        // Try multiple source locations for nested structure
        const source_paths = [
            path.join(__dirname, `../src/${component_type}/${component_name}/index.js`),
            path.join(__dirname, `../src/${component_type}/${component_name}/${component_name}.js`),
            path.join(__dirname, `../src/${component_type}/${component_name}.js`),
            // For nested pages/user modules like ReportBuilder/ReportList
            path.join(__dirname, `../src/${component_type}/${path_parts.slice(1).join('/')}`),
            path.join(__dirname, `../src/${component_type}/${path_parts.slice(1, -1).join('/')}/${component_name}.js`)
        ];

        console.log(`  Looking for source in:`);
        for (const source_path of source_paths) {
            const exists = fs.existsSync(source_path);
            console.log(`    ${exists ? '✓' : '✗'} ${source_path}`);
            if (exists) {
                try {
                    source_code = fs.readFileSync(source_path, 'utf8');
                    source_found = true;
                    console.log(`  Source code size: ${source_code.length} bytes`);
                    break;
                } catch (err) {
                    console.error(`  ERROR reading source file: ${err.message}`);
                }
            }
        }

        if (!source_found) {
            console.warn(`  ⚠ Source file not found, skipping`);
            skip_count++;
            continue;
        }

        // Parse routes from source code
        const routes = parse_routes_from_source(source_code, component_name);
        console.log(`  Routes: ${routes.join(', ') || 'none'}`);

        const request_url = `${API_BASE}/v2/api/components/sync`;
        
        // Validate the full URL before making request
        try {
            const test_url = new URL(request_url);
            console.log(`\n  Full request URL: ${request_url}`);
            console.log(`  URL components:`);
            console.log(`    - Protocol: ${test_url.protocol}`);
            console.log(`    - Host: ${test_url.host}`);
            console.log(`    - Pathname: ${test_url.pathname}`);
        } catch (url_err) {
            console.error(`  ERROR: Invalid request URL: ${request_url}`);
            console.error(`  ${url_err.message}`);
            error_count++;
            continue;
        }
        
        // Determine the actual component type for the API
        let api_component_type;
        if (component_type === 'pages') {
            api_component_type = 'page';
        } else if (component_type === 'user') {
            api_component_type = 'user_module';
        } else {
            api_component_type = 'component';
        }
        
        const request_payload = {
            name: component_name,
            source_code: source_code,
            compiled_code: compiled_code,
            version: '1.0.0',
            description: `${component_type} ${component_name}`,
            routes: routes,
            component_type: api_component_type,
            force_update: true,
            uploaded_at: new Date().toISOString(),
            build_timestamp: Date.now()
        };

        console.log(`\n  Making request to: ${request_url}`);
        console.log(`  Request payload size: ${JSON.stringify(request_payload).length} bytes`);
        console.log(`  Headers: Authorization: Bearer ${API_TOKEN ? API_TOKEN.substring(0, 8) + '...' : 'NOT SET'}`);

        try {
            const start_time = Date.now();
            console.log(`  Sending request...`);
            
            let response;
            
            // Always use http module due to Node 22 fetch issues with redirects
            console.log(`  Using http module for request (Node 22 fetch redirect issue)...`);
            
            const url_obj = new URL(request_url);
            const http_module = url_obj.protocol === 'https:' ? https : http;
            
            response = await new Promise((resolve, reject) => {
                const post_data = JSON.stringify(request_payload);
                
                const options = {
                    hostname: url_obj.hostname,
                    port: url_obj.port || (url_obj.protocol === 'https:' ? 443 : 80),
                    path: url_obj.pathname,
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${API_TOKEN}`,
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(post_data)
                    }
                };
                
                console.log(`  Request options:`, {
                    ...options,
                    headers: { ...options.headers, Authorization: 'Bearer xxx...' }
                });
                
                const req = http_module.request(options, (res) => {
                    console.log(`  Raw response status: ${res.statusCode} ${res.statusMessage}`);
                    
                    // Handle redirects manually
                    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                        console.log(`  Redirect detected to: ${res.headers.location}`);
                        // For now, just treat redirects as errors
                        // You could implement redirect following here if needed
                    }
                    
                    let body = '';
                    res.on('data', chunk => body += chunk);
                    res.on('end', () => {
                        resolve({
                            ok: res.statusCode >= 200 && res.statusCode < 300,
                            status: res.statusCode,
                            statusText: res.statusMessage,
                            headers: new Map(Object.entries(res.headers)),
                            text: async () => body,
                            json: async () => JSON.parse(body)
                        });
                    });
                });
                
                req.on('error', (err) => {
                    console.error(`  Request error: ${err.message}`);
                    reject(err);
                });
                
                req.write(post_data);
                req.end();
            });

            const elapsed_time = Date.now() - start_time;
            console.log(`  Response received in ${elapsed_time}ms`);
            console.log(`  Status: ${response.status} ${response.statusText}`);
            console.log(`  Headers:`, Object.fromEntries(response.headers.entries()));

            let result;
            const response_text = await response.text();
            console.log(`  Response body length: ${response_text.length} bytes`);

            try {
                result = JSON.parse(response_text);
            } catch (parse_error) {
                console.error(`  ERROR parsing response as JSON: ${parse_error.message}`);
                console.error(`  Raw response: ${response_text.substring(0, 500)}...`);
                error_count++;
                continue;
            }

            if (response.ok) {
                console.log(`  ✓ SUCCESS: ${component_name} ${result.status} (build #${result.build_number})`);
                upload_count++;
            } else {
                console.error(`  ✗ FAILED: ${component_name}`);
                console.error(`  Error: ${result.error || 'Unknown error'}`);
                console.error(`  Full response:`, JSON.stringify(result, null, 2));
                error_count++;
            }
        } catch (error) {
            console.error(`  ✗ NETWORK ERROR: ${component_name}`);
            console.error(`  Error type: ${error.constructor.name}`);
            console.error(`  Error message: ${error.message}`);
            console.error(`  Error code: ${error.code || 'N/A'}`);
            console.error(`  Error stack:`, error.stack);
            
            // Additional network error details
            if (error.cause) {
                console.error(`  Error cause:`, error.cause);
            }
            if (error.errno) {
                console.error(`  Error number: ${error.errno}`);
            }
            if (error.syscall) {
                console.error(`  System call: ${error.syscall}`);
            }
            
            error_count++;
        }
    }

    console.log('\n=== UPLOAD SUMMARY ===');
    console.log(`Total files processed: ${bundle_files.length}`);
    console.log(`Uploaded successfully: ${upload_count}`);
    console.log(`Skipped: ${skip_count}`);
    console.log(`Errors: ${error_count}`);
    console.log(`=== UPLOAD COMPLETE ===`);
}

// Run if called directly
if (require.main === module) {
    uploadComponents().catch(error => {
        console.error('\n=== FATAL ERROR ===');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    });
}

module.exports = { uploadComponents };