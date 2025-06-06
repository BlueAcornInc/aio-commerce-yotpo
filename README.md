# Yotpo by Blue Acorn

Welcome to the Yotpo App for Adobe Commerce. This app provides a lightweight, out-of-process solution to manage yotpo integration settings for Adobe Commerce. Configuration is set at install time via Adobe Exchange, and the app exposes a read-only endpoint to retrieve these settings for use in your Commerce instance.

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
```

#### Notes:

- **Runtime Credentials**: Set via `aio app use` if deploying to a specific namespace.

### `app.config.yaml`

- The main configuration file defining the app’s implementation.
- Defines the `yotpo-config` action
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

- **Configuration**: Set via Adobe Commerce admin backend
  - Enable/disable review synchornization
  - Yotpo API Keys
- **Action**: The `yotpo-config` action (GET-only) retrieves these settings from environment variables and returns them as JSON.

## Integration with Adobe Commerce

- Use the `yotpo-config` endpoint (`/api/v1/web/aio-commerce-yotpo-app/yotpo-config`) in a custom Commerce module to access settings.

`aio app use`

Generate the encryption keys and store them in the .env file.

Encryption Key:

`echo "ENCRYPTION_KEY=$(openssl rand -hex 32)" > .env`

IV Key:

`echo "ENCRYPTION_IV=$(openssl rand -hex 16)" > .env`

Run the local test of your app:
`aio app run`

This deploys the runtime functions in Adobe cloud and the local form instance consumes it.

Visit https://localhost:9080
to see the form in action.

## With Adobe Commerce

You need the following prerequisites to test on local:

- https://localhost:8443 AC instance up and running using the evergreen repo
- Your app builder repo must be inside the AC root codebase.
- Admin SDK module installed in AC composer.json the following line: `"magento/commerce-backend-sdk": "3.0.0 as 2.3.0",`
- IMS auth on your local AC instance.

## IMS Faking

<https://developer.adobe.com/commerce/extensibility/admin-ui-sdk/configuration/>
get node server snippet from there and paste it inside a random directory in your AC container. This must be done inside AC php container. Run `node server.js` after generating key/cert following instructions in that link above.

This short circuits the ims authorization and serves you the aio app. In your aio app dir,

## Next Steps

Shell into magento container inside your aio app dir and set up aio:\
`npm install -g @adobe/aio-cli`\
Navigate to your AIO app repo codebase (inside the AC codebase as mentioned before)
Run`aio auth:login`. Once installed make sure you have a project workspace already in [Adobe console developer (ACD) ](https://developer.adobe.com/console/projects/) set up.

Go into your builder project workspace and select "Download All" to get the json at the top right of ACD.
save this as `config.json` in your aio app dir. Run `aio app use config.json` to load the profile. To launch your app

Once you got to this stage, and you still have `server.js` running:

- Run `aio app dev`
- Go to admin AC admin area:
  Stores -> Configuration Adobe Services -> Admin UI SDK

**General configuration**
Enable Admin UI SDK: Yes
(Enable the AdobeAdminims module to use the Admin UI SDK.)

**Testing**
Enable testing: Yes
Local Server Base URL: https://localhost:9090/
Mock AdobeAdminIms Module: Yes

- Save
- Click "Refresh Integrations" in that admin area

This registers the menu and you should see it now after admin refresh. But the form wont load. to do that:

## Backend Form

- Cancel out of the aio app dev command currently running, It's already registered and does not need to run all the time.
  If you have 2 apps running, 1 of them being Admin SDK form and 1 of them being another application ( reference your `app.config.yaml` file of your AIO app, then you need to run `aio app run -e [application_name]` to deploy the endpoints or runtime functions to adobe before your form can work completely if it has dependencies on it. You will see message in terminal saying it was successfully deployed. now terminate that command with ctrl+c.
- Run `aio app run -e commerce/backend-ui/1`
- Go back to Magento admin, refresh, and you should see the form load in the space now.
