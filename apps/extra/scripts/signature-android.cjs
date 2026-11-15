// Après « expo prebuild », la version release d'Android est signée avec la clé de debug.
// Codemagic fournit la clé de l'app (CM_KEYSTORE_PATH, CM_KEYSTORE_PASSWORD, CM_KEY_ALIAS,
// CM_KEY_PASSWORD) : on la branche sur la compilation release. Usage : node scripts/signature-android.cjs
const fs = require('node:fs');
const path = require('node:path');

const fichier = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
let gradle = fs.readFileSync(fichier, 'utf8');
if (!gradle.includes('signingConfigs.kivien')) {
  gradle = gradle.replace(
    /signingConfigs\s*\{/,
    `signingConfigs {
        kivien {
            storeFile file(System.getenv("CM_KEYSTORE_PATH"))
            storePassword System.getenv("CM_KEYSTORE_PASSWORD")
            keyAlias System.getenv("CM_KEY_ALIAS")
            keyPassword System.getenv("CM_KEY_PASSWORD")
        }`,
  );
  // Seule la configuration release change : la debug reste signée avec la clé de debug.
  gradle = gradle.replace(/(release\s*\{[^}]*?)signingConfig\s+signingConfigs\.debug/, '$1signingConfig signingConfigs.kivien');
  if (!gradle.includes('signingConfig signingConfigs.kivien')) throw new Error('build.gradle : configuration release introuvable');
  fs.writeFileSync(fichier, gradle);
}
console.log('Signature Android : clé de l’app branchée sur la compilation release.');
