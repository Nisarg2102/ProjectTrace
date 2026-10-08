import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
export default [{ files: ['src/**/*.{js,jsx}'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.browser, parserOptions: { ecmaFeatures: { jsx: true } } }, plugins: { 'react-hooks': hooks }, rules: { ...hooks.configs.recommended.rules } }];
