import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Network from "expo-network";
import { SplashScreen, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Dimensions,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

import axios from "axios";
import DeviceInfo from "react-native-device-info";
import { io, Socket } from "socket.io-client";

interface ImageItem {
    mediaId: string;
    name: string;
    url: string;
}

interface PlaybackOptions {
    autoplay?: boolean;
    volume?: number;
    startTime?: number;
    loop?: boolean;
}
interface MediaFile {
    mediaId: string;
    name: string;
    url: string;
    type: "image" | "video" | "audio";
    files: string[];
}

const { apiUrl } = Constants.expoConfig?.extra ?? {};
let socket: Socket;

export default function HomePage() {
    const router = useRouter();

    const [error, setError] = useState<string | null>(null);

    const [deviceInfo, setDeviceInfo] = useState<any>({});
    const { width, height } = Dimensions.get("screen");
    const windowWidth = Dimensions.get("window").width;
    const windowHeight = Dimensions.get("window").height;

    const [slideshow, setSlideshow] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [autoplay, setAutoplay] = useState<boolean>(false);

    const [mediaList, setMediaList] = useState<MediaFile[]>([]);

    useEffect(() => {
        SplashScreen.hideAsync();
    }, []);

    useEffect(() => {
        const registerDevice = async () => {
            try {
                const getSerial = DeviceInfo.getSerialNumberSync();
                const serialNumber =
                    !getSerial || getSerial.toLowerCase() === "unknown"
                        ? "not allowed"
                        : getSerial;

                const deviceData = {
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

                const info = {
                    ...deviceData,
                    ip,
                    port: 3001,
                    capabilities: ["video", "audio", "image"],
                    status: networkState.isConnected ? "online" : "offline",
                    screenResolution: {
                        width: Math.round(width),
                        height: Math.round(height),
                    },
                };

                setDeviceInfo(info);

                await axios.post(`${apiUrl}/api/devices/register`, info, {
                    headers: { "Content-Type": "application/json" },
                });

                socket = io(`${apiUrl}`, {
                    transports: ["websocket"],
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 2000,
                });

                socket.on("connect", () => {
                    console.log("Socket connected:", socket.id);
                    socket.emit("device:register", info);
                    socket.emit("device:stimulate", deviceData.deviceId)
                    socket.emit("device:status", { deviceId: deviceData.deviceId, status: "online" })
                });

                socket.on("devices:updated", (devices) => {
                    console.log("Devices updated", devices)
                })

                socket.on("media:play", (mediaFile: MediaFile, options: PlaybackOptions) => {
                    console.log("Media File", mediaFile);
                    console.log("Options", options);

                    // if (mediaFile.type === "image" && Array.isArray(mediaFile.files)) {
                    //     setSlideshow(mediaFile.files);
                    //     setCurrentIndex(0);
                    //     setAutoplay(options.autoplay ?? false);
                    // }

                    // setMediaList((prev) => [...prev, mediaFile]);
                    if (mediaFile.type === 'image') {
                        router.push({
                            pathname: "/image-preview",
                            params: {
                                url: mediaFile.url,
                                name: mediaFile.name,
                                autoplay: options?.autoplay ? 'true' : 'false'
                            },
                        });
                    }
                });


                socket.on("playback:command", (control) => {
                    console.log("Playback Command", control)
                    switch (control.action) {
                        case 'stop':
                            console.log('playback: ',control.action)
                            socket.emit('device:status', deviceData.deviceId, 'online');
                            router.replace('/');
                            break;
                    }
                })

                socket.on("disconnect", () => {
                    console.log("Socket disconnected");
                });

                socket.on("error", (message) => {
                    console.log("Socket error:", message);
                });
            } catch (err: any) {
                if (err.response) {
                    console.error(
                        "Register failed:",
                        err.response.status,
                        err.response.data
                    );
                } else {
                    console.error("Register failed:", err.message);
                }
            }
        };

        registerDevice();

        return () => {
            if (socket) {
                socket.disconnect();
                console.log("Socket disconnected");
            }
        };
    }, []);

    // useEffect(() => {
    //     const fetchImages = async () => {
    //         try {
    //             const response = await fetch(`${apiUrl}/api/media`);
    //             const result = await response.json();
    //             const data: ImageItem[] = result.data.map((item: any) => ({
    //                 mediaId: item.mediaId,
    //                 name: item.name,
    //                 url: item.url,
    //             }));
    //             setImages(data);
    //         } catch (err: any) {
    //             console.error(err);
    //             setError("ไม่สามารถโหลดรูปภาพได้");
    //         } finally {
    //             setLoading(false);
    //         }
    //     };

    //     fetchImages();
    //     const intervalId = setInterval(fetchImages, 5000);

    //     return () => clearInterval(intervalId);
    // }, []);

    if (error) {
        return (
            <View style={styles.center}>
                <Text>{error}</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>

            <View style={styles.deviceBox}>
                <Text style={styles.deviceText}>
                    Resolution Screen: width: {Math.round(width)} / height:{" "}
                    {Math.round(height)}
                </Text>
                <Text style={styles.deviceText}>
                    Resolition Window: width: {Math.round(windowWidth)} / height:{" "}
                    {Math.round(windowHeight)}
                </Text>
                <Text style={styles.deviceText}>sn: {deviceInfo.serialNumber}</Text>
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
                data={mediaList}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.item}
                        onPress={() => {
                            if (item.type === "image") {
                                setSlideshow(item.files);
                                setCurrentIndex(0);
                                setAutoplay(true);
                            }
                        }}
                    >
                        <Image
                            source={{ uri: item.files[0] }}
                            style={styles.image}
                            resizeMode="cover"
                        />
                        <Text style={styles.text}>{item.type}</Text>
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
        marginTop: 50,
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
