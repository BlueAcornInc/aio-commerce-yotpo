# Yotpo

Welcome to my Adobe I/O Application!

## Setup

- Populate the `.env` file in the project root and fill it as shown [below](#env)

## Local Dev

- `aio app run` to start your local Dev server
- App will run on `localhost:9080` by default

By default the UI will be served locally but actions will be deployed and served from Adobe I/O Runtime. To start a
local serverless stack and also run your actions locally use the `aio app run --local` option.

## Test & Coverage

- Run `aio app test` to run unit tests for ui and actions
- Run `aio app test --e2e` to run e2e tests

## Deploy & Cleanup

- `aio app deploy` to build and deploy all actions on Runtime and static files to CDN
- `aio app undeploy` to undeploy the app

## Config

### `.env`

You can generate this file using the command `aio app use`. 

```bash
# This file must **not** be committed to source control

## please provide your Adobe I/O Runtime credentials
# AIO_RUNTIME_AUTH=
# AIO_RUNTIME_NAMESPACE=
```

### `app.config.yaml`

- Main configuration file that defines an application's implementation. 
- More information on this file, application configuration, and extension configuration 
  can be found [here](https://developer.adobe.com/app-builder/docs/guides/appbuilder-configuration/#appconfigyaml)

#### Action Dependencies

- You have two options to resolve your actions' dependencies:

  1. **Packaged action file**: Add your action's dependencies to the root
   `package.json` and install them using `npm install`. Then set the `function`
   field in `app.config.yaml` to point to the **entry file** of your action
   folder. We will use `webpack` to package your code and dependencies into a
   single minified js file. The action will then be deployed as a single file.
   Use this method if you want to reduce the size of your actions.

  2. **Zipped action folder**: In the folder containing the action code add a
     `package.json` with the action's dependencies. Then set the `function`
     field in `app.config.yaml` to point to the **folder** of that action. We will
     install the required dependencies within that directory and zip the folder
     before deploying it as a zipped action. Use this method if you want to keep
     your action's dependencies separated.

## Debugging in VS Code

While running your local server (`aio app run`), both UI and actions can be debugged, to do so open the vscode debugger
and select the debugging configuration called `WebAndActions`.
Alternatively, there are also debug configs for only UI and each separate action.

# Local setup
You need the following prerequisites to test on local:

- https://localhost:8443 AC instance up and running using the evergreen repo
- Your app builder repo must be inside the AC root codebase.
- Admin SDK module installed in AC composer.json the following line: `"magento/commerce-backend-sdk": "2.2.0 as 1.4.1",`
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
save this as `config.json` in your aio app dir.  Run `aio app use config.json` to load the profile. To launch your app

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

- Cancel out of the aio app dev command currently running,  It's already registered and does not need to run all the time.
  If you have 2 apps running, 1 of them being Admin SDK form and 1 of them being another application ( reference your `app.config.yaml` file of your AIO app, then you need to run `aio app run -e [application_name]` to deploy the endpoints or runtime functions to adobe before your form can work completely if it has dependencies on it. You will see message in terminal saying it was successfully deployed. now terminate that command with ctrl+c.
- Run `aio app run -e commerce/backend-ui/1`
-  Go back to Magento admin, refresh, and you should see the form load in the space now.
