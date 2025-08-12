const { Core } = require('@adobe/aio-sdk');
const logger = Core.Logger('getConfig', { level: 'info' });
const { readConfiguration } = require('../../../shared/configurationHelper');

/**
 *
 * @param {object} params Action parameter
 * @returns {object} Response object
 */
async function main(params) {
  try {
    const config = await readConfiguration(params, 'yotpo');

    const body = {
      appKey: config.appKey,
      status: config.status,
      instanceId: config.instanceId,
    };

    // Log and return the decrypted configuration
    logger.info('Configuration retrieved successfully.');
    return {
      statusCode: 200,
      body,
    };
  } catch (error) {
    if (error.code === 'ERROR_FILE_NOT_EXISTS' || error.code === 'ENOENT') {
      logger.info('No configuration file found, returning empty config.');
      return {
        statusCode: 200,
        body: {},
      };
    }
    logger.error('Unable to load configuration', error);
    return {
      statusCode: 500,
      body: { error: 'Failed to retrieve and decrypt configuration.' },
    };
  }
}

exports.main = main;
