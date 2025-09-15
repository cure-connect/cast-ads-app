import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Network from "expo-network";
import { SplashScreen, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Dimensions,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    View
} from "react-native";

import { downloadMediaFile } from "@/src/utils/localStorage";
import CastLogo from "@assets/images/Cast.png";
import BackgroundVideo from "@assets/videos/background.mp4";
import axios from "axios";
import { useVideoPlayer, VideoView } from "expo-video";
import DeviceInfo from "react-native-device-info";
import { io, Socket } from "socket.io-client";

import { Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, useFonts } from "@expo-google-fonts/roboto";
import AppLoading from "expo-app-loading";

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
    const [isOnline, setIsOnline] = useState(true);

    const { width, height } = Dimensions.get("screen");

    const [fontsLoaded] = useFonts({
        Roboto_400Regular,
        Roboto_500Medium,
        Roboto_700Bold,
    });

    const player = useVideoPlayer(BackgroundVideo, (player) => {
        player.loop = true;
        player.muted = true;
        player.play();
    });

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
                    autoConnect: true,
                    reconnection: true,
                    reconnectionAttempts: Infinity,
                    reconnectionDelay: 2000,
                    reconnectionDelayMax: 10000,
                });

                socket.on("connect", () => {
                    console.log("Socket connected:", socket.id);
                    socket.emit("device:register", info);
                    socket.emit("device:stimulate", deviceData.deviceId);
                    socket.emit("device:status", {
                        deviceId: deviceData.deviceId,
                        status: "online",
                    });
                });

                socket.on("devices:updated", (devices) => {
                    console.log("Devices updated: ", devices)
                })

                socket.on("media:play", async (mediaFile: MediaFile, options: PlaybackOptions) => {
                    let mediaUri = mediaFile.url;
                    if (mediaFile.type === "video") {
                        const localFileName = `${mediaFile.mediaId}.mp4`;
                        const localUri = await downloadMediaFile(mediaFile.url, localFileName);
                        if (localUri) mediaUri = localUri;
                    }

                    if (mediaFile.type === "image") {
                        router.push({
                            pathname: "/image-preview",
                            params: {
                                url: mediaFile.url,
                                name: mediaFile.name,
                                autoplay: options?.autoplay ? "true" : "false",
                            },
                        });
                    } else if (mediaFile.type === "video") {
                        router.push({
                            pathname: "/video-player",
                            params: {
                                url: mediaFile.url,
                                name: mediaFile.name,
                                autoplay: options?.autoplay ? "true" : "false",
                            },
                        });
                    }
                });

                socket.on("playback:command", (control) => {
                    switch (control.action) {
                        case "stop":
                            socket.emit("device:status", {
                                deviceId: deviceData.deviceId,
                                status: "online",
                            });
                            router.replace("/");
                            break;
                        case "play":
                            socket.emit("device:status", {
                                deviceId: deviceData.deviceId,
                                status: "busy",
                            });
                            break;
                        case "pause":
                            socket.emit("device:status", {
                                deviceId: deviceData.deviceId,
                                status: "paused"
                            })
                            break;
                        case "loop":
                            socket.emit("device:status", {
                                deviceId: deviceData.deviceId,
                                status: "looping"
                            })
                    }
                });

                socket.on("disconnect", (reason) => {
                    console.log("Socket disconnected", reason);
                });
            } catch (err: any) {
                console.error("Register failed:", err.message || err.response);
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

    if (!fontsLoaded) {
        return <AppLoading />;
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container} pointerEvents="box-none">
            <StatusBar hidden />

            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <VideoView
                    player={player}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                />
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.centerContent}>
                    <View style={styles.logoRow}>
                        <Image source={CastLogo} style={styles.logo} />
                        <View style={styles.textColumn}>
                            <Text style={styles.brandText}>CAST ADS</Text>
                            <Text style={styles.tagline}>Digital Signage System</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.bottomContent}>
                    <View style={styles.qrContainer}>
                        <View style={styles.qrCodeBox}>
                            <Text style={styles.qrPlaceholder}>QR CODE</Text>
                        </View>
                        <Text style={styles.qrText}>สแกนเพื่อลงทะเบียน</Text>
                    </View>
                    <View style={styles.statusContainer}>
                        <View style={[styles.statusDot, isOnline && styles.statusDotOnline]} />
                        <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    gradientBackground: {
        ...StyleSheet.absoluteFillObject,
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    textColumn: {
        flexDirection: 'column',
        justifyContent: 'center',
    },
    logo: {
        width: 70,
        height: 70,
        resizeMode: 'contain',
        marginRight: 10,
    },
    brandText: {
        fontSize: 36,
        fontFamily: "Roboto_700Regular",
        color: '#FFFFFF',
        letterSpacing: 2,
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    tagline: {
        fontSize: 16,
        fontFamily: "Roboto_400Regular",
        color: 'rgba(255, 255, 255, 0.9)',
        letterSpacing: 0.5,
        marginTop: 2,
    },
    bottomContent: {
        position: 'absolute',
        bottom: 60,
        right: 30,
        alignItems: 'flex-end',
    },
    qrContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    qrCodeBox: {
        width: 100,
        height: 100,
        backgroundColor: '#e1d9d9ff',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 3,
    },
    qrPlaceholder: {
        fontSize: 10,
        color: '#999999',
        fontFamily: "Roboto_400Regular",
    },
    qrText: {
        fontSize: 12,
        color: '#666666',
        marginTop: 8,
        fontFamily: "Roboto_400Regular",
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#999999',
        marginRight: 6,
    },
    statusDotOnline: {
        backgroundColor: '#10B981',
    },
    statusText: {
        fontSize: 14,
        color: '#333333',
        fontFamily: "Roboto_500Medium",
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#111827',
    },
    errorText: {
        fontSize: 16,
        color: '#F87171',
        textAlign: 'center',
        paddingHorizontal: 20,
        fontFamily: "Roboto_400Regular",
    },
});
