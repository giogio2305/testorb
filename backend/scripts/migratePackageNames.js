const mongoose = require('mongoose');
const Application = require('../models/Application');
const { extractPackageName } = require('../utils/fileUtils');
const path = require('path');

async function migrate() {
  await mongoose.connect('mongodb+srv://georgesmbakop:Kxvz2qtm04yCfKnt@cluster0.lz5od.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
  const apps = await Application.find({ packageName: { $exists: false } });
  for (const app of apps) {
    try {
      // Always resolve to backend/uploads/<filename>
      const apkFilename = path.basename(app.filePath);
      const correctedFilePath = path.join(__dirname, '..', 'uploads', apkFilename);
      const pkg = await extractPackageName(correctedFilePath);
      app.packageName = pkg;
      await app.save();
      console.log(`Updated ${app.name} with package: ${pkg}`);
    } catch (e) {
      console.error(`Failed to extract for ${app.name}:`, e.message);
    }
  }
  mongoose.disconnect();
}
migrate();