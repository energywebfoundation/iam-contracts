module.exports = {
  extends: ['@energyweb'],
  env: {
    mocha: true,
    es2021: true,
    node: true,
  },
  parserOptions: {
    project: ['tsconfig.json', 'tsconfig.eslint.json', 'test/tsconfig.json'],
  },
};
