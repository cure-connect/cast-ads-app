import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ImageItem {
  mediaId: string;
  name: string;
  url: string;
}

export default function Images() {
  const router = useRouter();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch("http://141.98.17.189:3004/api/media");
        if (!response.ok) {
          throw new Error("Failed to fetch images");
        }
        const result = await response.json();
        const data: ImageItem[] = result.data.map((item: any) => ({
          mediaId: item.mediaId,
          name: item.name,
          url: item.url,
        }));
        setImages(data);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={images}
      keyExtractor={(item) => item.mediaId}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.item}
          onPress={() =>
            router.push({
              pathname: "/images/image-preview",
              params: { url: item.url },
            })
          }
        >
          <Image
            source={{ uri: item.url }}
            style={styles.image}
            resizeMode="cover"
          />
          <Text style={styles.text}>{item.name}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    alignItems: "center",
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 10,
    borderRadius: 8,
  },
  text: {
    fontSize: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
