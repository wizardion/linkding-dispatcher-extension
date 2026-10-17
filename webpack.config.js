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
    background: './src/background.ts',
    options: './src/options.ts',
    offscreen: './src/offscreen.ts',
  },
  output: {
    filename: 'js/[name].[contenthash].js', // 👈 Solves Safari JS caching
    path: resolve(__dirname, 'build'),
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        // 1. Extract the separately compiled Bootstrap stylesheet
        vendorStyles: {
          name: 'vendors',
          test: /[\\/]bootstrap\.scss$/,
          type: 'css/mini-extract',
          chunks: 'all',
          enforce: true,
        },
        // 2. Grab all application CSS and put it in 'local'
        localStyles: {
          name: 'local',
          test: /^(?!.*[\\/]bootstrap\.scss$).*\.scss$/,
          type: 'css/mini-extract',
          chunks: 'all',
          enforce: true,
        },
      },
    },
  },
  // optimization: {
  //   splitChunks: {
  //     cacheGroups: {
  //       // Group all third-party styles (e.g., from node_modules) into vendors
  //       vendorStyles: {
  //         name: 'vendors',
  //         test: /[\\/]node_modules[\\/].*\.s?css$/,
  //         chunks: 'all',
  //         enforce: true,
  //       },
  //       // Group your local application styles
  //       localStyles: {
  //         name: 'main',
  //         test: /[\\/]src[\\/].*\.s?css$/,
  //         chunks: 'all',
  //         enforce: true,
  //       },
  //     },
  //   },
  // },
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
      // {
      //   test: /\.(sa|sc|c)ss$/,
      //   use: [
      //     isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
      //     'css-loader', // 2. Translates CSS into CommonJS
      //     // 'sass-loader', // 1. Compiles Sass to CSS
      //     {
      //       loader: 'sass-loader',
      //       options: {
      //         sassOptions: {
      //           quietDeps: true,
      //           silenceDeprecations: ['import', 'global-builtin', 'color-functions'],
      //           includePaths: [resolve(__dirname, 'node_modules')],
      //         },
      //       },
      //     },
      //   ],
      // },
      {
        test: /\.s[ac]ss$/i,
        use: [
          MiniCssExtractPlugin.loader, // Extracts CSS into separate files
          'css-loader', // Turns CSS into commonjs
          'sass-loader', // Compiles Sass to CSS
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
      chunks: ['vendors', 'local', 'index', 'background'],
    }),
    new HtmlWebpackPlugin({
      minify: isDevelopment ? false : true,
      template: './src/options.html',
      filename: 'options.html',
      inject: 'body',
      publicPath: './',
      chunks: ['vendors', 'local', 'options'],
    }),
    new HtmlWebpackPlugin({
      minify: isDevelopment ? false : true,
      template: './src/offscreen.html',
      filename: 'offscreen.html',
      inject: 'head',
      publicPath: './',
      chunks: ['offscreen'],
    }),
    new StatsWriterPlugin({
      filename: 'manifest.json',
      stats: {
        all: false,
        // hash: true, // Includes the main build hash
        entrypoints: true,
        assets: false, // Optional: keeps the output cleaner
      },
      transform({ entrypoints }) {
        const backgroundAssets = entrypoints.background?.assets || [];
        const background = backgroundAssets.find((asset) => asset.name.endsWith('.js'));

        const manifest = merge(
          JSON.parse(fs.readFileSync(resolve(__root__, 'manifest.json'))),
          // { action: { default_popup: `index.${hash}.html` } }
          { action: { default_popup: `index.html` } },
          { background: { service_worker: background.name } }
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
