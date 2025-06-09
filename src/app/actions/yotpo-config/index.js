const { Core } = require('@adobe/aio-sdk')
const stateLib = require('@adobe/aio-lib-state')
const ConfigEncryptionHelper = require('../../../shared/runtime/security/ConfigEncryptionHelper')
const { readFile, writeFile } = require('../../../shared/libFileRepository')
const { MAX_TTL } = stateLib

/**
 * Write the configuration to a file
 * @param {object} config Configuration to save to file
 * @param {object} params App parameters
 */
async function writeConfiguration (config, params) {
  const { ENCRYPTION_KEY, ENCRYPTION_IV, RUNTIME_NAMESPACE } = params

  // Convert the entire form submission to a JSON string
  const configString = JSON.stringify(config)

  // Encrypt the stringified JSON
  const helper = new ConfigEncryptionHelper(ENCRYPTION_KEY, ENCRYPTION_IV)
  const encryptedConfig = helper.encryptConfig(configString)

  // Save to .enc file using aio-lib-files
  const filePath = `${RUNTIME_NAMESPACE}-bazaarvoice.enc`
  await writeFile(filePath, Buffer.from(JSON.stringify(encryptedConfig)))
}

/**
 * Read the configuration from the file
 * @param {object} params App parameters
 * @returns {object} Return the configuration
 */
async function readConfiguration (params) {
  const { ENCRYPTION_KEY, ENCRYPTION_IV, RUNTIME_NAMESPACE } = params

  const helper = new ConfigEncryptionHelper(ENCRYPTION_KEY, ENCRYPTION_IV)
  const filePath = `${RUNTIME_NAMESPACE}-bazaarvoice.enc`

  try {
    // Read the encrypted file as a buffer
    const encryptedBuffer = await readFile(filePath)
    const encryptedConfig = JSON.parse(encryptedBuffer.toString('utf8'))

    // Decrypt the configuration
    const config = helper.decryptConfig(encryptedConfig)
    return config
  } catch (error) {
    return {}
  }
}

/**
 * Main entry point
 * @param {object} params App parameters
 * @returns {object} Reponse
 */
async function main (params) {
  const logger = Core.Logger('yotpo-config', { level: 'info' })
  const { ENCRYPTION_KEY, ENCRYPTION_IV, RUNTIME_NAMESPACE } = params

  if (params.__ow_method === 'post') {
    const { appKey, apiSecret, status } = params

    if (!appKey || !apiSecret || !status) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Missing required fields (appKey, apiSecret, status).',
          receivedParams: params
        })
      }
    }

    const configToStore = { appKey, apiSecret, status }
    const state = await stateLib.init()
    await state.put('yotpoConfig', JSON.stringify(configToStore), {
      ttl: MAX_TTL
    })

    await writeConfiguration(configToStore, {
      ENCRYPTION_KEY,
      ENCRYPTION_IV,
      RUNTIME_NAMESPACE
    })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Saved Yotpo config with max TTL',
        savedConfig: configToStore
      })
    }
  } else if (params.__ow_method === 'get') {
    const state = await stateLib.init()
    const entry = await state.get('yotpoConfig')
    let loadedConfig = {}
    if (entry && entry.value) {
      try {
        loadedConfig = JSON.parse(entry.value)
      } catch (e) {
        logger.warn('Failed to parse stored JSON', e)
        loadedConfig = {}
      }
    } else {
      loadedConfig = await readConfiguration(params)
      await state.put('yotpoConfig', JSON.stringify(loadedConfig), {
        ttl: MAX_TTL
      })
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Loaded Yotpo config',
        config: loadedConfig
      })
    }
  } else {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Method Not Allowed',
        allowedMethods: ['GET', 'POST']
      })
    }
  }
}

exports.main = main
