import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Network from "expo-network";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import DeviceInfo from 'react-native-device-info';

interface ImageItem {
  mediaId: string;
  name: string;
  url: string;
}

export default function Index() {
  const router = useRouter();

  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const [ip, setIp] = useState<string>("");
  const [networkstate, setNetworkState] = useState<string>("");

  const { apiUrl } = Constants.expoConfig?.extra ?? {};

  useEffect(() => {
    (async () => {
      try {
        const ipAddress = await Network.getIpAddressAsync();
        const networkinfo = await Network.getNetworkStateAsync();

        setNetworkState(String(networkinfo.isConnected));
        setIp(ipAddress);

        const info = {
          deviceId: Device.osInternalBuildId ?? "unknown-device",
          name: Device.designName ?? "Unknown Device",
          ip: ipAddress,
          port: 3001,
          capabilities: ["video", "audio", "image"],
          status: "online",
        };

        setDeviceInfo(info);

        const response = await fetch(`${apiUrl}/api/devices/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(info),
        });

        const data = await response.json();
        console.log("✅ Register success:", data);
      } catch (err) {
        console.error("❌ Register failed:", err);
      }
    })();
  }, []);

  useEffect(() => {

    const fetchImages = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/media`);
        const result = await response.json();
        const data: ImageItem[] = result.data.map((item: any) => ({
          mediaId: item.mediaId,
          name: item.name,
          url: item.url,
        }));
        setImages(data);
      } catch (err: any) {
        console.error(err);
        setError("ไม่สามารถโหลดรูปภาพได้");
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
    const intervalId = setInterval(fetchImages, 5000);

    return () => clearInterval(intervalId);
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

    const sn = DeviceInfo.getSerialNumber();
    const deviceId = DeviceInfo.getDeviceId();
    const deviceName = DeviceInfo.getDeviceNameSync();
    const ipAddress = DeviceInfo.getIpAddressSync();
    const instaceId = DeviceInfo.getInstanceIdSync();
    const macAddress = DeviceInfo.getMacAddressSync();
    const modelName = DeviceInfo.getModel();
    const uniqueId = DeviceInfo.getUniqueIdSync();

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.deviceBox}>
        <Text style={styles.deviceText}>Device: {deviceInfo.deviceId}</Text>
        <Text style={styles.deviceText}>Model: {deviceInfo.name}</Text>
        <Text style={styles.deviceText}>IP: {deviceInfo.ip}</Text>
        <Text style={styles.deviceText}>Status: {networkstate ? 'online' : 'offline'}</Text>
        <Text style={styles.deviceText}>sn: {sn}</Text>
        <Text style={styles.deviceText}>deviceId: {deviceId}</Text>
        <Text style={styles.deviceText}>deviceName: {deviceName}</Text>
        <Text style={styles.deviceText}>ipAddress: {ipAddress}</Text>
        <Text style={styles.deviceText}>instaceId: {instaceId}</Text>
        <Text style={styles.deviceText}>macAddress: {macAddress}</Text>
        <Text style={styles.deviceText}>modelName: {modelName}</Text>
        <Text style={styles.deviceText}>uniqueId: {uniqueId}</Text>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  deviceBox: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    marginTop: 50
  },
  deviceText: {
    fontSize: 14,
    marginBottom: 4,
  },
  item: {
    marginTop: 30,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    alignItems: "center",
  },
  image: {
    width: 100,
    height: 100,
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
