import { AntDesign } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { Pressable } from "react-native";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="images/image-preview"
        options={{
          headerShown: true,
          title: '',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ marginLeft: 10 }}>
              <AntDesign name="arrowleft" size={24} color="black" />
            </Pressable>
          ),
          headerStyle: {
            backgroundColor: '#fff',
          },
        }}
      />
      <Stack.Screen
        name="images/images"
        options={{
          headerShown: true,
          title: '',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ marginLeft: 10 }}>
              <AntDesign name="arrowleft" size={24} color="black" />
            </Pressable>
          ),
          headerStyle: {
            backgroundColor: '#fff',
          },
        }}
      />
    </Stack>
  );
}