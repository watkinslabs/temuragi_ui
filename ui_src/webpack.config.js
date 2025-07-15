const path = require('path');
const webpack = require('webpack');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');

module.exports = {
    mode: process.env.NODE_ENV || 'development',
    devtool: 'source-map',

    entry: {
        main: './src/index.js'
    },

    output: {
        path: path.resolve(__dirname, '../app/static/js'),
        filename: '[name].js',
        chunkFilename: '[name].chunk.js',
        publicPath: '/static/js/',
        clean: {
            keep: /bundles\// // Keep bundles directory when cleaning
        }
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
                            ['@babel/preset-react', {
                                runtime: 'classic' // or 'automatic' for React 17+
                            }]
                        ],
                        cacheDirectory: true
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
            '@': path.resolve(__dirname, 'src')
        }
    },

    optimization: {
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendor',
                    priority: 10
                },
                common: {
                    minChunks: 2,
                    priority: 5,
                    reuseExistingChunk: true
                }
            }
        },
        runtimeChunk: 'single'
    },

    plugins: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
        }),

        // Generate manifest for backend to know filenames
        new WebpackManifestPlugin({
            fileName: 'manifest.json',
            publicPath: '/static/js/'
        })
    ],

    devServer: {
        static: path.join(__dirname, '../app/static'),
        port: 3000,
        hot: true,
        proxy: {
            '/api': 'http://localhost:5000',
            '/auth': 'http://localhost:5000',
            '/site': 'http://localhost:5000',
            '/routes': 'http://localhost:5000'
        }
    }
};