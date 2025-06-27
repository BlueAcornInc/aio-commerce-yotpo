// libFileRepository.js
// https://github.com/adobe/amazon-sales-channel-app-builder/blob/main/actions-src/shared/repository/libFilesRepository.ts
// eslint-disable-next-line node/no-extraneous-require
const filesLib = require("@adobe/aio-lib-files");

/**
 * Write content to a file
 *
 * @param {string} filePath Output file path
 * @param {string|Buffer} data Content to write
 */
async function writeFile(filePath, data) {
  const files = await filesLib.init();
  await files.write(filePath, data, {
    contentType: "application/octet-stream",
  });
}

/**
 * Read the content of a file
 *
 * @param {string} filePath Input file path
 * @returns {Promise<Buffer>} File content
 */
async function readFile(filePath) {
  const files = await filesLib.init();
  const fileBuffer = await files.read(filePath);
  return fileBuffer;
}

module.exports = { writeFile, readFile };
