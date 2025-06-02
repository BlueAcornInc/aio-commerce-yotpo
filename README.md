# Adobe Commerce yotpo Integration

Welcome to the yotpo Configuration App for Adobe Commerce, built with Adobe App Builder!

This app provides a lightweight, out-of-process solution to manage yotpo integration settings for Adobe Commerce. Configuration is set at install time via Adobe Exchange, and the app exposes a read-only endpoint to retrieve these settings for use in your Commerce instance.

## Setup

- Populate the `.env` file in the project root for local testing as shown [below](#env).
- Ensure you’ve linked an Adobe I/O project using `aio app use` (see [Config](#config)).

## Local Dev

- `aio app run` to start your local dev server.
- The app will run on `localhost:9080` by default, serving the UI locally while actions are deployed to Adobe I/O Runtime.
- To run actions locally as well, use `aio app run --local`.

## Test & Coverage

- Run `aio app test` to execute unit tests for UI and actions.
- Run `aio app test --e2e` to run end-to-end tests.

## Deploy & Cleanup

- `aio app deploy` to build and deploy actions to Adobe I/O Runtime and static files to CDN.
- `aio app undeploy` to undeploy the app.

## Config

### `.env`

For local testing, create this file manually or generate it with `aio app use` if you have an Adobe I/O project config. It’s optional since configuration is managed via Adobe Exchange on deployment.

```bash
# This file must **not** be committed to source control

## Adobe I/O Runtime credentials (optional, set via aio app use)
# AIO_RUNTIME_AUTH=
# AIO_RUNTIME_NAMESPACE=

## Yopto configuration for local testing (overridden by configSchema on deployment)
YOTPO_API_KEY=APIKEYGOESHERE
ENABLE_REVIEWS_SYN=true
```

#### Notes:
- **Runtime Credentials**: Set via `aio app use` if deploying to a specific namespace.
- **Yotpo Config**: These are for local testing; deployed values come from `configSchema`.

### `app.config.yaml`

- The main configuration file defining the app’s implementation.
- Defines the `yotpo-config` action and a `configSchema` for user settings at install time.
- More details on configuration can be found [here](https://developer.adobe.com/app-builder/docs/guides/appbuilder-configuration/#appconfigyaml).

#### Action Dependencies

- Two options to resolve action dependencies:
    1. **Packaged Action File**: Add dependencies to the root `package.json`, install with `npm install`, and point `function` in `app.config.yaml` to the entry file (e.g., `src/app/actions/yotpo-config/index.js`). Webpack will bundle it into a single minified file. Use this for smaller action sizes.
    2. **Zipped Action Folder**: Add a `package.json` in the action folder (e.g., `src/app/actions/yotpo-config/`), list dependencies there, and point `function` to the folder. Dependencies will be installed and zipped for deployment. Use this to isolate action dependencies.

#### Current Setup
- The `yotpo-config` action uses the packaged file approach with dependencies in the root `package.json` (e.g., `@adobe/aio-sdk`).

## Debugging in VS Code

While running your local server (`aio app run`), debug UI and actions using VS Code:
- Open the debugger and select `WebAndActions` to debug both.
- Use individual configs for UI or the `yotpo-config` action if preferred.

## App Functionality

- **Configuration**: Set via Adobe Exchange at install time, including:
    - Enable/disable review synchornization
    - Yotpo API Keys
- **Action**: The `yotpo-config` action (GET-only) retrieves these settings from environment variables and returns them as JSON.

## Integration with Adobe Commerce

- Use the `yotpo-config` endpoint (`/api/v1/web/aio-commerce-yotpo-app/yotpo-config`) in a custom Commerce module to access settings.