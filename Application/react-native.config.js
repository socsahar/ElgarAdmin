module.exports = {
  dependencies: {
    'react-native-vector-icons': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-vector-icons/android',
          packageImportPath: 'import io.github.oblador.vectoricons.VectorIconsPackage;',
        },
      },
    },
  },
  project: {
    android: {
      sourceDir: './android',
      appName: 'ElgarMobile',
      packageName: 'com.checkpoint.elgarmobile',
    },
  },
};
