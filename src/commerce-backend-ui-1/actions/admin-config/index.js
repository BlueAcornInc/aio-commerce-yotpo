const { Core } = require("@adobe/aio-sdk");
const {
  readConfiguration,
  writeConfiguration,
} = require("../../../shared/configurationHelper");

const REQUIRED_FIELDS = ["appKey", "status", "instanceId"];

/**
 * The fields the admin UI may see. The API secret is write-only: it is never
 * returned, only reported as present or absent.
 *
 * @param {object} config Stored configuration
 * @returns {object} Configuration safe to return to the browser
 */
function toPublicConfig(config = {}) {
  return {
    appKey: config.appKey,
    status: config.status,
    instanceId: config.instanceId,
    hasApiSecret: Boolean(config.apiSecret),
  };
}

/**
 * Read the stored API secret, if any, so a save without a new secret keeps it.
 *
 * @param {object} params Action params
 * @param {string} name Configuration name
 * @returns {Promise<string|undefined>} The stored secret, or undefined
 */
async function readStoredApiSecret(params, name) {
  try {
    const existing = await readConfiguration(params, name);
    return existing?.apiSecret;
  } catch {
    return undefined;
  }
}

/**
 * Main admin action
 *
 * @param {object} params Action input param
 * @returns {object} Response object
 */
async function main(params) {
  const logger = Core.Logger("yotpo-config", { level: "info" });
  const name = "yotpo";

  // Check the method
  if (params.__ow_method === "post") {
    const payload = params.payload || {};
    const missing = REQUIRED_FIELDS.filter((field) => !payload[field]);

    if (missing.length > 0) {
      // Field names only: params carries credentials and is never logged.
      logger.warn(`Missing required fields: ${missing.join(", ")}`);
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: `Missing required fields (${missing.join(", ")}).`,
        }),
      };
    }

    const { appKey, status, instanceId } = payload;
    // Write-only secret: a blank value keeps the stored one.
    const apiSecret =
      payload.apiSecret || (await readStoredApiSecret(params, name));

    const configToStore = {
      appKey,
      status,
      instanceId,
      ...(apiSecret ? { apiSecret } : {}),
    };

    try {
      await writeConfiguration(configToStore, name, params);

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: true,
          message: "Saved Yotpo config",
          savedConfig: toPublicConfig(configToStore),
        }),
      };
    } catch (error) {
      logger.error(error);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          message: "Error while saving configuration",
        }),
      };
    }
  } else if (params.__ow_method === "get") {
    try {
      const loadedConfig = await readConfiguration(params, name);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: true,
          message: "Loaded Yotpo config",
          config: toPublicConfig(loadedConfig),
        }),
      };
    } catch (error) {
      logger.error(error);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          message: "Error while loading configuration",
        }),
      };
    }
  } else {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Method Not Allowed",
        allowedMethods: ["GET", "POST"],
      }),
    };
  }
}

exports.main = main;
