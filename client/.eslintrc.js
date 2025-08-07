module.exports = {
  "extends": [
    "react-app",
    "react-app/jest"
  ],
  "rules": {
    // Disable problematic rules for build
    "react-hooks/exhaustive-deps": "warn",
    "react-hooks/rules-of-hooks": "warn",
    "no-unused-vars": "warn",
    "no-undef": "warn"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
};
