const fs = require('fs');
const { resolve, dirname, join } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { StatsWriterPlugin } = require('webpack-stats-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { merge } = require('webpack-merge');
const isDevelopment = process.env.NODE_ENV === 'development';
const __root__ = resolve(__dirname);

module.exports = {
  entry: {
    index: './src/index.ts',
    options: './src/options.ts',
  },
  output: {
    filename: 'js/[name].[contenthash].js', // 👈 Solves Safari JS caching
    path: resolve(__dirname, 'build'),
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.html$/,
        loader: 'html-loader',
        options: {
          minimize: !isDevelopment
            ? {
                // collapseInlineTagWhitespace: true,
                // conservativeCollapse: true,
                collapseWhitespace: true,
                keepClosingSlash: true,
                minifyCSS: true,
                minifyJS: true,
                removeComments: true,
                removeRedundantAttributes: true,
                removeScriptTypeAttributes: true,
                removeStyleLinkTypeAttributes: true,
              }
            : false,
        },
        exclude: /node_modules/,
      },
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader', // 2. Translates CSS into CommonJS
          // 'sass-loader', // 1. Compiles Sass to CSS
          {
            loader: 'sass-loader',
            options: {
              sassOptions: {
                quietDeps: true,
                silenceDeprecations: ['import', 'global-builtin', 'color-functions'],
                includePaths: [resolve(__dirname, 'node_modules')],
              },
            },
          },
        ],
      },
      {
        // 2. Capture the images found by html-loader
        test: /\.(png|svg|jpg|jpeg|gif|ico)$/i,
        type: 'asset/resource',
        generator: {
          // 3. Define the destination folder inside 'dist/'
          filename: 'images/[name].[hash][ext][query]',
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      minify: isDevelopment ? false : true,
      template: './src/index.html',
      filename: 'index.html',
      inject: 'body',
      publicPath: './',
      chunks: ['index'],
    }),
    new HtmlWebpackPlugin({
      minify: isDevelopment ? false : true,
      template: './src/options.html',
      filename: 'options.html',
      inject: 'body',
      publicPath: './',
      chunks: ['options'],
    }),
    new StatsWriterPlugin({
      filename: 'manifest.json',
      stats: {
        all: false,
        hash: true, // Includes the main build hash
      },
      transform({ hash }) {
        const manifest = merge(
          JSON.parse(fs.readFileSync(resolve(__root__, 'manifest.json'))),
          // { action: { default_popup: `index.${hash}.html` } }
          { action: { default_popup: `index.html` } }
        );

        return JSON.stringify(manifest, null, 2);
      },
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash].css', // 👈 Solves Safari CSS caching
    }),
    new CopyWebpackPlugin({
      patterns: [{ from: 'src/images/apple-touch-icon.png', to: 'images' }],
    }),
  ],
  mode: isDevelopment ? 'development' : 'production',
};
