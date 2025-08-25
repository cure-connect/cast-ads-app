import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import CustomButton from "../components/CustomButton";

export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <CustomButton
        title="ไปที่หน้ารูปภาพ"
        onPress={() => router.push("/images/images")}
      />
      <CustomButton
        title="ไปที่หน้าวิดีโอs"
        onPress={() => router.push("/videos/videos")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
});
