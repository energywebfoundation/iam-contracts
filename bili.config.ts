import { Config } from "bili";

const config: Config = {
  input: "src/index.ts",
  output: {
    format: ["cjs", "esm"],
    minify: false,
    sourceMap: true
  }
};

export default config;
