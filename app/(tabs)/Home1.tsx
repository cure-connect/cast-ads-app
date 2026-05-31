import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Network from "expo-network";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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
import { io, Socket } from 'socket.io-client';
import CustomButton from "../../src/components/CustomButton";

// Type declarations for React Native environment
declare global {
  function setInterval(callback: () => void, ms: number): number;
  function clearInterval(id: number): void;
}

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

export default function HomePage() {
  const router = useRouter();

  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const [ip, setIp] = useState<string>("");
  const [networkstate, setNetworkState] = useState<string>("");
  
  // WebSocket states
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Initializing...');
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [currentMedia, setCurrentMedia] = useState<MediaFile | null>(null);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const deviceIdRef = useRef<string>('');

  const { width, height } = Dimensions.get("screen");
  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height;

  // ====================================
  // WebSocket Functions
  // ====================================

  const initializeWebSocket = () => {
    console.log('🔌 Initializing WebSocket connection...');
    setConnectionStatus('Connecting...');

    const socket = io(`${apiUrl}`, {
      transports: ["websocket", "polling"],
      timeout: 15000,
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 5,
      forceNew: true
    });

    socketRef.current = socket;
    setupSocketEventListeners(socket);

    return socket;
  };

  const setupSocketEventListeners = (socket: Socket) => {
    // ========================================
    // CONNECTION EVENTS
    // ========================================
    socket.on('connect', () => {
      console.log('✅ WebSocket connected:', socket.id);
      setIsConnected(true);
      setConnectionStatus('Connected');
      
      // Register device ทันทีหลังจากเชื่อมต่อ
      registerDeviceViaSocket();
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      setIsConnected(false);
      setIsRegistered(false);
      setConnectionStatus(`Disconnected: ${reason}`);
      stopHeartbeat();
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      setIsConnected(false);
      setConnectionStatus(`Connection Error: ${error.message}`);
    });

    // ========================================
    // DEVICE REGISTRATION EVENTS
    // ========================================
    socket.on('device:registered', (response) => {
      console.log('📋 Device registration response:', response);
      
      if (response && response.success) {
        console.log('✅ Device registered successfully!');
        setIsRegistered(true);
        setConnectionStatus('Device Registered');
        startHeartbeat();
      } else {
        console.error('❌ Device registration failed:', response);
        setConnectionStatus('Registration Failed');
        Alert.alert('Registration Failed', response?.error || 'Unknown error');
      }
    });

    // ========================================
    // MEDIA PLAYBACK EVENTS (สำคัญ!)
    // ========================================
    socket.on('media:play', (mediaFile: MediaFile, options?: PlaybackOptions) => {
      console.log('🎬 Media play command received:', mediaFile);
      console.log('🎮 Playback options:', options);
      
      setCurrentMedia(mediaFile);
      setConnectionStatus('Playing Media');
      
      // อัปเดตสถานะ device เป็น busy
      socket.emit('device:status', deviceIdRef.current, 'busy');
      
      // Navigate ไปหน้าเล่น media หรือแสดง media
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
        // สำหรับ video ให้ใช้ image-preview page หรือสร้าง modal
        router.push({
          pathname: "/image-preview",
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
        // สำหรับ media type อื่นๆ แสดง Alert
        Alert.alert(
          'Media Received',
          `Playing: ${mediaFile.name}\nType: ${mediaFile.type}\nURL: ${mediaFile.url}`,
          [{ text: 'OK' }]
        );
      }
    });

    socket.on('playback:command', (control: PlaybackControl) => {
      console.log('🎮 Playback control received:', control);
      
      switch (control.action) {
        case 'play':
          // Handle play command
          console.log('▶️ Play command');
          break;
        case 'pause':
          // Handle pause command
          console.log('⏸️ Pause command');
          break;
        case 'stop':
          // Handle stop command
          console.log('⏹️ Stop command');
          setCurrentMedia(null);
          setConnectionStatus('Device Online');
          socketRef.current?.emit('device:status', deviceIdRef.current, 'online');
          router.replace('/');
          break;
        case 'seek':
          // Handle seek command
          console.log('⏭️ Seek to:', control.value);
          break;
        case 'volume':
          // Handle volume command
          console.log('🔊 Volume set to:', control.value);
          break;
      }
    });

    // ========================================
    // OTHER EVENTS
    // ========================================
    socket.on('devices:updated', (devices) => {
      console.log('📊 Devices list updated:', devices.length, 'devices');
    });

    socket.on('error', (message) => {
      console.error('❌ Socket error:', message);
      Alert.alert('Socket Error', message);
    });

    socket.on('cast:success', (data) => {
      console.log('✅ Cast successful:', data);
    });
  };

  const registerDeviceViaSocket = () => {
    if (!socketRef.current || !socketRef.current.connected) {
      console.error('❌ Socket not connected');
      return;
    }

    console.log('📝 Registering device via WebSocket...');
    setConnectionStatus('Registering Device...');

    const registrationData = {
      deviceId: deviceIdRef.current,
      name: deviceInfo.name || deviceInfo.deviceName || 'Digital Signage Device',
      ip: deviceInfo.ip || ip,
      port: 3001,
      capabilities: ['video', 'audio', 'image'],
      status: 'online'
    };

    console.log('📤 Sending device registration:', registrationData);
    socketRef.current.emit('device:register', registrationData);
  };

  const startHeartbeat = () => {
    // Clear existing heartbeat
    stopHeartbeat();

    console.log('💓 Starting heartbeat...');
    
    // Send initial heartbeat
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('device:heartbeat', deviceIdRef.current);
    }

    // Setup interval heartbeat
    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current && socketRef.current.connected) {
        console.log('💓 Sending heartbeat for device:', deviceIdRef.current);
        socketRef.current.emit('device:heartbeat', deviceIdRef.current);
      } else {
        console.log('❌ Cannot send heartbeat - socket disconnected');
      }
    }, 30000); // 30 seconds
  };

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current !== null) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
      console.log('💓 Heartbeat stopped');
    }
  };

  // ====================================
  // Device Registration (REST API)
  // ====================================
  useEffect(() => {
    const registerDevice = async () => {
      try {
        setConnectionStatus('Getting Device Info...');
        
        const getSerial = DeviceInfo.getSerialNumberSync();
        const serialNumber = !getSerial || getSerial.toLowerCase() === "unknown" ? "not allowed" : getSerial;
        const uniqueId = DeviceInfo.getUniqueIdSync();
        
        // Set device ID for socket registration
        deviceIdRef.current = uniqueId;

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
          uniqueId: uniqueId,
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

        console.log('📱 Device info:', info);
        setDeviceInfo(info);

        // Register device via REST API (optional)
        try {
          setConnectionStatus('Registering via API...');
          const response = await axios.post(`${apiUrl}/api/devices/register`, {
            deviceId: uniqueId,
            name: info.name,
            ip: ip,
            port: 3001,
            capabilities: ["video", "audio", "image"]
          }, {
            headers: { "Content-Type": "application/json" },
          });

          console.log("✅ REST API registration success:", response.data);
        } catch (apiError) {
          console.log("⚠️ REST API registration failed, will use WebSocket only");
        }

        // Initialize WebSocket connection
        initializeWebSocket();

      } catch (err: any) {
        console.error("❌ Device registration failed:", err);
        setError("Device registration failed");
        setConnectionStatus('Registration Failed');
      }
    };

    registerDevice();

    return () => {
      // Cleanup
      stopHeartbeat();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // ====================================
  // Fetch Media Files
  // ====================================
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
        console.error('❌ Fetch images error:', err);
        setError("ไม่สามารถโหลดรูปภาพได้");
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
    const intervalId = setInterval(fetchImages, 5000);

    return () => clearInterval(intervalId);
  }, []);

  // ====================================
  // Test Functions
  // ====================================
  const testSocketConnection = () => {
    console.log('🧪 Testing socket connection...');
    console.log('Socket connected:', socketRef.current?.connected);
    console.log('Device ID:', deviceIdRef.current);
    console.log('Is registered:', isRegistered);
    
    if (socketRef.current?.connected) {
      socketRef.current.emit('device:heartbeat', deviceIdRef.current);
      Alert.alert('Test', 'Heartbeat sent! Check server logs.');
    } else {
      Alert.alert('Test', 'Socket not connected!');
    }
  };

  // ====================================
  // Render Components
  // ====================================
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>{connectionStatus}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.statusText}>{connectionStatus}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Connection Status Header */}
      <View style={[styles.statusHeader, { 
        backgroundColor: isConnected ? (isRegistered ? '#4CAF50' : '#FF9800') : '#F44336' 
      }]}>
        <Text style={styles.statusHeaderText}>
          {isConnected ? (isRegistered ? '🟢 Connected & Registered' : '🟡 Connected') : '🔴 Disconnected'}
        </Text>
        <Text style={styles.statusHeaderSubtext}>{connectionStatus}</Text>
      </View>

      {/* Current Media Display */}
      {currentMedia && (
        <View style={styles.currentMediaBox}>
          <Text style={styles.currentMediaText}>🎬 Current Media: {currentMedia.name}</Text>
          <Text style={styles.currentMediaUrl}>URL: {currentMedia.url}</Text>
        </View>
      )}

      {/* Test Button */}
      <CustomButton 
        title="Test Socket Connection" 
        onPress={testSocketConnection}
      />

      {/* Device Info */}
      <View style={styles.deviceBox}>
        <Text style={styles.deviceText}>🔌 Socket: {isConnected ? 'Connected' : 'Disconnected'}</Text>
        <Text style={styles.deviceText}>📝 Registered: {isRegistered ? 'Yes' : 'No'}</Text>
        <Text style={styles.deviceText}>📱 Device ID: {deviceIdRef.current}</Text>
        <Text style={styles.deviceText}>📺 Resolution: {Math.round(width)} x {Math.round(height)}</Text>
        <Text style={styles.deviceText}>🏷️ Name: {deviceInfo.name}</Text>
        <Text style={styles.deviceText}>🌐 IP: {deviceInfo.ip || ip}</Text>
        <Text style={styles.deviceText}>📧 MAC: {deviceInfo.macAddress}</Text>
        <Text style={styles.deviceText}>🏭 Model: {deviceInfo.modelName}</Text>
      </View>

      {/* Media List */}
      <FlatList
        data={images}
        keyExtractor={(item) => item.mediaId}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() =>
              router.push({
                pathname: "/image-preview",
                params: { url: item.url, name: item.name },
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
  statusHeader: {
    padding: 10,
    alignItems: 'center',
    marginTop: 50,
  },
  statusHeaderText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusHeaderSubtext: {
    color: 'white',
    fontSize: 12,
    marginTop: 2,
  },
  currentMediaBox: {
    backgroundColor: "#e3f2fd",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2196f3",
  },
  currentMediaText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: "#1976d2",
  },
  currentMediaUrl: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  deviceBox: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  deviceText: {
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'monospace',
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
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    color: "#f44336",
    textAlign: 'center',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 14,
    color: "#666",
    textAlign: 'center',
  },
});