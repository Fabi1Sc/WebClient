const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WriteWebpackPlugin = require('write-webpack-plugin');
const ImageminPlugin = require('imagemin-webpack-plugin').default;
const imageminMozjpeg = require('imagemin-mozjpeg');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const AutoDllPlugin = require('autodll-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin');

const transformOpenpgpFiles = require('./helpers/openpgp');
const CONFIG = require('../env/conf.build');
const env = require('../env/config');

const makeSRC = (list) => list.map((file) => path.resolve(file));

const isDistRelease = env.isDistRelease();

const { mainFiles: openpgpFiles, workerFiles: openpgpWorkerFiles } = transformOpenpgpFiles(
    CONFIG.externalFiles.openpgp,
    CONFIG.externalFiles.openpgp_workers,
    isDistRelease
);

const minify = () => {
    if (!isDistRelease) {
        return false;
    }

    return {
        removeAttributeQuotes: true,
        collapseWhitespace: true,
        html5: true,
        minifyCSS: true,
        removeComments: true,
        removeEmptyAttributes: true
    };
};

const list = [
    // HashedModuleIdsPlugin recommended for production https://webpack.js.org/guides/caching/
    isDistRelease ? new webpack.HashedModuleIdsPlugin() : new webpack.NamedModulesPlugin(),

    // new WebpackNotifierPlugin(),
    new CopyWebpackPlugin([
        ...makeSRC(CONFIG.vendor_files.fonts).map((font) => ({
            from: font,
            to: 'assets/fonts',
            flatten: true
        })),

        { from: 'src/i18n', to: 'i18n' },
        { from: 'src/assets', to: 'assets' }
    ]),

    new WriteWebpackPlugin([
        ...openpgpFiles.concat(openpgpWorkerFiles).map(({ filepath, contents }) => ({
            name: filepath,
            data: Buffer.from(contents)
        }))
    ]),

    new MiniCssExtractPlugin({
        filename: isDistRelease ? '[name].[hash:8].css' : '[name].css',
        chunkFilename: isDistRelease ? '[id].[hash:8].css' : '[id].css'
    }),

    new HtmlWebpackPlugin({
        template: 'src/app.ejs',
        inject: 'body',
        defer: ['app'],
        minify: minify(),
        templateParameters: {
            OPENPGP: openpgpFiles[0].filepath,
            OPENPGP_COMPAT: openpgpFiles[1].filepath
        }
    }),

    new webpack.DefinePlugin({
        // Needs to be wrapped in strings because webpack does a direct replace
        OPENPGP_WORKER: JSON.stringify(openpgpWorkerFiles[0].filepath),
        OPENPGP_WORKER_COMPAT: JSON.stringify(openpgpWorkerFiles[1].filepath)
    }),

    new ScriptExtHtmlWebpackPlugin({
        defaultAttribute: 'defer'
    }),

    new webpack.SourceMapDevToolPlugin({
        filename: isDistRelease ? '[name].[hash:8].js.map' : '[name].js.map',
        exclude: ['styles', 'vendor', 'vendorLazy', 'vendorLazy2']
    })
];

if (!isDistRelease) {
    // cf https://github.com/mzgoddard/hard-source-webpack-plugin/issues/301
    // list.unshift(new HardSourceWebpackPlugin());
    list.push(
        new AutoDllPlugin({
            inject: true, // will inject the DLL bundles to index.html
            filename: '[name]_[hash].js'
        })
    );
}

if (isDistRelease) {
    list.push(
        new OptimizeCSSAssetsPlugin({
            cssProcessorPluginOptions: {
                preset: [
                    'default',
                    {
                        reduceInitial: false,
                        discardComments: {
                            removeAll: true
                        }
                    }
                ]
            }
        })
    );

    list.push(
        new ImageminPlugin({
            cacheFolder: path.resolve('./node_modules/.cache'),
            maxConcurrency: Infinity,
            disable: false,
            test: /\.(jpe?g|png)$/i,
            optipng: {
                optimizationLevel: 7
            },
            pngquant: {
                quality: '80-100'
            },
            jpegtran: {
                progressive: true
            },
            plugins: [
                imageminMozjpeg({
                    quality: 80,
                    progressive: true
                })
            ]
        })
    );
}

module.exports = list;
