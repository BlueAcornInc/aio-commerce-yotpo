const stateLib = require("@adobe/aio-lib-state");

// Import the MAX_TTL constant
const { MAX_TTL } = stateLib;

const { readFile, writeFile } = require("./libFileRepository");
const ConfigEncryptionHelper = require("./runtime/security/ConfigEncryptionHelper");

/**
 * Write the configuration to a file
 * @param {object} config Configuration to save to file
 * @param {string} name Filename suffix
 * @param {object} params App parameters
 */
async function writeConfiguration(config, name, params) {
  const { ENCRYPTION_KEY, ENCRYPTION_IV, RUNTIME_NAMESPACE } = params;

  // Convert the entire form submission to a JSON string
  const configString = JSON.stringify(config);

  const state = await stateLib.init();

  await state.put(`${name}Config`, configString, {
    ttl: MAX_TTL,
  });

  // Encrypt the stringified JSON
  const helper = new ConfigEncryptionHelper(ENCRYPTION_KEY, ENCRYPTION_IV);
  const encryptedConfig = helper.encryptConfig(configString);

  // Save to .enc file using aio-lib-files
  const filePath = `${RUNTIME_NAMESPACE}-${name}.enc`;
  await writeFile(filePath, Buffer.from(JSON.stringify(encryptedConfig)));
}

/**
 * Read the configuration from the file
 * @param {object} params App parameters
 * @param {string} name Filename suffix
 * @returns {object} Return the configuration
 */
async function readConfiguration(params, name) {
  const { ENCRYPTION_KEY, ENCRYPTION_IV, RUNTIME_NAMESPACE } = params;
  const state = await stateLib.init();

  let config = await state.get(`${name}Config`);

  if (!config) {
    // If the state read config is null/falsey, we try to read it from the file

    // Read the encrypted file as a buffer, let the exceptions bubble up
    const helper = new ConfigEncryptionHelper(ENCRYPTION_KEY, ENCRYPTION_IV);
    const filePath = `${RUNTIME_NAMESPACE}-${name}.enc`;
    const encryptedBuffer = await readFile(filePath);
    const encryptedConfig = JSON.parse(encryptedBuffer.toString("utf8"));

    // Decrypt the configuration
    config = helper.decryptConfig(encryptedConfig);

    // State the loaded configuration on the state
    await state.put(`${name}Config`, JSON.stringify(config), {
      ttl: MAX_TTL,
    });
  } else {
    return JSON.parse(config.value);
  }
}

exports.readConfiguration = readConfiguration;
exports.writeConfiguration = writeConfiguration;
