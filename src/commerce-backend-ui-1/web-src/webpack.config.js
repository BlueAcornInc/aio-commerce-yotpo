const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
    mode: "production",
    entry: "./App.jsx",
    output: {
        path: path.resolve(__dirname, "../../..", "dist/commerce-backend-ui-1/web-prod"),
        filename: "bundle.js",
        publicPath: "/dist/",
    },
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["@babel/preset-env", "@babel/preset-react"],
                    },
                },
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"],
            },
        ],
    },
    resolve: {
        extensions: [".js", ".jsx"],
    },
    plugins: [
        new webpack.DefinePlugin({
            "process.env.NODE_ENV": JSON.stringify("production"),
        }),
        new HtmlWebpackPlugin({
            template: "./index.html",
            filename: "index.html",
            inject: false
        }),
    ],
    devServer: {
        static: {
            directory: path.resolve(__dirname),
            publicPath: "/",
        },
        historyApiFallback: true,
        port: 8080,
        setupMiddlewares: (middlewares, devServer) => {
            if (!devServer) {
                throw new Error("webpack-dev-server is not defined");
            }
            devServer.app.get("/mock-config", (req, res) => {
                res.json({
                    config: {
                        appKey: "mock-key",
                        apiSecret: "mock-secret",
                        status: "on",
                    },
                });
            });
            devServer.app.post("/mock-config", (req, res) => {
                res.json({ success: true, message: "Config saved (mock)" });
            });
            return middlewares;
        },
    },
};