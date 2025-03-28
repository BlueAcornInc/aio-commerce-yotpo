/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0.
*/
const { Core } = require('@adobe/aio-sdk');

/**
 * Returns a JSON response with an error message
 */
function errorResponse(message, statusCode = 400) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            success: false,
            error: message
        })
    };
}

/**
 * Main function
 */
async function main(params) {
    const logger = Core.Logger('yotpo-config', { level: params.LOG_LEVEL || 'info' });

    try {
        logger.debug('Raw params:', params);

        // Only handle GET requests
        if (params.__ow_method !== 'get') {
            logger.warn('Unsupported HTTP method:', params.__ow_method);
            return errorResponse('Method Not Allowed. Only GET is supported.', 405);
        }

        // Fetch config from environment variables
        const yotpoApiKey = params.YOTPO_API_KEY || process.env.YOTPO_API_KEY;
        const enableReviewsSync = String(params.ENABLE_REVIEWS_SYNC || process.env.ENABLE_REVIEWS_SYNC).toLowerCase() === 'true';

        if (!yotpoApiKey) {
            logger.error('YOTPO_API_KEY is not set in environment variables.');
            return errorResponse('Yotpo API Key is not configured', 400);
        }

        const config = {
            appKey: yotpoApiKey,
            status: enableReviewsSync ? 'enabled' : 'disabled'
        };

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: true,
                message: 'Loaded Yotpo config from environment variables',
                config: {
                    appKey: '****' + yotpoApiKey.slice(-4), // Mask the key
                    status: config.status
                }
            })
        };
    } catch (error) {
        logger.error('Unexpected error:', error);
        return errorResponse('Server Error: ' + error.message, 500);
    }
}

exports.main = main;