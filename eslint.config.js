module.exports = {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    languageOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
    },
    plugins: {
        prettier: require('eslint-plugin-prettier'),
    },
    rules: {
        'prettier/prettier': 'error',
        semi: ['warn', 'always'],
    },
};
