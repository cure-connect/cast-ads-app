import { ResizeMode, Video } from "expo-av";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

const videoMap: Record<string, string> = {
  "1": "https://www.w3schools.com/html/mov_bbb.mp4",
  "2": "https://www.w3schools.com/html/movie.mp4",
};

export default function VideoPlayer() {
  const { id } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Video
        source={{ uri: videoMap[String(id)] }}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        style={styles.video}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  video: { width: "100%", height: "100%" },
});
