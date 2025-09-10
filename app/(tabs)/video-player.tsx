import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Video from "react-native-video";

export default function VideoPlayer() {
  const { url } = useLocalSearchParams();
  const videoRef = useRef<any>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  useEffect(() => {
    if (url) {
      setVideoUri(url as string);
    }
  }, [url]);

  if (!videoUri) return null;

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{ uri: videoUri }}
        style={styles.video}
        resizeMode="contain"
        repeat
        paused={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: "black" }, video: { width: "100%", height: "100%" }, });
