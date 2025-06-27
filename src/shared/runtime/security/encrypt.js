// encrypt.js
const crypto = require("crypto");

const algorithm = "aes-256-gcm";

/**
 *
 * @param {string} text Input text
 * @param {string} key Encryption key
 * @param {string} iv Encryption vector
 * @returns {object} Encrypted object
 */
function encrypt(text, key, iv) {
  const cipher = crypto.createCipheriv(
    algorithm,
    Buffer.from(key, "hex"),
    Buffer.from(iv, "hex"),
  );
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return { encryptedData: encrypted, tag };
}

/**
 *
 * @param {string} encryptedData Encrypted input
 * @param {string} key Encryption key
 * @param {string} iv Encryption vector
 * @param {string} tag Encryption tag
 * @returns {string} Decrypted content
 */
function decrypt(encryptedData, key, iv, tag) {
  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(key, "hex"),
    Buffer.from(iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

module.exports = { encrypt, decrypt };
