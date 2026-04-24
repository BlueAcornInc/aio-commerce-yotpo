/**
 * postinstall.js
 *
 * Runs when a consuming repo (e.g. shop) adds @blueacorninc/storefront-yotpo
 * as a dependency. Walks up from node_modules/@blueacorninc/storefront-yotpo/
 * to find the consuming repo's blocks/ directory, then copies every
 * subdirectory of THIS package (yotpo/, yotpo-stars/) into that blocks/.
 *
 * Deliberately refuses to overwrite existing blocks so customizations
 * aren't silently clobbered — operators delete the target first, then
 * re-install, to get the latest.
 *
 * Mirrors the pattern used by @blueacorninc/storefront-storelocator.
 */

const fs = require("fs");
const path = require("path");

function copyDirectorySync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectorySync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function findBlocksDirectory() {
  let currentDir = process.cwd();
  const startDir = currentDir;

  // Walk up the directory tree to find a blocks directory
  while (currentDir !== path.dirname(currentDir)) {
    const blocksPath = path.join(currentDir, "blocks");

    if (fs.existsSync(blocksPath) && fs.statSync(blocksPath).isDirectory()) {
      // Don't install into ourselves (running during the source repo's own dev)
      if (currentDir !== startDir && currentDir !== __dirname) {
        return currentDir;
      }
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
}

function installBlocks() {
  console.log("Installing Yotpo blocks...");

  const packageDir = __dirname;
  const projectRoot = findBlocksDirectory();

  if (!projectRoot) {
    console.error("Error: Could not find a blocks/ directory in the project");
    console.error(
      "Please ensure you are installing this package in a project that has a blocks/ directory"
    );
    process.exit(1);
  }

  const sourceBlocksDir = packageDir;
  const targetBlocksDir = path.join(projectRoot, "blocks");

  if (path.resolve(sourceBlocksDir) === path.resolve(targetBlocksDir)) {
    console.log("✓ Already installed in correct location. No action needed.");
    return;
  }

  const relativePath = path.relative(sourceBlocksDir, targetBlocksDir);
  if (!relativePath.startsWith("..")) {
    console.error("Error: Cannot install into a subdirectory of the package");
    process.exit(1);
  }

  try {
    if (!fs.existsSync(targetBlocksDir)) {
      fs.mkdirSync(targetBlocksDir, { recursive: true });
      console.log(`Created blocks directory: ${targetBlocksDir}`);
    }

    const entries = fs.readdirSync(sourceBlocksDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== "node_modules") {
        const sourcePath = path.join(sourceBlocksDir, entry.name);
        const targetPath = path.join(targetBlocksDir, entry.name);

        if (fs.existsSync(targetPath)) {
          console.log(
            `Warning: Block '${entry.name}' already exists. Skipping...`
          );
          console.log(
            `If you want to update, please remove the existing block first.`
          );
          continue;
        }

        copyDirectorySync(sourcePath, targetPath);
        console.log(`✓ Installed block: ${entry.name}`);
      }
    }

    console.log("Yotpo blocks installation completed successfully!");
    console.log(`Blocks installed to: ${targetBlocksDir}`);
  } catch (error) {
    console.error("Error during installation:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  installBlocks();
}

module.exports = { installBlocks, copyDirectorySync, findBlocksDirectory };
