import * as FileSystem from "expo-file-system";

export const downloadMediaFile = async (url: string, fileName: string) => {
  try {
    const fileUri = FileSystem.documentDirectory + fileName;
    const { uri } = await FileSystem.downloadAsync(url, fileUri);
    console.log("Downloaded to", uri);
    return uri;
  } catch (error) {
    console.error("Download error:", error);
    return null;
  }
};
