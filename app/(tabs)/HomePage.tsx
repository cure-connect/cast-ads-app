import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Network from "expo-network";
import { SplashScreen, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";

import { downloadMediaFile } from "@/src/utils/localStorage";
import PureLogo from "@assets/images/cureconnectlogo.jpg";
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

                socket.on("media:play", async (mediaFile: MediaFile, options: PlaybackOptions) => {
                    console.log("Media File", mediaFile);
                    console.log("Options", options);

                    let mediaUri = mediaFile.url;

                    if (mediaFile.type === "video") {
                        const localFileName = `${mediaFile.mediaId}.mp4`;

                        const localUri = await downloadMediaFile(mediaFile.url, localFileName);

                        if (localUri) {
                            mediaUri = localUri;
                        }
                    }

                    if (mediaFile.type === 'image') {
                        router.push({
                            pathname: "/image-preview",
                            params: {
                                url: mediaFile.url,
                                name: mediaFile.name,
                                autoplay: options?.autoplay ? 'true' : 'false'
                            },
                        });
                    } else if (mediaFile.type === 'video') {
                        router.push({
                            pathname: "/video-player",
                            params: {
                                url: mediaFile.url,
                                name: mediaFile.name,
                                autoplay: options?.autoplay ? 'true' : 'false'
                            }
                        })
                    }
                });


                socket.on("playback:command", (control) => {
                    console.log("Playback Command", control)
                    switch (control.action) {
                        case 'stop':
                            console.log('playback: ', control.action)
                            socket.emit('device:status', { deviceId: deviceData.deviceId, status: "online" });
                            router.replace('/');
                            break;
                        case 'play':
                            console.log('playback: ', control.action)
                            socket.emit('device:status', { deviceId: deviceData.deviceId, status: "busy" });
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

    if (error) {
        return (
            <View style={styles.center}>
                <Text>{error}</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Image source={PureLogo} style={styles.logo} />
                <Text style={styles.title}>Device Information</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Resolution</Text>
                <Text style={styles.value}>
                    Screen: {Math.round(width)} × {Math.round(height)}
                </Text>
                <Text style={styles.value}>
                    Window: {Math.round(windowWidth)} × {Math.round(windowHeight)}
                </Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Identifiers</Text>
                <Text style={styles.value}>SN: {deviceInfo.serialNumber}</Text>
                <Text style={styles.value}>Device ID: {deviceInfo.deviceId}</Text>
                <Text style={styles.value}>Unique ID: {deviceInfo.uniqueId}</Text>
                <Text style={styles.value}>Instance ID: {deviceInfo.instanceId}</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Network</Text>
                <Text style={styles.value}>IP: {deviceInfo.ipAddress}</Text>
                <Text style={styles.value}>MAC: {deviceInfo.macAddress}</Text>
                <Text style={styles.value}>Status: {deviceInfo.status}</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Device Details</Text>
                <Text style={styles.value}>OS: {deviceInfo.deviceOS}</Text>
                <Text style={styles.value}>Name: {deviceInfo.deviceName}</Text>
                <Text style={styles.value}>Model: {deviceInfo.modelName}</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: "#f9fafb",
    },
    header: {
        alignItems: "center",
        marginBottom: 24,
    },
    logo: {
        width: 80,
        height: 80,
        borderRadius: 16,
        marginBottom: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: "#111827",
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 8,
        color: "#374151",
    },
    value: {
        fontSize: 14,
        marginBottom: 4,
        color: "#4b5563",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
});