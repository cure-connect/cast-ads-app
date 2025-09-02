import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Network from "expo-network";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import axios from 'axios';
import DeviceInfo from 'react-native-device-info';
import { io } from 'socket.io-client';

interface ImageItem {
  mediaId: string;
  name: string;
  url: string;
}

const { apiUrl } = Constants.expoConfig?.extra ?? {};
const socket = io(`${apiUrl}`, {
  transports: ["websocket"],
});

export default function Index() {
  const router = useRouter();

  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const [ip, setIp] = useState<string>("");
  const [networkstate, setNetworkState] = useState<string>("");

  const { width, height } = Dimensions.get("screen");

  useEffect(() => {
    const registerDevice = async () => {
      try {
        const getSerial = DeviceInfo.getSerialNumberSync();
        const serialNumber = !getSerial || getSerial.toLowerCase() === "unknown" ? "not allowed" : getSerial;

        const deviceInfo = {
          serialNumber,
          deviceId: DeviceInfo.getDeviceId(),
          deviceOS: Device.osInternalBuildId ?? "unknown-device",
          deviceName: DeviceInfo.getDeviceNameSync(),
          name: Device.designName ?? "Unknown Device",
          ipAddress: DeviceInfo.getIpAddressSync(),
          instanceId: DeviceInfo.getInstanceIdSync(),
          macAddress: DeviceInfo.getMacAddressSync(),
          modelName: DeviceInfo.getModel(),
          uniqueId: DeviceInfo.getUniqueIdSync(),
        };

        const [ip, networkState] = await Promise.all([
          Network.getIpAddressAsync(),
          Network.getNetworkStateAsync(),
        ]);

        setNetworkState(String(networkState.isConnected));
        setIp(ip);

        const info = {
          ...deviceInfo,
          ip,
          port: 3001,
          capabilities: ["video", "audio", "image"],
          status: networkState.isConnected ? "online" : "offline",
          screenResolution: {
            width: Math.round(width),
            height: Math.round(height)
          },
        };
        console.log('info', info)

        setDeviceInfo(info);

        const response = await axios.post(`${apiUrl}/api/devices/register`, info, {
          headers: { "Content-Type": "application/json" },
        });

        socket.emit("register", info);

        console.log("Register success:", response.data);
      } catch (err: any) {
        if (err.response) {
          console.error("Register failed:", err.response.status, err.response.data);
        } else {
          console.error("Register failed:", err.message);
        }
      }
    };

    registerDevice();

    return () => {
      socket.disconnect();
    };
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

  const getsn = DeviceInfo.getSerialNumberSync();
  const sn = !getsn || getsn.toLowerCase() === "unknown" ? "not allowed" : getsn;
  const deviceId = DeviceInfo.getDeviceId();
  const deviceName = DeviceInfo.getDeviceNameSync();
  const ipaddress = DeviceInfo.getIpAddressSync();
  const instaceId = DeviceInfo.getInstanceIdSync();
  const macAddress = DeviceInfo.getMacAddressSync();
  const modelName = DeviceInfo.getModel();
  const uniqueId = DeviceInfo.getUniqueIdSync();

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.deviceBox}>
        <Text style={styles.deviceText}>Resolution: width: {Math.round(width)} / height: {Math.round(height)}</Text>
        <Text style={styles.deviceText}>sn: {deviceInfo.sn}</Text>
        <Text style={styles.deviceText}>DeviceID: {deviceInfo.deviceId}</Text>
        <Text style={styles.deviceText}>DeviceOS: {deviceInfo.deviceOS}</Text>
        <Text style={styles.deviceText}>DeviceName: {deviceInfo.deviceName}</Text>
        <Text style={styles.deviceText}>IP: {deviceInfo.ipAddress}</Text>
        <Text style={styles.deviceText}>InstanceId: {deviceInfo.instanceId}</Text>
        <Text style={styles.deviceText}>MAC Address: {deviceInfo.macAddress}</Text>
        <Text style={styles.deviceText}>Model Name: {deviceInfo.modelName}</Text>
        <Text style={styles.deviceText}>UniqueID: {deviceInfo.uniqueId}</Text>
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
