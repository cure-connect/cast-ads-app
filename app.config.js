import 'dotenv/config';

export default {
  expo: {
    extra: {
      apiUrl: process.env.API_URL,
    }
  },
  "plugins": [
    "expo-font"
  ]
};
