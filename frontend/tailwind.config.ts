import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Pretendard Variable"', "sans-serif"],
      },
      maxWidth: {
        "screen-1180": "1180px",
      },
    },
  },
  plugins: [],
};

export default config;
