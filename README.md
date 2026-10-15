# Yotpo by Blue Acorn

This Adobe App Builder extension provides a secure and efficient way for Adobe Commerce merchants to store and consume their Yotpo credentials. All configurations, including sensitive credentials, are managed directly within the Adobe lib-state backend and stored securely encrypted on lib-file backend for persistence. The App Builder application securely retrieves these settings and makes them available to your storefront via API, enabling the display of user-generated content and integration with Yotpo services.

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

- **Yotpo Account:** A valid Yotpo account and its **App Key** (store ID).

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

5.  **Configure Yotpo in App Management:** after deploying, install and configure the app as described in [Configuration (App Management)](#configuration-app-management).

---

## Configuration (App Management)

Since v2.0.0, Yotpo is configured through **Adobe Commerce App Management**, not a custom admin page.

1.  **Install the app:** in Commerce Admin, go to **Apps > App Management** and install Yotpo into your instance.
2.  **Configure it:** open the app's configuration in App Management and set, at the scope you need:
    - **Status:** `On` to enable the storefront widgets.
    - **App Key:** your Yotpo store ID, from Yotpo > Settings > Store. It's public by design: the storefront uses it to load Yotpo.
    - **Widget Instance ID** (optional): the star ratings widget instance. The reviews and Q&A widgets are found automatically.
3.  **Scopes:** values follow the Commerce hierarchy (global > website > store > store view) and are inherited downwards. For several brands, set each brand's App Key on its own website or store view.

The app stores **no secrets**, so it needs no encryption key.

### Upgrading from v1.x

v1 stored its settings in a custom admin page that App Management doesn't read. After upgrading, open the app in App Management and re-enter the **App Key** and **Status** (and the instance ID, if you used one). The v1 "Secret Key" is no longer used and can be discarded.

---

## Usage

Once the App Builder application is deployed and configured in App Management, your Adobe Commerce frontend can consume the Yotpo configuration through the App Builder API endpoint.

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
      "https://adobeio-static.net/api/v1/web/your_org_id/your_project_id/your_workspace_id/yotpo/public-config"; // Adjust endpoint name if needed

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

We welcome contributions! If you'd like to contribute to this project, please follow these steps:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and ensure they adhere to our coding standards.
4.  Write clear and concise commit messages.
5.  Submit a pull request.
