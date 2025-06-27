module.exports = {
  // Base configuration - applies to all files unless overridden
  root: true,
  env: {
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  extends: [
    "eslint:recommended",
    "plugin:jest/recommended",
    "@adobe/eslint-config-aio-lib-config",
    "plugin:prettier/recommended", // Enables eslint-plugin-prettier and eslint-config-prettier
  ],
  plugins: [
    // You might not need to explicitly list 'prettier' here if 'plugin:prettier/recommended' handles it,
    // but it doesn't hurt.
    // 'prettier'
  ],
  rules: {
    // General rules that apply to both environments
    "no-console": "warn",
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    // You can add specific ESLint rules here that Prettier doesn't handle.
    // For example, if you want to ensure specific naming conventions for variables, etc.
    // 'curly': 'error', // Example: Enforce curly braces for all control statements
    // 'eqeqeq': 'error', // Example: Enforce strict equality
  },

  // Overrides for different environments (these remain largely the same)
  overrides: [
    {
      files: ["actions/**/*.js"],
      env: {
        node: true,
        browser: false,
      },
      rules: {
        // You can override specific rules for Node.js actions if needed
      },
    },
    {
      files: ["web-src/**/*.js", "web-src/**/*.jsx"],
      env: {
        browser: true,
        node: false,
      },
      parser: "@babel/eslint-parser",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        requireConfigFile: false,
      },
      settings: {
        react: {
          version: "detect",
        },
      },
      extends: [
        "plugin:react/recommended",
        "plugin:react-hooks/recommended",
        "plugin:jsx-a11y/recommended",
        // 'plugin:prettier/recommended' is already in the base extends,
        // so it will apply to overrides too, unless you specifically add more extends after it here.
      ],
      plugins: ["react", "react-hooks", "jsx-a11y"],
      rules: {
        "react/prop-types": "off",
        "react/react-in-jsx-scope": "off",
        // You can add specific React/JSX rules here
      },
    },
  ],
};
