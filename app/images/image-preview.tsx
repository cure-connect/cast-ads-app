import { useLocalSearchParams } from "expo-router";
import { Image, StyleSheet, View } from "react-native";

const imageMap: Record<string, any> = {
  "1": require("../../assets/images/react-logo.png"),
  "2": require("../../assets/images/react-logo.png"),
  "3": require("../../assets/images/react-logo.png"),
};

export default function ImagePreview() {
  const { id } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Image source={imageMap[String(id)]} style={styles.image} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" },
  image: { width: "100%", height: "100%" },
});
