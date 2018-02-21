module.exports = {
  "extends": "google",
  "parserOptions": {
    "ecmaVersion": 2017
  },
  "rules": {
    "no-multi-spaces": 0,                     // disallow use of multiple spaces
    "key-spacing": 0,                // enforces spacing between keys and values
  },
  "overrides": [
    {
      "files": "*.js",
      "excludedFiles": "./public/js/*.js",
      "rules": {
        "quotes": [ 2, "single" ]
      }
    }
  ]
};
