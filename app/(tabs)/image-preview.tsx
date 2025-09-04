import { router, useLocalSearchParams } from "expo-router";
import { Image, Pressable, StyleSheet } from "react-native";

export default function ImagePreview() {
  const { url } = useLocalSearchParams();

  return (
    <Pressable style={styles.container} onPress={() => router.back()}>
      <Image
        source={{ uri: url as string }}
        style={styles.image}
        resizeMode="contain"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
