import "dotenv/config";

export default {
  expo: {
    name: "cast-ads-app",
    slug: "cast-ads-app",
    version: "1.0.0",
    extra: {
      apiUrl: process.env.API_URL,
    },
  },
};
