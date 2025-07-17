// webpack.pages.config.js - Enhanced version
const path = require('path');
const fs = require('fs');
const glob = require('glob');
const webpack = require('webpack');

// Find all entry points
const page_entries = {};
const user_entries = {};
const component_entries = {};

// Scan for pages with various entry patterns
const page_patterns = [
    'src/pages/*/index.js',
    'src/pages/*/*.js',
    'src/pages/*/*/index.js',
];

page_patterns.forEach(pattern => {
    glob.sync(pattern).forEach(file => {
        // Extract page name from path
        const relative = path.relative('src/pages', file);
        const parts = relative.split('/');

        // Handle different structures:
        // ReportBuilder/index.js -> ReportBuilder
        // ReportBuilder/ReportBuilder.js -> ReportBuilder
        // ReportBuilder/components/ReportList.js -> ReportBuilder/components/ReportList
        let name;
        if (parts[parts.length - 1] === 'index.js') {
            parts.pop();
            name = parts.join('/');
        } else {
            name = parts.join('/').replace('.js', '');
        }

        // Skip if already added or is a component within a page
        if (!page_entries[name] && !name.includes('components/')) {
            page_entries[`pages/${name}`] = `./${file}`;
        }
    });
});

// Scan for user directory with same patterns
const user_patterns = [
    'src/user/*/index.js',
    'src/user/*/*.js',
    'src/user/*/*/index.js',
];

user_patterns.forEach(pattern => {
    glob.sync(pattern).forEach(file => {
        // Extract user module name from path
        const relative = path.relative('src/user', file);
        const parts = relative.split('/');

        let name;
        if (parts[parts.length - 1] === 'index.js') {
            parts.pop();
            name = parts.join('/');
        } else {
            name = parts.join('/').replace('.js', '');
        }

        // Skip if already added or is a component within a user module
        if (!user_entries[name] && !name.includes('components/')) {
            user_entries[`user/${name}`] = `./${file}`;
        }
    });
});

// Scan for standalone components
glob.sync('src/components/*/index.js').forEach(file => {
    const name = path.dirname(file).split('/').pop();
    if (!['DynamicPage', 'LoadingScreen'].includes(name)) {
        component_entries[`components/${name}`] = `./${file}`;
    }
});

console.log('Building pages:', Object.keys(page_entries));
console.log('Building user modules:', Object.keys(user_entries));
console.log('Building components:', Object.keys(component_entries));

module.exports = {
    mode: 'production',
    entry: { ...page_entries, ...user_entries, ...component_entries },

    output: {
        path: path.resolve(__dirname, '../app/static/js/bundles'),
        filename: '[name].js',
        chunkFilename: 'chunks/[name].js',
        publicPath: '/static/js/bundles/',
        clean: true
    },

    module: {
        rules: [
            {
                test: /\.jsx?$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            '@babel/preset-env',
                            '@babel/preset-react'
                        ]
                    }
                }
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    },

    resolve: {
        extensions: ['.js', '.jsx'],
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@components': path.resolve(__dirname, 'src/components'),
            '@pages': path.resolve(__dirname, 'src/pages'),
            '@user': path.resolve(__dirname, 'src/user'),
            '@utils': path.resolve(__dirname, 'src/utils')
        }
    },

    externals: {
        'react': 'React',
        'react-dom': 'ReactDOM',
        // Add your contexts as externals
        '../contexts/AuthContext': 'window.AuthContext',
        '../contexts/SiteContext': 'window.SiteContext',
        '../../contexts/AuthContext': 'window.AuthContext',
        '../../contexts/SiteContext': 'window.SiteContext'
    },

    optimization: {

        minimize: true,
        usedExports: false,
        splitChunks: {
            chunks: 'async',
            cacheGroups: {
                // Shared components between pages
                shared: {
                    test: /[\\/]src[\\/]components[\\/]/,
                    name: 'shared-components',
                    minChunks: 2,
                    priority: 10,
                    reuseExistingChunk: true
                }
            }
        }
    },
    

    plugins: [
        // Define module boundaries
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production')
        }),

        // Add this to webpack.pages.config.js plugins section
        new webpack.BannerPlugin({
            banner: (data) => {
                const chunk_name = data.chunk.name;
                if (chunk_name.startsWith('pages/')) {
                    const page_name = chunk_name.replace('pages/', '');
                    return `
        (function() {
            const module = typeof exports !== 'undefined' ? exports.default || exports : null;
            if (module && window.app_registry) {
                window.app_registry.register_page('${page_name}', module);
                window.dispatchEvent(new CustomEvent('module_registered', {
                    detail: { name: '${page_name}', type: 'page', module: module }
                }));
            }
        })();
        `;
                } else if (chunk_name.startsWith('user/')) {
                    const user_module_name = chunk_name.replace('user/', '');
                    return `
        (function() {
            const module = typeof exports !== 'undefined' ? exports.default || exports : null;
            if (module && window.app_registry) {
                window.app_registry.register_user_module('${user_module_name}', module);
                window.dispatchEvent(new CustomEvent('module_registered', {
                    detail: { name: '${user_module_name}', type: 'user', module: module }
                }));
            }
        })();
        `;
                }
                return '';
            },
            raw: true,
            entryOnly: true
        }),
        // Generate dependency manifest
        {
            apply: (compiler) => {
                compiler.hooks.emit.tapAsync('GenerateDependencyManifest', (compilation, callback) => {
                    const manifest = {};
                    const dependencies = {};

                    // Analyze each chunk
                    for (const chunk of compilation.chunks) {
                        const files = Array.from(chunk.files);
                        const modules = Array.from(chunk.modulesIterable || []);

                        dependencies[chunk.name] = {
                            files: files,
                            imports: modules
                                .filter(m => m.resource && m.resource.includes('src/'))
                                .map(m => path.relative(compiler.context, m.resource))
                        };
                    }

                    // Generate manifest
                    for (const [name, asset] of Object.entries(compilation.assets)) {
                        if (name.endsWith('.js') && !name.includes('.map')) {
                            const key = name.replace(/\.js$/, '');
                            manifest[key] = {
                                url: `/static/js/bundles/${name}`,
                                dependencies: dependencies[key] || { files: [], imports: [] }
                            };
                        }
                    }

                    const json = JSON.stringify(manifest, null, 2);
                    compilation.assets['manifest-with-deps.json'] = {
                        source: () => json,
                        size: () => json.length
                    };

                    callback();
                });
            }
        }

    ]
};