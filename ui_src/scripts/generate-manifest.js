#!/usr/bin/env node

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

async function generate_manifest() {
    console.log(`=== GENERATE UPLOAD MANIFEST START ===`);
    console.log(`Working directory: ${process.cwd()}`);
    console.log(`Script location: ${__dirname}`);
    
    // Find built bundles in the actual nested structure
    const bundle_patterns = [
        path.join(__dirname, '../../app/js/bundles/pages/**/*.js'),
        path.join(__dirname, '../../app/js/bundles/user/**/*.js'),
        path.join(__dirname, '../../app/js/bundles/components/**/*.js')
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

    const manifest = {
        generated_at: new Date().toISOString(),
        build_timestamp: Date.now(),
        version: '1.0.0',
        components: []
    };

    let processed_count = 0;
    let skip_count = 0;

    for (const file of bundle_files) {
        // Skip chunk files and manifests
        if (file.includes('/chunks/') || file.includes('manifest')) {
            skip_count++;
            continue;
        }

        // Extract component name and type from nested path
        const relative_path = path.relative(path.join(__dirname, '../../app/js/bundles'), file);
        const path_parts = relative_path.split(path.sep);
        const component_type = path_parts[0]; // 'pages', 'user', or 'components'
        const component_name = path.basename(file, '.js');
        
        console.log(`\n=== Processing ${component_name} ===`);
        console.log(`  File: ${file}`);
        console.log(`  Type: ${component_type}`);
        console.log(`  Relative path: ${relative_path}`);

        // Get file stats
        const stats = fs.statSync(file);
        const file_size = stats.size;
        console.log(`  Bundle size: ${file_size} bytes`);

        // Look for source file to extract routes
        let routes = [];
        let source_found = false;

        // Try multiple source locations for nested structure
        const source_paths = [
            path.join(__dirname, `../src/${component_type}/${component_name}/index.js`),
            path.join(__dirname, `../src/${component_type}/${component_name}/${component_name}.js`),
            path.join(__dirname, `../src/${component_type}/${component_name}.js`),
            path.join(__dirname, `../src/${component_type}/${path_parts.slice(1).join('/')}`),
            path.join(__dirname, `../src/${component_type}/${path_parts.slice(1, -1).join('/')}/${component_name}.js`)
        ];

        console.log(`  Looking for source to extract routes:`);
        for (const source_path of source_paths) {
            const exists = fs.existsSync(source_path);
            console.log(`    ${exists ? '✓' : '✗'} ${source_path}`);
            if (exists) {
                try {
                    const source_code = fs.readFileSync(source_path, 'utf8');
                    routes = parse_routes_from_source(source_code, component_name);
                    source_found = true;
                    break;
                } catch (err) {
                    console.error(`  ERROR reading source file: ${err.message}`);
                }
            }
        }

        if (!source_found) {
            // Use default route if no source found
            routes = ['/' + component_name
                .replace(/([A-Z])/g, '-$1')
                .toLowerCase()
                .replace(/^-/, '')];
            console.warn(`  ⚠ Source file not found, using default route: ${routes[0]}`);
        }

        console.log(`  Routes: ${routes.join(', ')}`);

        // Determine the actual component type for the API
        let api_component_type;
        if (component_type === 'pages') {
            api_component_type = 'page';
        } else if (component_type === 'user') {
            api_component_type = 'user_module';
        } else {
            api_component_type = 'component';
        }

        // Create relative path from app directory
        const bundle_path_from_app = path.relative(
            path.join(__dirname, '../../app'),
            file
        );

        manifest.components.push({
            name: component_name,
            component_type: api_component_type,
            routes: routes,
            bundle_path: bundle_path_from_app,
            file_size: file_size,
            description: `${component_type} ${component_name}`,
            version: '1.0.0'
        });

        processed_count++;
    }

    // Write manifest to app directory
    const manifest_path = path.join(__dirname, '../../app/component-upload-manifest.json');
    fs.writeFileSync(manifest_path, JSON.stringify(manifest, null, 2));

    console.log('\n=== MANIFEST GENERATION SUMMARY ===');
    console.log(`Total files found: ${bundle_files.length}`);
    console.log(`Components processed: ${processed_count}`);
    console.log(`Skipped: ${skip_count}`);
    console.log(`Manifest written to: ${manifest_path}`);
    console.log(`Manifest size: ${fs.statSync(manifest_path).size} bytes`);
    console.log(`=== GENERATION COMPLETE ===`);

    // Also create a simple summary file for debugging
    const summary_path = path.join(__dirname, '../../app/component-upload-summary.txt');
    const summary_lines = [
        `Component Upload Manifest Summary`,
        `Generated: ${manifest.generated_at}`,
        `Total Components: ${manifest.components.length}`,
        ``,
        `Components by Type:`,
        `  Pages: ${manifest.components.filter(c => c.component_type === 'page').length}`,
        `  User Modules: ${manifest.components.filter(c => c.component_type === 'user_module').length}`,
        `  Components: ${manifest.components.filter(c => c.component_type === 'component').length}`,
        ``,
        `Component List:`,
        ...manifest.components.map(c => `  - ${c.name} (${c.component_type}) → ${c.routes.join(', ')}`)
    ];
    fs.writeFileSync(summary_path, summary_lines.join('\n'));
    console.log(`Summary written to: ${summary_path}`);
}

// Run if called directly
if (require.main === module) {
    generate_manifest().catch(error => {
        console.error('\n=== FATAL ERROR ===');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    });
}

module.exports = { generate_manifest };