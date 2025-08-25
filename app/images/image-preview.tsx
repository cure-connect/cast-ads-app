import { useLocalSearchParams } from "expo-router";
import { Image, StyleSheet, View } from "react-native";

export default function ImagePreview() {
  const { url } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: url as string }}
        style={styles.image}
        resizeMode="contain"
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
  image: {
    width: "100%",
    height: "100%",
  },
});
