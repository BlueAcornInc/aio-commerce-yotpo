# Yotpo by Blue Acorn

This Adobe App Builder extension provides a secure and efficient way for Adobe Commerce merchants to store and consume their Yotpo credentials. All configurations, including sensitive credentials, are managed directly within the Adobe Commerce Admin backend. The App Builder application securely retrieves these settings and makes them available to your storefront via API, enabling the display of user-generated content and integration with Yotpo services.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
  - [Via Download](#via-download)
- [Configuration (Adobe Commerce Backend)](#configuration-adobe-commerce-backend)
- [Environment Variables (App Builder Operational)](#environment-variables-app-builder-operational)
- [Usage](#usage)
- [Development](#development)
- [Support](#support)
- [Contributing](#contributing)

---

## Features

- **Secure Credential Storage:** Yotpo credentials are stored securely within your Adobe Commerce backend, which the App Builder application can then securely retrieve at runtime.
- **Frontend API Access:** The App Builder application exposes a secure API endpoint for your frontend to retrieve necessary Yotpo credentials and configuration, enabling direct interaction with Yotpo services.
- **Centralized Configuration:** All Yotpo-specific settings are managed by the merchant directly within the familiar Adobe Commerce Admin Panel UI.
- **Easy Integration:** Designed for quick and straightforward deployment as an App Builder application.
- **Adobe App Builder Powered:** Leveraging the power and scalability of Adobe App Builder for reliable performance and easy deployment.

---

## Requirements

Before installing this extension, ensure you have the following:

- **Adobe Commerce (Cloud, SaaS or On-Premise):** Version 2.4.x or higher.

- **Adobe Developer App Builder Project:** An active App Builder project configured for your Adobe Commerce instance's organization.

- **Yotpo Account:** A valid Yotpo account with an **App Key** and **Secret Key**.

- **Node.js and npm/yarn:** For local development and testing of the App Builder application.

- **Adobe I/O CLI:** For deploying App Builder actions.

- **Admin SDK Module:** The `magento/commerce-backend-sdk` module must be installed in your Adobe Commerce `composer.json`. Add the following line to your `composer.json` under the `require` section:

  ```json
  "magento/commerce-backend-sdk": "3.0.0 as 2.3.0"
  ```

  After adding, run `composer update`.

- **IMS Authentication:** Ensure IMS (Identity Management System) authentication is configured and working on your Adobe Commerce instance.

---

## Installation

You can install this extension by downloading it directly from the repository.

### Via Download

1.  **Download the Extension:** Get the latest release package from the [release page](https://github.com/BlueAcornInc/aio-commerce-yotpo/releases).

2.  **Extract the Files:** Unzip the downloaded package to your preferred development directory. This directory contains the Adobe App Builder project.

3.  **Configure App Builder Operational Environment Variables:** Before deploying, set the necessary environment variables for your App Builder actions as described in the [Environment Variables (App Builder Operational)](#environment-variables-app-builder-operational) section. You can do this by creating a `.env` file in the root of the extracted App Builder project.

4.  **Deploy App Builder Actions:**
    - Navigate to the root directory of the extracted App Builder project (where the `app.config.yaml` file is located).

    - Install npm dependencies using `npm install`

    - **(Optional) Set App Builder Context:** To avoid interactive prompts during deployment, you can explicitly set your project and workspace using `aio app use`:

      ```bash
      aio app use <your-project-id> <your-workspace-name>
      ```

      (Replace `<your-project-id>` and `<your-workspace-name>` with your actual values, which you can find in the Adobe Developer Console.)

      OR

      You can use the following combination to select your destination environment interactively:

      ```bash
      aio console org select
      aio console project select
      aio console workspace select
      aio app use --merge
      ```

    - Deploy the App Builder actions using the Adobe I/O CLI:

      ```bash
      aio app deploy
      ```

      If you didn't use `aio app use`, follow the prompts to select your App Builder project and workspace.

5.  **Configure Yotpo Settings in Adobe Commerce Backend:** After deploying the App Builder app, you **must** configure your Yotpo settings in your Adobe Commerce Admin panel as described in the [Configuration (Adobe Commerce Backend)](#configuration-adobe-commerce-backend) section.

---

## Configuration (Adobe Commerce Backend)

All Yotpo-specific configurations for this extension are managed by the merchant directly within the **Adobe Commerce Admin Panel**. The deployed Adobe App Builder application will then retrieve these settings at runtime.

1.  **Access Yotpo Configuration in Adobe Commerce:**
    - Log in to your Adobe Commerce Admin Panel.
    - Navigate to **Yotpo \> General Configuration** in the left-hand navigation menu.

2.  **Configure Yotpo Settings:** Fill in the following details using information provided by Yotpo:
    - **Enable Yotpo Extension:** Select `Yes` or `No` to activate or deactivate the integration.
    - **Yotpo App Key:** (Required) Your Yotpo App Key.
    - **Yotpo Secret Key:** (Required) Your Yotpo Secret Key.

3.  **Save Configuration:** Click "**Save Config**" to apply your changes in Adobe Commerce.

4.  **Verify Functionality:** After configuration, test your frontend integration to ensure the App Builder app is correctly retrieving and utilizing the Yotpo settings.

---

## Environment Variables (App Builder Operational)

These environment variables are crucial for the **operational functioning and security of the Adobe App Builder application itself**. These are **not** the Yotpo-specific settings for your store, which are configured in the Adobe Commerce Admin.

For **local development**, these are typically set in your `.env` file within your App Builder project. For **deployed environments via CI/CD**, these variables are configured directly within the Adobe Developer Console UI for your specific App Builder workspace/action.

- `ENCRYPTION_KEY`
  - **Description:** A 32-byte (64-character hexadecimal string) key used by the App Builder application for internal encryption operations.

  - **How to Generate:** You can generate a secure key using `openssl`:

    ```bash
    openssl rand -hex 32
    ```

- `ENCRYPTION_IV`
  - **Description:** A 16-byte (32-character hexadecimal string) Initialization Vector (IV) used in conjunction with the `ENCRYPTION_KEY` for encryption.

  - **How to Generate:** You can generate a secure IV using `openssl`:

    ```bash
    openssl rand -hex 16
    ```

**Important Notes:**

- **Security:** It's crucial to generate strong, unique values for `ENCRYPTION_KEY` and `ENCRYPTION_IV`.
- **Don't Commit `.env`:** If you're using a `.env` file for local development, **DO NOT commit it to your version control system (e.g., Git)**. Add `.env` to your `.gitignore` file.

---

## Usage

Once the App Builder application is deployed and its settings are configured in the Adobe Commerce backend, your Adobe Commerce frontend can consume the Yotpo configuration through the App Builder API endpoint.

**Adobe Commerce Storefont and Edge Delivery Services Blocks**

Refer to the EDS and Storefront Blocks Setup Instructions to set this up in Adobe Commerce Storefront and Edge Delivery Services:

[**`EDS.md`**](https://www.google.com/search?q=EDS.md)

**Example Frontend API Call (Conceptual):**

Your frontend application will make an AJAX or Fetch request to the App Builder endpoint exposed by this extension. The specific URL will be available in your Adobe Developer Console for the deployed action.

```javascript
// Example: Fetching Yotpo configuration from the App Builder API
const fetchYotpoConfig = async () => {
  try {
    // Replace with your actual deployed App Builder action URL
    const appBuilderApiUrl =
      "https://adobeio-static.net/api/v1/web/your_org_id/your_project_id/your_workspace_id/yotpo-config"; // Adjust endpoint name if needed

    const response = await fetch(appBuilderApiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const config = await response.json();
    console.log("Yotpo Configuration:", config);
    // Use config.appKey, config.secretKey, etc., as needed by the Yotpo frontend integration
  } catch (error) {
    console.error("Error fetching Yotpo configuration:", error);
  }
};

fetchYotpoConfig();
```

**Important Security Note:**

The App Builder action serves as a secure proxy. It retrieves configuration from your Adobe Commerce backend so that no sensitive credentials need to be stored or exposed on the client-side. The frontend should only receive the public-facing configuration necessary to initialize Yotpo services.

---

## Development

For detailed instructions on setting up your development environment, testing, and contributing to this App Builder extension, please refer to our dedicated development guide.

[**`DEVELOPMENT.md`**](DEVELOPMENT.md)

---

## Support

For any issues, questions, or feature requests, please refer to the following:

- **Issue Tracker:** [Github Issues](https://github.com/BlueAcornInc/aio-commerce-yotpo/issues)
- **Contact:** [apps@blueacornici.com](mailto:apps@blueacornici.com)

---

## Contributing

We welcome contributions\! If you'd like to contribute to this project, please follow these steps:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and ensure they adhere to our coding standards.
4.  Write clear and concise commit messages.
5.  Submit a pull request.
