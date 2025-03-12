const { Core } = require("@adobe/aio-sdk");
const stateLib = require("@adobe/aio-lib-state");
const { MAX_TTL } = stateLib;

async function main(params) {
    const logger = Core.Logger("yotpo-config", { level: "info" });

    if (params.__ow_method === "post") {
        const { appKey, apiSecret, status } = params;

        if (!appKey || !apiSecret || !status) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    error: "Missing required fields (appKey, apiSecret, status).",
                    receivedParams: params,
                }),
            };
        }

        const configToStore = { appKey, apiSecret, status };
        const state = await stateLib.init();
        await state.put("yotpoConfig", JSON.stringify(configToStore), {
            ttl: MAX_TTL,
        });

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                success: true,
                message: "Saved Yotpo config with max TTL",
                savedConfig: configToStore,
            }),
        };
    } else if (params.__ow_method === "get") {
        const state = await stateLib.init();
        const entry = await state.get("yotpoConfig");
        let loadedConfig = {};
        if (entry && entry.value) {
            try {
                loadedConfig = JSON.parse(entry.value);
            } catch (e) {
                logger.warn("Failed to parse stored JSON", e);
                loadedConfig = {};
            }
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                success: true,
                message: "Loaded Yotpo config",
                config: loadedConfig,
            }),
        };
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