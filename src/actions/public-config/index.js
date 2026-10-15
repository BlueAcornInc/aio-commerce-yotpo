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

const PUBLIC_FIELDS = [
  "status",
  "appKey",
  "instanceId",
  "showReviews",
  "showStarSummary",
  "showQna",
  "showInlineStars",
  "showCartStars",
  "trackConversions",
];
const STORE_CODE_PATTERN = /^[a-z0-9_]{1,64}$/;
const APP_KEY_PATTERN = /^[A-Za-z0-9]{8,64}$/;
const DEFAULT_STORE_CODE = "default";

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body,
});

/**
 * Read the public fields at one scope.
 *
 * @param {object} scope Scope selector from lib-config
 * @returns {Promise<object>} Field values by name
 */
async function readFields(scope) {
  const values = await Promise.all(
    PUBLIC_FIELDS.map(async (name) => {
      const { config } = await getConfigurationByKey(name, scope);
      return config?.value;
    }),
  );
  return Object.fromEntries(PUBLIC_FIELDS.map((name, i) => [name, values[i]]));
}

/**
 * Read a store view's configuration. A store view the scope tree doesn't
 * know yet (scopes sync when the app is installed, and new store views
 * appear after the next sync) falls back to the global scope.
 *
 * @param {string} storeCode Store view code
 * @returns {Promise<object>} Field values by name
 */
async function readConfig(storeCode) {
  const scopes = [
    byCodeAndLevel(storeCode, "store_view"),
    byCodeAndLevel("global", "global"),
  ];
  for (const scope of scopes) {
    try {
      return await readFields(scope);
    } catch (error) {
      if (!/^INVALID_SCOPE/.test(error.message)) {
        throw error;
      }
    }
  }
  // No scope tree yet: the app hasn't been installed and configured.
  return {};
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

    const config = await readConfig(storeCode);

    if (config.status !== "on" || !config.appKey) {
      return json(200, { status: "off" });
    }
    if (!APP_KEY_PATTERN.test(config.appKey)) {
      // A stray character (a pasted trailing period, say) breaks every widget.
      logger.warn(
        "Configured app key has unexpected characters; reporting off.",
      );
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
