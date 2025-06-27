# Yotpo for Adobe Commerce (App Builder Extension)

This Adobe App Builder extension provides a secure and efficient way for Adobe Commerce merchants to store and consume their Yotpo credentials. All configurations, including sensitive credentials, are managed directly within the Adobe Commerce Admin backend. The App Builder application securely retrieves these settings and makes them available to your storefront via API, enabling the display of user-generated content and integration with Yotpo services.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
  - [Downloading the latest release](#downloading-the-latest-release)
- [Configuration (Adobe Commerce Backend)](#configuration-adobe-commerce-backend)
- [Environment Variables (App Builder Operational)](#environment-variables-app-builder-operational)
- [Usage](#usage)
- [Development](#development)
- [Support](#support)
- [Contributing](#contributing)

---

## Features

- **Secure Credential Storage:** Yotpo credentials are stored securely within your Adobe Commerce backend, which the App Builder application can then securely retrieve at runtime.
- **Frontend API Access:** The App Builder application exposes a secure API endpoint for your frontend to retrieve necessary Yotpo credentials and configuration, enabling direct interaction with Yotpo services (e.g., displaying reviews, submitting content).
- **Centralized Configuration:** All Yotpo-specific settings are managed by the merchant directly within the familiar Adobe Commerce Admin Panel UI.
- **Easy Integration:** Designed for quick and straightforward deployment as an App Builder application.
- **Adobe App Builder Powered:** Leveraging the power and scalability of Adobe App Builder for reliable performance and easy deployment.
- **Marketplace Ready:** Compatible with Adobe Exchange for effortless installation and updates.

---

## Requirements

Before installing this extension, ensure you have the following:

- **Adobe Commerce (Cloud, SaaS or On-Premise):** Version 2.4.x or higher.

- **Adobe Developer App Builder Project:** An active App Builder project configured for your Adobe Commerce instance's organization.

- **Yotpo Account:** A valid Yotpo account with API access credentials (App Key and Secret Key).

- **Node.js and npm/yarn:** For local development and testing of the App Builder application.

- **Adobe I/O CLI:** For deploying App Builder actions.

- **Admin SDK Module:** The `magento/commerce-backend-sdk` module must be installed in your Adobe Commerce `composer.json`. Add the following line to your `composer.json` under the `require` section:

  ```json
  "magento/commerce-backend-sdk": "3.0.0"
  ```

  After adding, run `composer update`.

- **IMS Authentication:** Ensure IMS (Identity Management System) authentication is configured and working on your Adobe Commerce instance, as this is typically used for secure API communication with Adobe services, including App Builder actions.

---

## Installation

You can install this extension by downloading it directly from the repository.

### Downloading the latest release

1.  **Download the Extension:** Get the latest release package from the release page/repository URL here.

2.  **Extract the Files:** Unzip the downloaded package to your preferred development directory. This directory contains the Adobe App Builder project.

3.  **Configure App Builder Operational Environment Variables:** Before deploying, set the necessary environment variables for your App Builder actions as described in the [Environment Variables (App Builder Operational)](#environment-variables-app-builder-operational) section. These are critical for the App Builder app's ability to communicate with Adobe Commerce and perform internal encryption. You can do this by creating a `.env` file in the root of the extracted App Builder project.

4.  **Deploy App Builder Actions:**
    - Navigate to the root directory of the extracted App Builder project (where the `app.json` or `manifest.yml` file is located).

    - **(Optional) Set App Builder Context:** To avoid interactive prompts during deployment, you can explicitly set your project and workspace using `aio app use`:

      ```bash
      aio app use <your-project-id> <your-workspace-name>
      ```

      (Replace `<your-project-id>` and `<your-workspace-name>` with your actual values, which you can find in the Adobe Developer Console.)

    - Deploy the App Builder actions using the Adobe I/O CLI:

      ```bash
      aio app deploy
      ```

      If you didn't use `aio app use`, follow the prompts to select your App Builder project and workspace.

5.  **Configure Yotpo Settings in Adobe Commerce Backend:** After deploying the App Builder app, you **must** configure your Yotpo settings in your Adobe Commerce Admin panel as described in the [Configuration (Adobe Commerce Backend)](#configuration-adobe-commerce-backend) section.

---

## Configuration (Adobe Commerce Backend)

All Yotpo-specific configurations for this extension are managed by the merchant directly within the **Adobe Commerce Admin Panel**. The deployed Adobe App Builder application will then retrieve these settings at runtime via secure API calls to your Adobe Commerce instance.

1.  **Access Yotpo Configuration in Adobe Commerce:**
    - Log in to your Adobe Commerce Admin Panel.
    - Navigate to **Yotpo \> General Settings** in the left-hand navigation menu.
2.  **Configure Yotpo Settings:** Fill in the following details using information provided by Yotpo:
    - **Enable/Disable Yotpo Extension:** Select Yes or No to activate or deactivate the integration's functionality.
    - **Yotpo App Key:** Your Yotpo App Key (sometimes called API Key or Client ID).
    - **Yotpo Secret Key:** Your Yotpo Secret Key (sometimes called API Secret or Client Secret).
      _(Add any other Yotpo-specific configurations your extension supports, e.g., enabling specific widgets, order sync settings, etc.)_
3.  **Save Configuration:** Click "**Save Config**" to apply your changes in Adobe Commerce.
4.  **Verify Functionality:** After configuration, test your frontend integration to ensure the App Builder app is correctly retrieving and utilizing the Yotpo settings.

---

## Environment Variables (App Builder Operational)

These environment variables are crucial for the **operational functioning and security of the Adobe App Builder application itself**. They allow the App Builder to connect to your Adobe Commerce instance and perform internal data protection. These are **not** the Yotpo-specific settings for your store, which are configured in the Adobe Commerce Admin.

For **local development**, these are typically set in your `.env` file within your App Builder project. For **deployed environments (e.g., via Adobe Exchange Marketplace or CI/CD)**, these variables are configured directly within the Adobe Developer Console UI for your specific App Builder workspace/action, or provided via marketplace prompts during installation.

- `ENCRYPTION_KEY`
  - **Description:** A 32-byte (64-character hexadecimal string) key used by the App Builder application for internal encryption operations, such as protecting sensitive configuration data retrieved from Adobe Commerce before processing or transmitting to the frontend.

  - **How to Generate:** You can generate a secure key using `openssl`:

    ```bash
    openssl rand -hex 32
    ```

  - **Example `.env` entry:**

    ```
    ENCRYPTION_KEY=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
    ```

- `ENCRYPTION_IV`
  - **Description:** A 16-byte (32-character hexadecimal string) Initialization Vector (IV) used in conjunction with the `ENCRYPTION_KEY` for encryption.

  - **How to Generate:** You can generate a secure IV using `openssl`:

    ```bash
    openssl rand -hex 16
    ```

  - **Example `.env` entry:**

    ```
    ENCRYPTION_IV=f1e2d3c4b5a69876543210fedcba9876
    ```

**Important Notes:**

- **Security:** It's crucial to generate strong, unique values for `ENCRYPTION_KEY`, `ENCRYPTION_IV`. Don't use example values in production environments.
- **Don't Commit `.env`:** If you're using a `.env` file for local development, **DO NOT commit it to your version control system (e.g., Git)**. Add `.env` to your `.gitignore` file to prevent accidental exposure of sensitive information.

---

## Usage

Once the App Builder application is deployed and its settings are configured in the Adobe Commerce backend, your Adobe Commerce frontend (or any other client-side application) can consume the Yotpo configuration and credentials through the App Builder API endpoint.

**Adobe Commerce Storefront and Edge Delivery Services Blocks**

Refer to the EDS and Storefront Blocks Setup Instructions to set this up in Adobe Commerce Storefront and Edge Delivery Services:

[**`EDS.md`**](EDS.md)

**Example Frontend API Call (Conceptual):**

Your frontend application will make an AJAX or Fetch request to the App Builder endpoint exposed by this extension. The specific URL will be available in your Adobe Developer Console for the deployed action.

```javascript
// Example: Fetching Yotpo configuration from the App Builder API
const fetchYotpoConfig = async () => {
  try {
    // Replace with your actual deployed App Builder action URL
    const appBuilderApiUrl =
      "https://adobeio-static.net/api/v1/web/{YOUR_ORG_ID_TOKEN}/{YOUR_PROJECT_ID_TOKEN}/{YOUR_WORKSPACE_NAME_TOKEN}/get-yotpo-config"; // Adjust endpoint name if needed

    const response = await fetch(appBuilderApiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const config = await response.json();
    console.log("Yotpo Configuration:", config);
    // Use config.appKey, config.secretKey, etc., as provided by the API
  } catch (error) {
    console.error("Error fetching Yotpo configuration:", error);
  }
};

fetchYotpoConfig();
```

**Important Security Note:**

The App Builder action serves as a secure intermediary. While it retrieves sensitive data like API keys from your Adobe Commerce backend, it's critical that your frontend consumption strategy does not expose these raw credentials directly on the client-side if they're intended for server-to-server operations. Instead, the App Builder action should ideally use these credentials internally to make direct server-side API calls to Yotpo, or only pass securely derived, non-sensitive data to the frontend (e.g., a hashed version for client-side widget initialization if Yotpo supports it).

---

## Development

For detailed instructions on setting up your development environment, testing, and contributing to this App Builder extension, please refer to our dedicated development guide.

[**`DEVELOPMENT.md`**](DEVELOPMENT.md)

---

## Support

For any issues, questions, or feature requests, please refer to the following:

- **Documentation:** [Link to your detailed documentation (if available)]
- **Issue Tracker:** [Link to your GitHub Issues or similar platform]
- **Contact:** [Your support email or contact method]

---

## Contributing

We welcome contributions\! If you'd like to contribute to this project, please follow these steps:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and ensure they adhere to our coding standards.
4.  Write clear and concise commit messages.
5.  Submit a pull request.

---
