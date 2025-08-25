import { ResizeMode, Video } from "expo-av";
import { useLocalSearchParams } from "expo-router";
import { useRef } from "react";
import { StyleSheet, View } from "react-native";

const videoMap: Record<string, string> = {
  "1": "https://www.w3schools.com/html/mov_bbb.mp4",
  "2": "https://www.w3schools.com/html/movie.mp4",
};

export default function VideoPlayer() {
  const { id } = useLocalSearchParams();
  const videoRef = useRef<Video>(null);

  const handleVideoReady = async () => {
    if (videoRef.current) {
      await videoRef.current.playAsync();
    }
  };

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{ uri: videoMap[String(id)] }}
        resizeMode={ResizeMode.CONTAIN}
        style={styles.video}
        shouldPlay={false}
        isLooping
        onReadyForDisplay={handleVideoReady}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  video: { width: "100%", height: "100%" },
});
