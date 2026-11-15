// Configuration de l'app : app.json, complété au moment de la compilation (Codemagic) par
// - le numéro de build (BUILD_NUMBER, fourni par Codemagic) pour l'App Store et Google Play ;
// - l'identifiant du projet Expo (EXPO_PROJECT_ID), nécessaire aux notifications sur le téléphone ;
// - le fichier Firebase d'Android (google-services.json), écrit par Codemagic s'il est fourni.
const fs = require('node:fs');
const path = require('node:path');

module.exports = ({ config }) => {
  const build = process.env.BUILD_NUMBER;
  const projectId = process.env.EXPO_PROJECT_ID || config.extra?.eas?.projectId;
  const firebase = path.join(__dirname, 'google-services.json');
  return {
    ...config,
    ios: { ...config.ios, ...(build ? { buildNumber: String(build) } : {}) },
    android: {
      ...config.android,
      ...(build ? { versionCode: Number(build) } : {}),
      ...(fs.existsSync(firebase) ? { googleServicesFile: './google-services.json' } : {}),
    },
    extra: { ...config.extra, ...(projectId ? { eas: { projectId } } : {}) },
  };
};
