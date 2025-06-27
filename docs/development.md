# Development Guide for this AppBuilder App

This guide provides comprehensive instructions and best practices for setting up, developing, testing, and debugging your Adobe App Builder application. It covers both standalone development and integration with Adobe Commerce. This document is intended for developers working on this specific App Builder project.

-----

## Table of Contents

  * [Setup](#setup)
      * [Environment Variables](#environment-variables)
      * [Adobe I/O Project Linkage](#adobe-io-project-linkage)
  * [Local Development](#local-development)
      * [Starting the Local Development Server](#starting-the-local-development-server)
      * [Running Actions Locally](#running-actions-locally)
  * [Testing & Coverage](#testing--coverage)
      * [Running Unit Tests](#running-unit-tests)
      * [Running End-to-End Tests](#running-end-to-end-tests)
  * [Debugging in VS Code](#debugging-in-vs-code)
  * [TypeScript Support for UI](#typescript-support-for-ui)
  * [Development Without Magento Adobe Commerce](#development-without-magento-adobe-commerce)
  * [Development With Adobe Commerce](#development-with-adobe-commerce)
      * [IMS Faking](#ims-faking)
      * [Next Steps (Configuring App in Adobe Commerce Admin)](#next-steps-configuring-app-in-adobe-commerce-admin)
  * [Troubleshooting](#troubleshooting)
  * [Contributing](#contributing)

-----

## Setup

Before you begin, ensure your development environment is correctly configured.

### Environment Variables

Populate the `.env` file in the project root for local testing. An example `.env` file structure is shown below:

```
# Example .env file
# This file should contain sensitive information and should not be committed to version control.

# ADOBE_CLIENT_ID=your_adobe_client_id
# ADOBE_CLIENT_SECRET=your_adobe_client_secret
# ADOBE_IMS_ORG=your_adobe_ims_org
# AIO_API_KEY=your_adobe_io_api_key
# AIO_API_SECRET=your_adobe_io_api_secret

# Add any other environment variables your application requires
ENCRYPTION_KEY=your_generated_encryption_key
ENCRYPTION_IV=your_generated_iv_key
```

**Note:** The `.env` file is crucial for local development and should **not** be committed to version control due to its sensitive nature.

### Adobe I/O Project Linkage

Ensure you've linked an Adobe I/O project using the Adobe I/O CLI. If you haven't already, run the following command:

```bash
aio app use
```

Refer to the [official Adobe I/O documentation on project configuration](https://www.google.com/search?q=https://developer.adobe.com/app-builder/docs/guides/app_builder_guides/configuration/) for more details.

## Local Development

Use the following commands to run and test your application locally.

### Starting the Local Development Server

To start your local development server, run:

```bash
aio app run
```

By default, the app will run on `localhost:9080`. In this mode, the UI is served locally, while your actions are deployed to Adobe I/O Runtime. This is ideal for quickly iterating on your UI.

### Running Actions Locally

To run both the UI and your actions locally, which can be useful for debugging and rapid development of your backend logic, use:

```bash
aio app run --local
```

## Testing & Coverage

Thorough testing is essential for a robust application. App Builder provides commands for both unit and end-to-end testing.

### Running Unit Tests

To execute unit tests for both your UI components and your actions, run:

```bash
aio app test
```

This command provides quick feedback on individual components and functions.

### Running End-to-End Tests

To run end-to-end tests, which simulate user interactions and verify the entire application flow, use:

```bash
aio app test --e2e
```

End-to-end tests are crucial for ensuring the various parts of your application work together seamlessly.

## Debugging in VS Code

While running your local server (`aio app run`), you can debug both your UI and actions directly within VS Code. **Ensure you have the Adobe Experience Platform Debugger extension installed in VS Code for the best experience.**

1.  Open the Debugger view (typically by clicking the bug icon in the activity bar).
2.  From the dropdown, select the `WebAndActions` configuration to debug both your UI and actions simultaneously.
3.  Alternatively, use individual configurations for debugging just the UI or a specific action, such as `bazaarvoice-config`, if you prefer more granular control.

## TypeScript Support for UI

If you intend to use TypeScript for your User Interface development:

  * Use the `.tsx` file extension for your React components.

  * Add a `tsconfig.json` file to your UI project with the following essential configuration:

    ```json
    {
      "compilerOptions": {
        "jsx": "react"
      }
    }
    ```

    This setting instructs the TypeScript compiler to properly handle JSX syntax within your `.tsx` files.

## Development Without Magento Adobe Commerce

This approach provides the easiest way to develop and test your code, assuming your Admin SDK menu inside Adobe Commerce is functional and loads the form as expected. You do not need to run your app within a Commerce container for this method.

1.  **Authentication and Encryption Key Generation:** In your terminal, from the root directory of your App Builder app, run the following commands to authenticate with Adobe I/O and generate necessary encryption keys. These keys will be stored directly in your `.env` file.

    ```bash
    aio auth:login
    aio app use
    echo "ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env
    echo "ENCRYPTION_IV=$(openssl rand -hex 16)" >> .env
    ```

      * `aio auth:login`: Authenticates your CLI with Adobe I/O.
      * `aio app use`: Ensures your project workspace is correctly linked and active.
      * The `echo` commands generate random hexadecimal strings for `ENCRYPTION_KEY` and `ENCRYPTION_IV` and append them to your `.env` file. Use `>>` to append, so existing `.env` content is preserved.

2.  **Run the Local App:**

    ```bash
    aio app run
    ```

    This command deploys your runtime functions to the Adobe Cloud, and your local form instance will consume them.

3.  **Visit the Form:** Open your web browser and navigate to `https://localhost:9080` to see your form in action.

## Development With Adobe Commerce

To test your App Builder application directly within a local Adobe Commerce environment, you need to meet the following prerequisites:

  * **Adobe Commerce Instance:** Have a local Adobe Commerce instance up and running, accessible at `https://localhost:8443`. This instance should be based on the Evergreen repository.

  * **App Builder Repo Location:** Your App Builder repository must be located *inside* the Adobe Commerce root codebase (e.g., within a custom module's `view/adminhtml/web/app-builder` directory).

  * **Admin SDK Module:** The `magento/commerce-backend-sdk` module must be installed in your Adobe Commerce `composer.json`. Add the following line to your `require` section:

    ```json
    "magento/commerce-backend-sdk": "3.0.0 as 2.3.0",
    ```

  * **IMS Authentication:** Ensure IMS (Identity Management System) authentication is configured and working on your local Adobe Commerce instance.

### IMS Faking

To bypass direct IMS authorization for local development and serve your AIO app through a simpler mechanism (useful for quick local testing within the Commerce admin):

1.  **Get Node Server Snippet:** Obtain the Node.js server snippet from the Adobe Developer documentation: [https://developer.adobe.com/commerce/extensibility/admin-ui-sdk/configuration/](https://developer.adobe.com/commerce/extensibility/admin-ui-sdk/configuration/)

2.  **Paste and Run in AC Container:** Paste this snippet into a suitable directory *inside your Adobe Commerce PHP container*. After generating the key and certificate as per the instructions in the link above, run the server:

    ```bash
    node server.js
    ```

    This `server.js` will short-circuit IMS authorization and serve your AIO app.

### Next Steps (Configuring App in Adobe Commerce Admin)

Once the `server.js` is running, follow these steps to integrate and launch your app within the Adobe Commerce admin:

1.  **Shell into Magento Container:**

    ```bash
    # Example command, your actual command may vary depending on your Docker setup
    docker exec -it <your-magento-php-container-name> bash
    ```

2.  **Set up AIO CLI:** Inside the Magento container, navigate to your AIO app directory (which is within the AC codebase) and install the Adobe I/O CLI:

    ```bash
    npm install -g @adobe/aio-cli
    ```

3.  **Login and Load Profile:**

    ```bash
    aio auth:login
    ```

    Once authenticated, ensure you have a project workspace already set up in the [Adobe Console Developer (ACD)](https://developer.adobe.com/console/projects/).
    Go into your App Builder project workspace and select "Download All" (usually at the top right of ACD) to get the `config.json` file. Save this `config.json` in your AIO app directory (inside the AC codebase).
    Then, load your project profile:

    ```bash
    aio app use config.json
    ```

4.  **Launch Your App:**

    ```bash
    aio app dev
    ```

5.  **Configure Admin UI SDK in Adobe Commerce Admin:**
    Go to your Adobe Commerce admin area: `Stores -> Configuration -> Adobe Services -> Admin UI SDK`

    Under **General configuration**:

      * **Enable Admin UI SDK:** Select `Yes` (This enables the AdobeAdminims module to use the Admin UI SDK.)

    Under **Testing**:

      * **Enable testing:** Select `Yes`
      * **Local Server Base URL:** Enter `https://localhost:9090/`
      * **Mock AdobeAdminIms Module:** Select `Yes`

6.  **Save Configuration:** Click the "Save Config" button.

7.  **Refresh Integrations:** Click "Refresh Integrations" in that admin area. This registers the menu for your App Builder app, and you should now see it after an admin refresh.

    **Note:** At this stage, the menu should be registered, but the form itself might not load. Further debugging or specific configuration for your App Builder form within the Magento Admin UI SDK might be required.

## Troubleshooting

This section provides solutions to common issues encountered during development.

  * **App not loading on `localhost:9080`:**
      * Ensure `aio app run` is running and no other process is using port 9080.
      * Check your browser's console for any JavaScript errors.
      * Verify your `.env` file is correctly populated.
  * **Actions failing on Adobe I/O Runtime:**
      * Check the Adobe I/O Runtime logs for your actions using `aio app logs`.
      * Verify your `manifest.yml` action definitions are correct.
      * Ensure all required environment variables for your actions are set in `.env` or in the Adobe I/O Console.
  * **Magento Admin UI SDK menu not appearing:**
      * Confirm all prerequisites under "Development With Adobe Commerce" are met.
      * Verify `aio app dev` is running inside the Magento container.
      * Ensure the `Admin UI SDK` configuration in Adobe Commerce admin is saved and integrations are refreshed.
      * Clear Magento cache if necessary.

## Contributing

If you wish to contribute to this project, please follow these guidelines:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix (`git checkout -b feature/your-feature-name`).
3.  Ensure your code adheres to the project's [linting and formatting standards](#linting-and-formatting-optional-new-section).
4.  Write or update unit and end-to-end tests for your changes.
5.  Submit a pull request with a clear description of your changes.