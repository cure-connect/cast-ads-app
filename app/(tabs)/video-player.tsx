// import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
// import { useCallback, useEffect, useRef, useState } from "react";
// import { BackHandler, StyleSheet, View } from "react-native";
// import Video from "react-native-video";

// export default function VideoPlayer() {
//   const { url } = useLocalSearchParams();
//   const router = useRouter();
//   const videoRef = useRef<any>(null);
//   const [videoUri, setVideoUri] = useState<string | null>(null);
//   const [isPaused, setIsPaused] = useState(false);

//   useEffect(() => {
//     if (url) {
//       setVideoUri(url as string);
//       console.log('Video URL:', url);
//     }

//     const handleBackPress = () => {
//       console.log('Back button pressed - stopping video');
//       if (videoRef.current) {
//         videoRef.current.pause();
//       }
//       setIsPaused(true);
//       setTimeout(() => router.back(), 100);
//       return true;
//     };

//     const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

//     return () => {
//       console.log('VideoPlayer unmounting - stopping video');
//       if (videoRef.current) {
//         videoRef.current.pause();
//       }
//       setIsPaused(true);
//       backHandler.remove();
//     };
//   }, [url]);

//   useFocusEffect(
//     useCallback(() => {
//       console.log('VideoPlayer focused - resuming');
//       setIsPaused(false);  // Resume เมื่อ focus

//       return () => {
//         console.log('VideoPlayer blurred/unfocused - pausing');
//         setIsPaused(true);
//         if (videoRef.current) {
//           videoRef.current.pause();
//         }
//       };
//     }, [])
//   );

//   if (!videoUri) return null;

//   return (
//     <View style={styles.container}>
//       <Video
//         ref={videoRef}
//         source={{ uri: videoUri }}
//         style={styles.video}
//         resizeMode="contain"
//         repeat={true}
//         paused={isPaused}
//         volume={1.0}
//         muted={false}
//         playInBackground={false}
//         playWhenInactive={false}
//         ignoreSilentSwitch="ignore"
//         mixWithOthers="duck"
//         onLoad={(data) => {
//           // console.log('========================================');
//           // console.log('VIDEO LOADED');
//           // console.log('URL:', videoUri);
//           // console.log('Duration:', data.duration);
//           // console.log('Audio tracks:', data.audioTracks);
//           // console.log('Natural size:', data.naturalSize);
//           // console.log('========================================');

//           // console.log('Audio tracks count:', data.audioTracks?.length || 0);

//           // if (!data.audioTracks || data.audioTracks.length === 0) {
//           //   console.error('❌ NO AUDIO TRACKS IN VIDEO!');
//           // } else {
//           //   console.log('✅ Audio tracks found:', data.audioTracks);
//           // }
//         }}
//         onError={(error) => {
//           console.error('Video error:', error);
//         }}
//         onAudioBecomingNoisy={() => {
//           console.log('Audio becoming noisy');
//         }}
//         onAudioFocusChanged={(event) => {
//           console.log('Audio focus changed:', event);
//         }}
//         onEnd={() => {
//           console.log('Video ended');
//           // if (videoRef.current) {
//           //   videoRef.current.pause();
//           // }
//         }}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({ 
//   container: { 
//     flex: 1, 
//     backgroundColor: "black" 
//   }, 
//   video: { 
//     width: "100%", 
//     height: "100%" 
//   } 
// });

// ver 2
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import Video from "react-native-video";

export default function VideoPlayer() {
  const { url } = useLocalSearchParams();
  const router = useRouter();
  const videoRef = useRef<any>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (url) {
      setVideoUri(url as string);
      console.log('🎬 VideoPlayer mounted with URL:', url);
    }

    const handleBackPress = () => {
      console.log('Back button pressed - stopping video');
      if (videoRef.current) videoRef.current.pause();
      setIsPaused(true);

      // ✅ เปลี่ยนจาก router.back() เป็น replace เพื่อป้องกัน error GO_BACK
      setTimeout(() => router.replace('/'), 100);
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => {
      console.log('VideoPlayer unmounting - stopping video');
      if (videoRef.current) videoRef.current.pause();
      setIsPaused(true);
      backHandler.remove();
    };
  }, [url]);

  useFocusEffect(
    useCallback(() => {
      console.log('📱 VideoPlayer FOCUSED → resume');
      setIsPaused(false);
      return () => {
        console.log('📱 VideoPlayer BLURRED → pause');
        setIsPaused(true);
        if (videoRef.current) videoRef.current.pause();
      };
    }, [])
  );

  // Manual Loop (เสถียรที่สุด)
  const handleVideoEnd = () => {
    console.log('🎬 Video ended → MANUAL LOOP');
    if (videoRef.current) {
      videoRef.current.seek(0);
      setTimeout(() => {
        setIsPaused(false);
        videoRef.current?.resume?.();
      }, 50);
    }
  };

  if (!videoUri) return null;

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{ uri: videoUri }}
        style={styles.video}
        resizeMode="contain"
        repeat={true}
        paused={isPaused}
        volume={1.0}
        muted={false}
        playInBackground={false}
        playWhenInactive={false}
        ignoreSilentSwitch="ignore"
        mixWithOthers="duck"
        onLoad={(data) => console.log('✅ Video LOADED')}
        onEnd={handleVideoEnd}
        onError={(error) => console.error('❌ Video error:', error)}
      />
    </View>
  );
}

const styles = StyleSheet.create({ 
  container: { flex: 1, backgroundColor: "black" }, 
  video: { width: "100%", height: "100%" } 
});

// video-player.tsx - เวอร์ชันแก้ปัญหา Stop ไม่ทำงาน + Video ไม่หยุด

// import { useIsFocused } from '@react-navigation/native'; // ✅ ต้องมีตัวนี้
// import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
// import { useCallback, useEffect, useRef, useState } from "react";
// import { BackHandler, StyleSheet, View } from "react-native";
// import Video from "react-native-video";

// export default function VideoPlayer() {
//   const { url } = useLocalSearchParams();
//   const router = useRouter();
//   const isFocused = useIsFocused();   // ✅ ตรวจสอบว่าหน้านี้กำลังโฟกัสหรือไม่

//   const videoRef = useRef<any>(null);

//   const [videoUri, setVideoUri] = useState<string | null>(null);
//   const [isPaused, setIsPaused] = useState(false);

//   const [isUnmounting, setIsUnmounting] = useState(false);
//   const hasNavigatedAwayRef = useRef(false);

//   // Mount + Back button
//   useEffect(() => {
//     if (url) {
//       setVideoUri(url as string);
//       console.log('🎬 VideoPlayer mounted with URL:', url);
//     }

//     const handleBackPress = () => {
//       console.log('🔙 Hardware back pressed - force stop video');
//       stopVideo();
//       setTimeout(() => router.replace('/(tabs)/HomePage'), 150);
//       return true;
//     };

//     const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

//     return () => backHandler.remove();
//   }, [url]);

//   // Force pause เมื่อหน้าจอไม่โฟกัส
//   useEffect(() => {
//     if (!isFocused && videoRef.current) {
//       console.log('📴 Screen not focused → FORCE PAUSE video');
//       videoRef.current.pause();
//       setIsPaused(true);
//     }
//   }, [isFocused]);

//   // useFocusEffect + Cleanup แรง
//   useFocusEffect(
//     useCallback(() => {
//       console.log('📱 VideoPlayer FOCUSED');
//       setIsUnmounting(false);
//       hasNavigatedAwayRef.current = false;
//       setIsPaused(false);

//       return () => {
//         console.log('📱 VideoPlayer LEAVING / STOPPED');
//         setIsUnmounting(true);
//         hasNavigatedAwayRef.current = true;
//         stopVideo();
//       };
//     }, [])
//   );

//   const stopVideo = () => {
//     if (videoRef.current) {
//       console.log('⏹️ Force stop video');
//       videoRef.current.pause();
//     }
//     setIsPaused(true);
//   };

//   const handleVideoEnd = () => {
//     if (isUnmounting || !isFocused || hasNavigatedAwayRef.current) {
//       console.log('⚠️ Video ended but screen is leaving → skip loop');
//       return;
//     }
//     console.log('🎬 Video ended → MANUAL LOOP');
//     if (videoRef.current) {
//       videoRef.current.seek(0);
//       setTimeout(() => {
//         if (isFocused && !isUnmounting && !hasNavigatedAwayRef.current) {
//           setIsPaused(false);
//           videoRef.current?.resume?.();
//         }
//       }, 80);
//     }
//   };

//   if (!videoUri) return null;

//   return (
//     <View style={styles.container}>
//       <Video
//         ref={videoRef}
//         source={{ uri: videoUri }}
//         style={styles.video}
//         resizeMode="contain"
//         repeat={false}
//         paused={isPaused || !isFocused || isUnmounting}
//         volume={1.0}
//         muted={false}
//         playInBackground={false}
//         playWhenInactive={false}
//         ignoreSilentSwitch="ignore"
//         mixWithOthers="duck"
//         onLoad={() => console.log('✅ Video LOADED')}
//         onEnd={handleVideoEnd}
//         onError={(e) => console.error('❌ Video Error:', e)}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "black" },
//   video: { width: "100%", height: "100%" },
// });