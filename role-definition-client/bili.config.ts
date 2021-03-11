import { Config } from 'bili';

const config: Config = {
  plugins: {
    typescript2: {
      // tsconfigOverride: {
      //   include: ['src', 'ethers']
      // }
    },
  },
  input: 'src/role-definition-client.ts',
  output: {
    format: ['cjs', 'esm'],
    minify: false
  }
};

export default config;
