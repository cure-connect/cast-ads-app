import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Network from "expo-network";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    AppState,
    Dimensions,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    View
} from "react-native";

import CastLogo from "@assets/images/Cast.png";
import BackgroundImage from "@assets/images/background.png";
import axios from "axios";
import DeviceInfo from "react-native-device-info";
import { io, Socket } from "socket.io-client";

import { Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, useFonts } from "@expo-google-fonts/roboto";
import AppLoading from "expo-app-loading";

import { cleanupCache } from '@/src/utils/localStorage';

interface ImageItem {
    mediaId: string;
    name: string;
    url: string;
}

interface MediaFile {
    mediaId: string;
    name: string;
    url: string;
    type: 'video' | 'audio' | 'image' | 'document' | 'presentation';
    duration?: number;
}

interface PlaybackOptions {
    autoplay?: boolean;
    volume?: number;
    startTime?: number;
    loop?: boolean;
}

interface PlaybackControl {
    action: 'play' | 'pause' | 'stop' | 'seek' | 'volume';
    value?: number;
}

const { apiUrl } = Constants.expoConfig?.extra ?? {};
let socket: Socket;

export default function HomePage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [deviceInfo, setDeviceInfo] = useState<any>({});
    const [isOnline, setIsOnline] = useState(true);

    const [ip, setIp] = useState<string>("");
    const [networkstate, setNetworkState] = useState<string>("");

    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [connectionStatus, setConnectionStatus] = useState<string>('Initializing...');
    const [isRegistered, setIsRegistered] = useState<boolean>(false);
    const [currentMedia, setCurrentMedia] = useState<MediaFile | null>(null);

    const socketRef = useRef<Socket | null>(null);
    const stimulateIntervalRef = useRef<number | null>(null);
    const deviceIdRef = useRef<string>('');
    const reconnectTimeoutRef = useRef<number | null>(null);
    const appStateRef = useRef(AppState.currentState);

    const { width, height } = Dimensions.get("screen");

    const [fontsLoaded] = useFonts({
        Roboto_400Regular,
        Roboto_500Medium,
        Roboto_700Bold,
    });

    // จัดการ App State สำหรับ background/foreground
    useEffect(() => {
        const handleAppStateChange = (nextAppState: any) => {
            if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
                console.log('App has come to the foreground!');
                // Reconnect socket if needed
                if (!socketRef.current?.connected) {
                    initializeWebSocket();
                }
            } else if (nextAppState === 'background') {
                console.log('App has gone to the background');
                // Keep socket connection alive but reduce stimulate frequency
            }
            appStateRef.current = nextAppState;
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription?.remove();
    }, []);

    // websocket functions
    const initializeWebSocket = () => {
        // ปิด connection เดิมก่อน (ถ้ามี)
        if (socketRef.current) {
            socketRef.current.disconnect();
        }

        console.log('Initializing WebSocket connection...');
        setConnectionStatus('Connecting...');

        const socket = io(`${apiUrl}`, {
            transports: ["websocket", "polling"],
            timeout: 20000,
            reconnection: true,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 10000,
            reconnectionAttempts: 10,
            forceNew: true,
            upgrade: true,
            rememberUpgrade: true
        });

        socketRef.current = socket;
        setupSocketEventListeners(socket);

        return socket;
    };

    const setupSocketEventListeners = (socket: Socket) => {
        socket.on('connect', () => {
            console.log('WebSocket connected:', socket.id);
            setIsConnected(true);
            setConnectionStatus('Connected');
            setError(null);

            // Clear any reconnect timeout
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            registerDeviceViaSocket();
        });

        socket.on('disconnect', (reason) => {
            console.log('WebSocket disconnected:', reason);
            setIsConnected(false);
            setIsRegistered(false);
            setConnectionStatus(`Disconnected: ${reason}`);
            stopStimulate();

            // Auto-reconnect after 5 seconds for certain disconnect reasons
            if (reason === 'io server disconnect' || reason === 'transport close') {
                reconnectTimeoutRef.current = setTimeout(() => {
                    console.log('Attempting to reconnect...');
                    initializeWebSocket();
                }, 5000);
            }
        });

        socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
            setIsConnected(false);
            setConnectionStatus(`Connection Error: ${error.message}`);
        });

        socket.on('device:register', (response) => {
            console.log('Device registration response:', response);

            if (response && response.success) {
                console.log('Device registered successfully!');
                setIsRegistered(true);
                setConnectionStatus('Device Registered');
                startStimulate();

                // Cleanup cache on successful registration
                cleanupCache();
            } else {
                console.error('Device registration failed:', response);
                setConnectionStatus('Registration Failed');
                Alert.alert('Registration Failed', response?.error || 'Unknown error');
            }
        });

        socket.on('media:play', (mediaFile: MediaFile, options?: PlaybackOptions) => {
            console.log('Media play command received:', mediaFile);
            console.log('Playback options:', options);

            setCurrentMedia(mediaFile);
            setConnectionStatus('Playing Media');

            socket.emit('device:status', deviceIdRef.current, 'busy');

            // เล่นวิดีโอจาก URL โดยตรง ไม่ต้องดาวน์โหลดก่อน
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
                console.log('Playing video directly from URL:', mediaFile.url);
                router.push({
                    pathname: "/video-player",
                    params: {
                        url: mediaFile.url,
                        name: mediaFile.name,
                        type: 'video',
                        autoplay: options?.autoplay ? 'true' : 'false',
                        volume: options?.volume?.toString() || '80',
                        startTime: options?.startTime?.toString() || '0'
                    },
                });
            } else {
                Alert.alert(
                    'Media Received',
                    `Playing: ${mediaFile.name}\nType: ${mediaFile.type}`,
                    [{ text: 'OK' }]
                );
            }
        });

        socket.on('playback:command', (control: PlaybackControl) => {
            console.log('Playback control received:', control);

            switch (control.action) {
                case 'play':
                    console.log('▶️ Play command');
                    break;
                case 'pause':
                    console.log('⏸️ Pause command');
                    break;
                case 'stop':
                    console.log('⏹️ Stop command');
                    setCurrentMedia(null);
                    setConnectionStatus('Device Online');
                    socketRef.current?.emit('device:status', deviceIdRef.current, 'online');
                    router.replace('/');
                    break;
                case 'seek':
                    console.log('Seek to:', control.value);
                    break;
                case 'volume':
                    console.log('Volume set to:', control.value);
                    break;
            }
        });

        socket.on('devices:updated', (devices) => {
            console.log('Devices list updated:', devices.length, 'devices');
        });

        socket.on('error', (message) => {
            console.error('Socket error:', message);
            setError(`Socket Error: ${message}`);
        });

        socket.on('cast:success', (data) => {
            console.log('Cast successful:', data);
        });

        // เพิ่ม ping/pong handling
        socket.on('ping', () => {
            socket.emit('pong');
        });

        // เพิ่ม listener สำหรับ playlist:play
        socket.on('playlist:play', (playlistData: any) => {

            if (playlistData.items && playlistData.items.length > 0) {
                console.log('First item:', playlistData.items[0]);
                console.log('First item URL:', playlistData.items[0]?.media?.url);
            }

            setConnectionStatus('Playing Slideshow');
            socket.emit('device:status', deviceIdRef.current, 'busy');

            // Navigate to slideshow player
            router.push({
                pathname: "/slideshow-player",
                params: {
                    playlistData: JSON.stringify(playlistData)
                },
            });
        });

        // เพิ่ม listener สำหรับ playlist:stop
        socket.on('playlist:stop', () => {
            console.log('Playlist stop command received');
            setCurrentMedia(null);
            setConnectionStatus('Device Online');
            socketRef.current?.emit('device:status', deviceIdRef.current, 'online');
            router.replace('/');
        });

    };

    const registerDeviceViaSocket = () => {
        if (!socketRef.current || !socketRef.current.connected) {
            console.error('Socket not connected');
            return;
        }

        console.log('Registering device via WebSocket...');
        setConnectionStatus('Registering Device...');

        const registrationData = {
            deviceId: deviceIdRef.current,
            uniqueId: deviceIdRef.current,
            instanceId: '',
            deviceOS: Device.osName,
            deviceName: deviceInfo.deviceName || 'Digital Signage Device',
            modelName: '',
            ipAddress: ip,
            macAddress: '',
            status: 'online',
            screenResolution: {
                width: Math.round(width),
                height: Math.round(height)
            },
            orientation: height > width ? 'portrait' : 'landscape'
        };

        console.log('Sending device registration:', registrationData);
        socketRef.current.emit('device:register', registrationData);
    };

    const startStimulate = () => {
        stopStimulate();

        console.log('Starting stimulate...');

        // Send initial stimulate
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('device:stimulate', deviceIdRef.current);
        }

        // Setup interval stimulate (reduced frequency for better performance)
        stimulateIntervalRef.current = setInterval(() => {
            if (socketRef.current && socketRef.current.connected) {
                console.log('Sending stimulate for device:', deviceIdRef.current);
                socketRef.current.emit('device:stimulate', deviceIdRef.current);

                const status = currentMedia ? 'busy' : 'online';
                socketRef.current.emit('device:status', deviceIdRef.current, status);
            } else {
                console.log('Cannot send stimulate - socket disconnected');
                if (!socketRef.current?.connected) {
                    initializeWebSocket();
                }
            }
        }, 45000);
    };

    const stopStimulate = () => {
        if (stimulateIntervalRef.current !== null) {
            clearInterval(stimulateIntervalRef.current);
            stimulateIntervalRef.current = null;
            console.log('Stimulate stopped');
        }
    };

    useEffect(() => {
        const registerDevice = async () => {
            try {
                setConnectionStatus('Getting Device Info...');

                const uniqueId = DeviceInfo.getUniqueIdSync() || 'unknow';
                deviceIdRef.current = uniqueId;

                const [ip, networkState] = await Promise.all([
                    Network.getIpAddressAsync(),
                    Network.getNetworkStateAsync(),
                ]);

                console.log('Device IP:', ip);

                const deviceData = {
                    // serialNumber,
                    deviceId: uniqueId,
                    deviceOS: Device.osName,
                    deviceName: Device.deviceName,
                    ipAddress: ip,
                    instanceId: DeviceInfo.getInstanceId(),
                    uniqueId: uniqueId,
                    macAddress: DeviceInfo.getMacAddressSync(),
                    // macAddress: DeviceInfo.getMacAddress(),
                    modelName: Device.modelName,
                };
                console.log('dev111', deviceData)

                setIsOnline(networkState.isConnected ?? false);
                setNetworkState(String(networkState.isConnected));
                setIp(ip);

                const info = {
                    ...deviceData,
                    status: networkState.isConnected ? "online" : "offline",
                    screenResolution: {
                        width: Math.round(width),
                        height: Math.round(height),
                    },
                    orientation: height > width ? 'portrait' : 'landscape'
                };

                console.log('Device info:', info);
                setDeviceInfo(info);

                if (networkState.isConnected) {
                    try {
                        setConnectionStatus('Registering via API...');
                        const response = await axios.post(`${apiUrl}/api/devices/register`, info, {
                            headers: { "Content-Type": "application/json" },
                            timeout: 10000
                        });

                        console.log("REST API registration success:", response.data);
                    } catch (apiError) {
                        console.log("REST API registration failed, will use WebSocket only:", apiError);
                    }

                    // เริ่มต้น WebSocket connection
                    initializeWebSocket();
                } else {
                    setError("No internet connection");
                    setConnectionStatus('No Internet Connection');
                }

            } catch (err: any) {
                console.error("Register failed:", err);
                setError("Device registration failed");
                setConnectionStatus('Registration Failed');
            }
        };

        registerDevice();

        // Cleanup function
        return () => {
            stopStimulate();

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }

            if (socketRef.current) {
                socketRef.current.disconnect();
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
                <Text style={styles.statusText}>Status: {connectionStatus}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container} pointerEvents="box-none">
            <StatusBar hidden />

            <Image
                source={BackgroundImage}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
            />

            <View style={styles.contentContainer}>
                <View style={styles.centerContent}>
                    <View style={styles.logoRow}>
                        <Image source={CastLogo} style={styles.logo} />
                        <View style={styles.textColumn}>
                            <Text style={styles.brandText}>CURE CAST</Text>
                            <Text style={styles.tagline}>Digital Signage System</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.bottomContent}>
                    <View style={styles.qrContainer}>
                        <View style={styles.qrCodeBox}>
                            <Text style={styles.qrPlaceholder}>QR CODE</Text>
                            <Text style={styles.qrText}>สแกนเพื่อลงทะเบียน</Text>
                        </View>
                    </View>
                    <View style={styles.statusContainer}>
                        <View style={[styles.statusDot, isOnline && isConnected && styles.statusDotOnline]} />
                        <Text style={styles.statusText}>
                            {isOnline ? (isConnected ? 'Online' : 'Connecting...') : 'Offline'}
                        </Text>
                    </View>
                </View>
                <View style={styles.deviceBox}>
                    <Text style={styles.deviceInfoText} numberOfLines={1}>
                        Name: {deviceInfo.deviceName || 'Unknown'} {' '}
                        IP: {ip || '0.0.0.0'}
                    </Text>
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
        fontSize: 34,
        fontFamily: "Roboto_700Regular",
        color: '#FFFFFF',
        letterSpacing: 2,
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    tagline: {
        fontSize: 17,
        fontFamily: "Roboto_400Regular",
        color: 'rgba(255, 255, 255, 0.9)',
        letterSpacing: 0.5,
        marginTop: 1,
    },
    deviceBox: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginBottom: 5,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    deviceInfoText: {
        fontSize: 12,
        fontFamily: "Roboto_500Medium",
        color: '#545454',
        textAlign: 'center',
        letterSpacing: 0.5,
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
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    qrPlaceholder: {
        fontSize: 10,
        color: '#999999',
        fontFamily: "Roboto_400Regular",
    },
    qrText: {
        fontSize: 10,
        color: '#666666',
        fontFamily: "Roboto_400Regular",
    },
    statusContainer: {
        width: 100,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginBottom: 5,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#999999',
        marginRight: 6,
    },
    statusDotOnline: {
        backgroundColor: '#7ed957',
    },
    statusText: {
        fontSize: 14,
        color: '#545454',
        fontFamily: "Roboto_500Medium",
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#111827',
        paddingHorizontal: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#F87171',
        textAlign: 'center',
        marginBottom: 10,
        fontFamily: "Roboto_400Regular",
    },
});