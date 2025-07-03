const ApkReader = require('node-apk-parser');
const fs = require('fs');

async function extractPackageName(apkPath) {
  try {
    const reader = ApkReader.readFile(apkPath);
    const manifest = reader.readManifestSync();
    return manifest.package;
  } catch (error) {
    throw new Error(`Failed to parse APK: ${error.message}`);
  }
}

module.exports = { extractPackageName };