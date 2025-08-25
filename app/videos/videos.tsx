import { useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity } from "react-native";

const videos = [
  { id: "1", title: "ตัวอย่างวิดีโอ 1", uri: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { id: "2", title: "ตัวอย่างวิดีโอ 2", uri: "https://www.w3schools.com/html/movie.mp4" },
];

export default function Videos() {
  const router = useRouter();

  return (
    <FlatList
      data={videos}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.item}
          onPress={() =>
            router.push({
              pathname: "/videos/video-player",
              params: { id: item.id },
            })
          }
        >
          <Text style={styles.text}>{item.title}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  item: { padding: 20, borderBottomWidth: 1, borderBottomColor: "#ccc" },
  text: { fontSize: 16 },
});
