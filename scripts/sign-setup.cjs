const fs = require('fs');
const path = require('path');

// 1. Copiar o release.p12 para android/app/release.p12
const srcKeystore = path.join(__dirname, '../release.p12');
const destKeystore = path.join(__dirname, '../android/app/release.p12');

if (fs.existsSync(srcKeystore)) {
  fs.copyFileSync(srcKeystore, destKeystore);
  console.log('Keystore copiada para android/app/release.p12');
} else {
  console.error('Erro: release.p12 não encontrado na raiz!');
  process.exit(1);
}

// 2. Modificar o android/app/build.gradle
const gradlePath = path.join(__dirname, '../android/app/build.gradle');
if (fs.existsSync(gradlePath)) {
  let content = fs.readFileSync(gradlePath, 'utf8');

  // Adicionar signingConfigs dentro de android {
  const signingConfigsStr = `
    signingConfigs {
        release {
            storeFile file('release.p12')
            storePassword 'rubens123'
            keyAlias 'my-key-alias'
            keyPassword 'rubens123'
            storeType 'pkcs12'
        }
    }
  `;

  // Injetar signingConfigs logo após a abertura de android {
  content = content.replace('android {', 'android {\n' + signingConfigsStr);

  // Normalizar quebras de linha para garantir a correspondência da substituição
  content = content.replace(/\r\n/g, '\n');

  const oldBuildTypes = `    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }`;

  const newBuildTypes = `    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
        debug {
            signingConfig signingConfigs.release
        }
    }`;

  // Tenta substituir com a quebra de linha normalizada
  if (content.includes(oldBuildTypes)) {
    content = content.replace(oldBuildTypes, newBuildTypes);
  } else {
    // Fallback caso a formatação seja ligeiramente diferente
    const alternativeOld = `    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }`;
    content = content.replace(alternativeOld, newBuildTypes);
  }

  // Converter de volta para o formato de quebra de linha do sistema se necessário
  content = content.replace(/\n/g, '\r\n');

  fs.writeFileSync(gradlePath, content, 'utf8');
  console.log('build.gradle atualizado com as configurações de assinatura.');
} else {
  console.error('Erro: build.gradle não encontrado!');
  process.exit(1);
}
