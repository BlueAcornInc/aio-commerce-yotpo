// ConfigEncryptionHelper.js
// https://github.com/adobe/amazon-sales-channel-app-builder/blob/main/actions-src/shared/security/credentialsEncryptionHelper.ts
const { encrypt, decrypt } = require("./encrypt");

class ConfigEncryptionHelper {
  constructor(encryptionKey, ivKey) {
    this.encryptionKey = encryptionKey;
    this.ivKey = ivKey;
  }

  /**
   * Accepts a string (already JSON.stringify-ed form body) and returns encrypted payload
   * @param {string} stringifiedConfig Input to encrypt
   * @returns {object} Encrypted configuration
   */
  encryptConfig(stringifiedConfig) {
    return encrypt(stringifiedConfig, this.encryptionKey, this.ivKey);
  }

  /**
   * Accepts an encrypted payload, decrypts it to a string, and returns parsed JSON
   * @param {string} encryptedPayload Input to decrypt
   * @returns {object} Decrypted configuration
   */
  decryptConfig(encryptedPayload) {
    const decryptedString = decrypt(
      encryptedPayload.encryptedData,
      this.encryptionKey,
      this.ivKey,
      encryptedPayload.tag,
    );

    // Return parsed JSON object
    return JSON.parse(decryptedString);
  }
}

module.exports = ConfigEncryptionHelper;
