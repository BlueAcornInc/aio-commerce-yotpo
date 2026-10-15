/*
 * Copyright 2024 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/**
 * App Management configuration for Yotpo.
 *
 * Merchants configure these values in Commerce Admin (Apps > App Management),
 * per website, store or store view. A brand is a store view: values set at a
 * higher scope are inherited.
 *
 * Every field here is public: the storefront needs the app key to load the
 * Yotpo widgets. The app stores no secrets.
 *
 * @see https://developer.adobe.com/commerce/extensibility/app-management/
 */
const { defineConfig } = require("@adobe/aio-commerce-lib-app/config");

module.exports = defineConfig({
  metadata: {
    id: "yotpo",
    displayName: "Yotpo",
    description:
      "Yotpo reviews, star ratings and Q&A for Adobe Commerce storefronts on Edge Delivery Services",
    version: "2.0.0",
  },
  businessConfig: {
    schema: [
      {
        name: "status",
        type: "list",
        label: "Status",
        description: "Turn the Yotpo storefront widgets on or off",
        selectionMode: "single",
        options: [
          { label: "On", value: "on" },
          { label: "Off", value: "off" },
        ],
        default: "off",
      },
      {
        name: "appKey",
        type: "text",
        label: "App Key",
        description:
          "Your Yotpo store ID (app key), from Yotpo > Settings > Store. Public by design.",
        requiredIf: { field: "status", value: "on" },
      },
      {
        name: "instanceId",
        type: "text",
        label: "Widget Instance ID",
        description:
          "Optional. The Yotpo star ratings widget instance ID. The reviews and Q&A widgets are found automatically.",
      },
    ],
  },
});
