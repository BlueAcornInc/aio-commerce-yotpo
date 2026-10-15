/*
 * Public storefront configuration for the Yotpo blocks.
 *
 * Unauthenticated by design (require-adobe-auth: false): the storefront calls it
 * to learn which Yotpo store to load. It returns only public fields, read from
 * App Management business configuration for the requested store view. Values
 * set at a higher scope (store, website, global) are inherited.
 */
const { Core } = require("@adobe/aio-sdk");
const {
  initialize,
  getConfigurationByKey,
  byCodeAndLevel,
} = require("@adobe/aio-commerce-lib-config");
const schema = require("../../commerce-configuration-1/.generated/configuration-schema.json");

const PUBLIC_FIELDS = ["status", "appKey", "instanceId"];
const STORE_CODE_PATTERN = /^[a-z0-9_]{1,64}$/;
const DEFAULT_STORE_CODE = "default";

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body,
});

/**
 * Read one public field for a store view.
 *
 * @param {string} name Field name
 * @param {string} storeCode Store view code
 * @returns {Promise<string|undefined>} The resolved value
 */
async function readField(name, storeCode) {
  const { config } = await getConfigurationByKey(
    name,
    byCodeAndLevel(storeCode, "store_view"),
  );
  return config?.value;
}

/**
 * @param {object} params Action params
 * @returns {Promise<object>} Response
 */
async function main(params) {
  const logger = Core.Logger("yotpo-public-config", {
    level: params.LOG_LEVEL || "info",
  });

  const storeCode = params.storeCode || DEFAULT_STORE_CODE;
  if (!STORE_CODE_PATTERN.test(storeCode)) {
    return json(400, { error: "Invalid storeCode." });
  }

  try {
    await initialize({ schema });

    const values = await Promise.all(
      PUBLIC_FIELDS.map((name) => readField(name, storeCode)),
    );
    const config = Object.fromEntries(
      PUBLIC_FIELDS.map((name, i) => [name, values[i]]),
    );

    if (config.status !== "on" || !config.appKey) {
      return json(200, { status: "off" });
    }
    return json(200, config);
  } catch (error) {
    // Log the message only; never the params, which carry runtime credentials.
    logger.error(`Unable to read configuration: ${error.message}`);
    return json(500, { error: "Failed to retrieve configuration." });
  }
}

exports.main = main;
