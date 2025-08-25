import { useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity } from "react-native";

const images = [
  { id: "1", name: "รูปภาพที่ 1" },
  { id: "2", name: "รูปภาพที่ 2" },
  { id: "3", name: "รูปภาพที่ 3" },
];

export default function Images() {
  const router = useRouter();

  return (
    <FlatList
      data={images}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.item}
          onPress={() =>
            router.push({
              pathname: "/images/image-preview",
              params: { id: item.id },
            })
          }
        >
          <Text style={styles.text}>{item.name}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  item: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  text: {
    fontSize: 16,
  },
});
