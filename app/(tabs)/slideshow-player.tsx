// import { useLocalSearchParams, useRouter } from 'expo-router';
// import React, { useEffect, useRef, useState } from 'react';
// import { ActivityIndicator, Dimensions, Image, StatusBar, StyleSheet, Text, View } from 'react-native';
// import Video from 'react-native-video';

// interface PlaylistItem {
//     mediaId: string;
//     duration: number;
//     transition: 'fade' | 'slide' | 'none';
//     media: {
//         mediaId: string;
//         name: string;
//         url: string;
//         type: string;
//         mimeType?: string;
//     };
// }

// const { width, height } = Dimensions.get('screen');

// export default function SlideshowPlayer() {
//     const router = useRouter();
//     const params = useLocalSearchParams();

//     const [items, setItems] = useState<PlaylistItem[]>([]);
//     const [currentIndex, setCurrentIndex] = useState(0);
//     const [loading, setLoading] = useState(true);
//     const [loop, setLoop] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [videoEnded, setVideoEnded] = useState(false);

//     const timerRef = useRef<number | null>(null);
//     const videoRef = useRef<React.ElementRef<typeof Video> | null>(null);

//     useEffect(() => {
//         // Parse playlist data from params
//         try {
//             if (params.playlistData) {
//                 const playlistData = JSON.parse(params.playlistData as string);
//                 console.log('========================================');
//                 console.log('📺 SLIDESHOW PLAYER');
//                 console.log('========================================');
//                 console.log('Playlist name:', playlistData.name);
//                 console.log('Total items:', playlistData.items?.length);
//                 console.log('Loop:', playlistData.loop);
//                 console.log('Items:', playlistData.items);
//                 console.log('========================================');

//                 setItems(playlistData.items || []);
//                 setLoop(playlistData.loop !== false);
//                 setLoading(false);
//             }
//         } catch (err) {
//             console.error('Error parsing playlist data:', err);
//             setError('Failed to load slideshow');
//             setLoading(false);
//         }
//     }, [params.playlistData]);

//     const goToNextItem = () => {
//         const nextIndex = currentIndex + 1;

//         if (nextIndex >= items.length) {
//             if (loop) {
//                 console.log('🔁 Looping back to first item');
//                 setCurrentIndex(0);
//             } else {
//                 console.log('✅ Slideshow ended');
//                 router.back();
//             }
//         } else {
//             console.log(`➡️ Moving to item ${nextIndex + 1}`);
//             setCurrentIndex(nextIndex);
//         }
//         setVideoEnded(false);
//     };

//     useEffect(() => {
//         if (items.length === 0 || loading) return;

//         const currentItem = items[currentIndex];
//         if (!currentItem || !currentItem.media) {
//             console.error('Invalid item:', currentItem);
//             goToNextItem();
//             return;
//         }

//         console.log(`\n▶️ Playing item ${currentIndex + 1}/${items.length}`);
//         console.log('Name:', currentItem.media.name);
//         console.log('Type:', currentItem.media.type);
//         console.log('URL:', currentItem.media.url);
//         console.log('Duration:', currentItem.duration, 'seconds');

//         const isVideo = isVideoType(currentItem.media.type);

//         // For images, use timer
//         if (!isVideo) {
//             console.log('🖼️ Setting timer for image:', currentItem.duration * 1000, 'ms');
//             timerRef.current = setTimeout(() => {
//                 goToNextItem();
//             }, currentItem.duration * 1000);
//         } else {
//             console.log('🎬 Video will use onEnd callback or duration timer');
//             // Video uses onEnd callback, but also set timer as fallback
//             timerRef.current = setTimeout(() => {
//                 console.log('⏱️ Video duration timer ended');
//                 if (!videoEnded) {
//                     goToNextItem();
//                 }
//             }, currentItem.duration * 1000);
//         }

//         return () => {
//             if (timerRef.current) {
//                 clearTimeout(timerRef.current);
//             }
//         };
//     }, [currentIndex, items, loading, loop]);

//     const isVideoType = (type: string): boolean => {
//         if (!type) return false;
//         // Check both 'video' and 'video/*' formats
//         return type === 'video' || type.startsWith('video/');
//     };

//     const handleVideoEnd = () => {
//         console.log('🎬 Video ended naturally');
//         setVideoEnded(true);
//         goToNextItem();
//     };

//     const handleVideoError = (error: any) => {
//         console.error('❌ Video error:', error);
//         // Skip to next item on error
//         goToNextItem();
//     };

//     const handleImageError = (error: any) => {
//         console.error('❌ Image error:', error);
//         // Skip to next item on error
//         goToNextItem();
//     };

//     if (loading) {
//         return (
//             <View style={styles.loadingContainer}>
//                 <StatusBar hidden />
//                 <ActivityIndicator size="large" color="#fff" />
//                 <Text style={styles.loadingText}>Loading slideshow...</Text>
//             </View>
//         );
//     }

//     if (error || items.length === 0) {
//         return (
//             <View style={styles.errorContainer}>
//                 <StatusBar hidden />
//                 <Text style={styles.errorText}>{error || 'No items in slideshow'}</Text>
//             </View>
//         );
//     }

//     const currentItem = items[currentIndex];
//     if (!currentItem || !currentItem.media) {
//         return (
//             <View style={styles.errorContainer}>
//                 <StatusBar hidden />
//                 <Text style={styles.errorText}>Invalid slideshow item</Text>
//             </View>
//         );
//     }

//     const isVideo = isVideoType(currentItem.media.type);

//     return (
//         <View style={styles.container}>
//             <StatusBar hidden />

//             {isVideo ? (
//                 <Video
//                     ref={videoRef}
//                     source={{ uri: currentItem.media.url }}
//                     style={styles.media}
//                     resizeMode="cover"
//                     repeat={false}
//                     paused={false}
//                     // ✅ เพิ่ม audio properties
//                     volume={1.0}
//                     muted={false}
//                     playInBackground={false}
//                     playWhenInactive={false}
//                     ignoreSilentSwitch="ignore"
//                     mixWithOthers="duck"
//                     // ✅ เพิ่ม callbacks
//                     onEnd={handleVideoEnd}
//                     onError={handleVideoError}
//                     onLoad={(data) => {
//                         console.log('========================================');
//                         console.log('VIDEO LOADED IN SLIDESHOW');
//                         console.log('Item:', currentItem.media.name);
//                         console.log('URL:', currentItem.media.url);
//                         console.log('Duration:', data.duration);
//                         console.log('Audio tracks:', data.audioTracks);
//                         console.log('Has audio:', data.audioTracks && data.audioTracks.length > 0);
//                         console.log('Natural size:', data.naturalSize);
//                         console.log('========================================');

//                     }}
//                     onAudioBecomingNoisy={() => {
//                         console.log('⚠️ Audio becoming noisy');
//                     }}
//                     onAudioFocusChanged={(event) => {
//                         console.log('🔊 Audio focus changed:', event);
//                     }}
//                 />
//             ) : (
//                 <Image
//                     source={{ uri: currentItem.media.url }}
//                     style={styles.media}
//                     resizeMode="cover"
//                     onError={handleImageError}
//                     onLoad={() => {
//                         console.log('✅ Image loaded successfully');
//                     }}
//                 />
//             )}
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: '#000',
//     },
//     media: {
//         width: width,
//         height: height,
//     },
//     loadingContainer: {
//         flex: 1,
//         backgroundColor: '#000',
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     loadingText: {
//         color: '#fff',
//         fontSize: 16,
//         marginTop: 20,
//         fontWeight: '500',
//     },
//     errorContainer: {
//         flex: 1,
//         backgroundColor: '#000',
//         justifyContent: 'center',
//         alignItems: 'center',
//         padding: 20,
//     },
//     errorText: {
//         color: '#ff4444',
//         fontSize: 18,
//         textAlign: 'center',
//         fontWeight: '600',
//     },
//     progressContainer: {
//         position: 'absolute',
//         top: 40,
//         right: 20,
//         flexDirection: 'row',
//         alignItems: 'center',
//         backgroundColor: 'rgba(0, 0, 0, 0.8)',
//         paddingHorizontal: 16,
//         paddingVertical: 8,
//         borderRadius: 20,
//         borderWidth: 1,
//         borderColor: 'rgba(255, 255, 255, 0.2)',
//     },
//     progressText: {
//         color: '#fff',
//         fontSize: 14,
//         fontWeight: 'bold',
//     },
//     loopIndicator: {
//         marginLeft: 8,
//         fontSize: 14,
//     },
//     infoContainer: {
//         position: 'absolute',
//         bottom: 40,
//         left: 20,
//         right: 20,
//         backgroundColor: 'rgba(0, 0, 0, 0.8)',
//         paddingHorizontal: 20,
//         paddingVertical: 12,
//         borderRadius: 12,
//         borderWidth: 1,
//         borderColor: 'rgba(255, 255, 255, 0.2)',
//     },
//     infoRow: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginBottom: 4,
//     },
//     typeBadge: {
//         paddingHorizontal: 8,
//         paddingVertical: 4,
//         borderRadius: 6,
//         marginRight: 10,
//     },
//     videoBadge: {
//         backgroundColor: 'rgba(34, 197, 94, 0.3)',
//     },
//     imageBadge: {
//         backgroundColor: 'rgba(59, 130, 246, 0.3)',
//     },
//     typeBadgeText: {
//         color: '#fff',
//         fontSize: 10,
//         fontWeight: 'bold',
//     },
//     mediaName: {
//         color: '#fff',
//         fontSize: 16,
//         fontWeight: '600',
//         flex: 1,
//     },
//     durationText: {
//         color: 'rgba(255, 255, 255, 0.7)',
//         fontSize: 12,
//         fontWeight: '500',
//     },
// });

// slideshow-player.tsx - เวอร์ชันสมบูรณ์พร้อม cleanup และ screen focus handling

import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, StatusBar, StyleSheet, Text, View } from 'react-native';
import Video from 'react-native-video';

interface PlaylistItem {
    mediaId: string;
    duration: number;
    transition: 'fade' | 'slide' | 'none';
    media: {
        mediaId: string;
        name: string;
        url: string;
        type: string;
        mimeType?: string;
    };
}

const { width, height } = Dimensions.get('screen');

export default function SlideshowPlayer() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const [items, setItems] = useState<PlaylistItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loop, setLoop] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [videoEnded, setVideoEnded] = useState(false);
    const [isUnmounting, setIsUnmounting] = useState(false);
    const [isScreenActive, setIsScreenActive] = useState(true); // ✅ เพิ่ม state ติดตามหน้าจอ

    const timerRef = useRef<number | null>(null);
    const videoRef = useRef<React.ElementRef<typeof Video> | null>(null);
    const hasNavigatedAwayRef = useRef(false);

    // Parse playlist data
    useEffect(() => {
        try {
            if (params.playlistData) {
                const playlistData = JSON.parse(params.playlistData as string);
                console.log('========================================');
                console.log('📺 SLIDESHOW PLAYER');
                console.log('========================================');
                console.log('Playlist name:', playlistData.name);
                console.log('Total items:', playlistData.items?.length);
                console.log('Loop:', playlistData.loop);
                console.log('Items:', playlistData.items);
                console.log('========================================');

                setItems(playlistData.items || []);
                setLoop(playlistData.loop !== false);
                setLoading(false);
            }
        } catch (err) {
            console.error('Error parsing playlist data:', err);
            setError('Failed to load slideshow');
            setLoading(false);
        }
    }, [params.playlistData]);

    // ✅ ใช้ useFocusEffect เพื่อจัดการ screen focus/blur
    useFocusEffect(
        React.useCallback(() => {
            console.log('========================================');
            console.log('📺 SLIDESHOW - SCREEN FOCUSED');
            console.log('========================================');
            
            // เมื่อหน้าจอ focus
            setIsScreenActive(true);
            hasNavigatedAwayRef.current = false;
            setIsUnmounting(false);

            // Cleanup เมื่อหน้าจอ blur (ออกจากหน้า)
            return () => {
                console.log('========================================');
                console.log('🚪 SLIDESHOW - SCREEN BLURRED (Leaving)');
                console.log('========================================');
                
                setIsScreenActive(false);
                hasNavigatedAwayRef.current = true;
                setIsUnmounting(true);

                // Clear timer
                if (timerRef.current) {
                    console.log('⏹️ Clearing timer on screen blur');
                    clearTimeout(timerRef.current);
                    timerRef.current = null;
                }

                console.log('✅ Slideshow cleanup on screen blur');
            };
        }, [])
    );

    // ✅ Cleanup เมื่อ component unmount
    useEffect(() => {
        return () => {
            console.log('🧹 SLIDESHOW PLAYER - Component unmounting');
            setIsUnmounting(true);
            
            if (timerRef.current) {
                console.log('⏹️ Clearing timer on unmount');
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            
            console.log('✅ Cleanup complete');
        };
    }, []);

    const goToNextItem = () => {
        // ป้องกันการเปลี่ยน slide ถ้ากำลัง unmount หรือหน้าจอไม่ active
        if (isUnmounting || !isScreenActive || hasNavigatedAwayRef.current) {
            console.log('⚠️ Component is unmounting or screen not active, skip navigation');
            return;
        }

        const nextIndex = currentIndex + 1;

        if (nextIndex >= items.length) {
            if (loop) {
                console.log('🔄 Looping back to first item');
                setCurrentIndex(0);
            } else {
                console.log('✅ Slideshow ended');
                router.back();
            }
        } else {
            console.log(`➡️ Moving to item ${nextIndex + 1}`);
            setCurrentIndex(nextIndex);
        }
        setVideoEnded(false);
    };

    useEffect(() => {
        if (items.length === 0 || loading || isUnmounting || !isScreenActive) return;

        const currentItem = items[currentIndex];
        if (!currentItem || !currentItem.media) {
            console.error('Invalid item:', currentItem);
            goToNextItem();
            return;
        }

        console.log(`\n▶️ Playing item ${currentIndex + 1}/${items.length}`);
        console.log('Name:', currentItem.media.name);
        console.log('Type:', currentItem.media.type);
        console.log('URL:', currentItem.media.url);
        console.log('Duration:', currentItem.duration, 'seconds');

        const isVideo = isVideoType(currentItem.media.type);

        // For images, use timer
        if (!isVideo) {
            console.log('🖼️ Setting timer for image:', currentItem.duration * 1000, 'ms');
            timerRef.current = setTimeout(() => {
                goToNextItem();
            }, currentItem.duration * 1000);
        } else {
            console.log('🎬 Video will use onEnd callback or duration timer');
            // Video uses onEnd callback, but also set timer as fallback
            timerRef.current = setTimeout(() => {
                console.log('⏱️ Video duration timer ended');
                if (!videoEnded) {
                    goToNextItem();
                }
            }, currentItem.duration * 1000);
        }

        // Cleanup timer เมื่อเปลี่ยน slide หรือ unmount
        return () => {
            if (timerRef.current) {
                console.log('🧹 Cleaning up timer for item', currentIndex + 1);
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [currentIndex, items, loading, loop, isUnmounting, isScreenActive]);

    const isVideoType = (type: string): boolean => {
        if (!type) return false;
        return type === 'video' || type.startsWith('video/');
    };

    const handleVideoEnd = () => {
        // ป้องกันการทำงานถ้ากำลัง unmount หรือหน้าจอไม่ active
        if (isUnmounting || !isScreenActive || hasNavigatedAwayRef.current) {
            console.log('⚠️ Component is unmounting or screen not active, skip video end handler');
            return;
        }
        console.log('🎬 Video ended naturally');
        setVideoEnded(true);
        goToNextItem();
    };

    const handleVideoError = (error: any) => {
        if (isUnmounting || !isScreenActive) return;
        console.error('❌ Video error:', error);
        goToNextItem();
    };

    const handleImageError = (error: any) => {
        if (isUnmounting || !isScreenActive) return;
        console.error('❌ Image error:', error);
        goToNextItem();
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar hidden />
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Loading slideshow...</Text>
            </View>
        );
    }

    if (error || items.length === 0) {
        return (
            <View style={styles.errorContainer}>
                <StatusBar hidden />
                <Text style={styles.errorText}>{error || 'No items in slideshow'}</Text>
            </View>
        );
    }

    const currentItem = items[currentIndex];
    if (!currentItem || !currentItem.media) {
        return (
            <View style={styles.errorContainer}>
                <StatusBar hidden />
                <Text style={styles.errorText}>Invalid slideshow item</Text>
            </View>
        );
    }

    const isVideo = isVideoType(currentItem.media.type);

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            {isVideo ? (
                <Video
                    ref={videoRef}
                    source={{ uri: currentItem.media.url }}
                    style={styles.media}
                    resizeMode="cover"
                    repeat={false}
                    paused={isUnmounting || !isScreenActive} // ✅ Pause video เมื่อ unmounting หรือหน้าจอไม่ active
                    volume={1.0}
                    muted={false}
                    playInBackground={false}
                    playWhenInactive={false}
                    ignoreSilentSwitch="ignore"
                    mixWithOthers="duck"
                    onEnd={handleVideoEnd}
                    onError={handleVideoError}
                    onLoad={(data) => {
                        console.log('========================================');
                        console.log('VIDEO LOADED IN SLIDESHOW');
                        console.log('Item:', currentItem.media.name);
                        console.log('URL:', currentItem.media.url);
                        console.log('Duration:', data.duration);
                        console.log('Audio tracks:', data.audioTracks);
                        console.log('Has audio:', data.audioTracks && data.audioTracks.length > 0);
                        console.log('Natural size:', data.naturalSize);
                        console.log('========================================');
                    }}
                    onAudioBecomingNoisy={() => {
                        console.log('⚠️ Audio becoming noisy');
                    }}
                    onAudioFocusChanged={(event) => {
                        console.log('🔊 Audio focus changed:', event);
                    }}
                />
            ) : (
                <Image
                    source={{ uri: currentItem.media.url }}
                    style={styles.media}
                    resizeMode="cover"
                    onError={handleImageError}
                    onLoad={() => {
                        console.log('✅ Image loaded successfully');
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    media: {
        width: width,
        height: height,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
        marginTop: 20,
        fontWeight: '500',
    },
    errorContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: '#ff4444',
        fontSize: 18,
        textAlign: 'center',
        fontWeight: '600',
    },
});