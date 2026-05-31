import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, BackHandler, Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Video from "react-native-video";

interface VideoError {
  error: {
    code?: number;
    domain?: string;
    localizedDescription?: string;
  };
}

interface VideoSize {
  width: number;
  height: number;
}

interface VideoOrientation {
  isLandscape: boolean;
  aspectRatio: number;
  rotationNeeded: number;
}

export default function VideoPlayer() {
  const { url, name, autoplay = 'true', volume = '80', startTime = '0' } = useLocalSearchParams();
  const router = useRouter();
  const videoRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [videoSize, setVideoSize] = useState<VideoSize | null>(null);
  const [videoOrientation, setVideoOrientation] = useState<VideoOrientation | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isPaused, setIsPaused] = useState(autoplay === 'false');
  const [currentVolume, setCurrentVolume] = useState(parseInt(volume as string) / 100);
  const [isMuted, setIsMuted] = useState(false);
  
  const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');
  const isScreenLandscape = screenWidth > screenHeight;
  
  console.log('Screen info:', { 
    width: screenWidth, 
    height: screenHeight, 
    isScreenLandscape 
  });

  // Hide controls after 3 seconds
  const controlsTimeoutRef = useRef<number | null>(null);
  
  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    if (!url) {
      console.error('No video URL provided');
      Alert.alert('Error', 'No video URL provided');
      return;
    }

    console.log('Using direct video URL:', url);
    
    const handleBackPress = () => {
      router.back();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    // Start controls timeout
    resetControlsTimeout();

    return () => {
      backHandler.remove();
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [url]);

  const handleVideoLoad = (data: any) => {
    console.log('Video loaded successfully:', data);
    console.log('Video natural size:', data.naturalSize);
    
    setIsLoading(false);
    setHasError(false);
    
    // Analyze video orientation and size
    if (data.naturalSize) {
      const videoWidth = data.naturalSize.width;
      const videoHeight = data.naturalSize.height;
      const aspectRatio = videoWidth / videoHeight;
      const isVideoLandscape = aspectRatio > 1;
      
      setVideoSize({ width: videoWidth, height: videoHeight });
      
      // Calculate if rotation is needed for better display
      let rotationNeeded = 0;
      
      // For digital signage or special cases where rotation might help
      if (!isScreenLandscape && isVideoLandscape && aspectRatio > 1.5) {
        // Portrait screen with wide landscape video - might need rotation
        rotationNeeded = 90;
      } else if (isScreenLandscape && !isVideoLandscape && aspectRatio < 0.7) {
        // Landscape screen with tall portrait video - might need rotation
        rotationNeeded = -90;
      }
      
      setVideoOrientation({
        isLandscape: isVideoLandscape,
        aspectRatio,
        rotationNeeded
      });
      
      console.log('Video orientation analysis:', {
        videoSize: { width: videoWidth, height: videoHeight },
        aspectRatio,
        isVideoLandscape,
        isScreenLandscape,
        rotationNeeded,
        screenSize: { width: screenWidth, height: screenHeight }
      });
    }
  };

  const handleVideoError = (error: VideoError) => {
    console.error('Video playback error:', error);
    setHasError(true);
    setIsLoading(false);
    
    Alert.alert(
      'Video Error',
      'Unable to play video. Please check the video URL or try again.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  const handleVideoEnd = () => {
    console.log('Video playback ended');
    router.back();
  };

  // Get video style based on orientation analysis
  const getVideoStyle = () => {
    if (!videoOrientation || !videoSize) {
      return styles.defaultVideo;
    }

    const { isLandscape: isVideoLandscape, aspectRatio, rotationNeeded } = videoOrientation;
    const { width: videoWidth, height: videoHeight } = videoSize;

    // Apply rotation if needed
    if (rotationNeeded !== 0) {
      const rotatedWidth = rotationNeeded === 90 || rotationNeeded === -90 ? screenHeight : screenWidth;
      const rotatedHeight = rotationNeeded === 90 || rotationNeeded === -90 ? screenWidth : screenHeight;
      
      return {
        width: rotatedWidth,
        height: rotatedHeight,
        transform: [
          { rotate: `${rotationNeeded}deg` },
          ...(rotationNeeded !== 0 ? [
            { translateX: (screenWidth - rotatedWidth) / 2 },
            { translateY: (screenHeight - rotatedHeight) / 2 }
          ] : [])
        ],
      };
    }

    // Check for size mismatch - video larger than screen
    const screenAspectRatio = screenWidth / screenHeight;
    const sizeDiffWidth = Math.abs(videoWidth - screenWidth);
    const sizeDiffHeight = Math.abs(videoHeight - screenHeight);
    
    // If video dimensions are very close to screen but slightly different
    const isCloseMatch = (sizeDiffWidth < 500 && sizeDiffHeight < 500);
    const isVideoTallerThanScreen = videoHeight > screenHeight && videoWidth <= screenWidth * 1.1;
    const isVideoWiderThanScreen = videoWidth > screenWidth && videoHeight <= screenHeight * 1.1;

    if (isCloseMatch || isVideoTallerThanScreen || isVideoWiderThanScreen) {
      // Video is close to screen size but slightly different
      // Scale to fit perfectly while maintaining aspect ratio
      const scaleToFitWidth = screenWidth / videoWidth;
      const scaleToFitHeight = screenHeight / videoHeight;
      const scale = Math.min(scaleToFitWidth, scaleToFitHeight);
      
      return {
        width: videoWidth * scale,
        height: videoHeight * scale,
      };
    }

    // Standard orientation handling
    if (isVideoLandscape && isScreenLandscape) {
      // Both landscape - full screen
      return styles.landscapeVideo;
    } else if (!isVideoLandscape && !isScreenLandscape) {
      // Both portrait - check if aspect ratios are very different
      if (Math.abs(aspectRatio - screenAspectRatio) > 0.1) {
        // Aspect ratios differ significantly - scale to fit
        const scaleToFitWidth = screenWidth / videoWidth;
        const scaleToFitHeight = screenHeight / videoHeight;
        const scale = Math.min(scaleToFitWidth, scaleToFitHeight);
        
        return {
          width: videoWidth * scale,
          height: videoHeight * scale,
        };
      }
      // Similar aspect ratios - full screen
      return styles.portraitVideo;
    } else if (isVideoLandscape && !isScreenLandscape) {
      // Landscape video on portrait screen - letterbox
      return styles.landscapeOnPortraitVideo;
    } else {
      // Portrait video on landscape screen - pillarbox
      return styles.portraitOnLandscapeVideo;
    }
  };

  // Get resize mode based on orientation and size matching
  const getResizeMode = () => {
    if (!videoOrientation || !videoSize) return 'contain';
    
    const { isLandscape: isVideoLandscape, rotationNeeded } = videoOrientation;
    const { width: videoWidth, height: videoHeight } = videoSize;
    
    // If rotation is applied, use contain
    if (rotationNeeded !== 0) {
      return 'contain';
    }
    
    // Check for size mismatch
    const sizeDiffWidth = Math.abs(videoWidth - screenWidth);
    const sizeDiffHeight = Math.abs(videoHeight - screenHeight);
    const isCloseMatch = (sizeDiffWidth < 500 && sizeDiffHeight < 500);
    const isVideoTallerThanScreen = videoHeight > screenHeight && videoWidth <= screenWidth * 1.1;
    const isVideoWiderThanScreen = videoWidth > screenWidth && videoHeight <= screenHeight * 1.1;
    
    // For close matches or videos slightly larger than screen, always use contain
    // to prevent cropping and ensure full video is visible
    if (isCloseMatch || isVideoTallerThanScreen || isVideoWiderThanScreen) {
      return 'contain';
    }
    
    // Same orientation with good aspect ratio match - use cover for immersive experience
    if (isVideoLandscape === isScreenLandscape) {
      const screenAspectRatio = screenWidth / screenHeight;
      const aspectRatioDiff = Math.abs(videoOrientation.aspectRatio - screenAspectRatio);
      
      // If aspect ratios are very similar, use cover
      if (aspectRatioDiff < 0.1) {
        return 'cover';
      }
    }
    
    // Default to contain for safety
    return 'contain';
  };

  const togglePlayPause = () => {
    setIsPaused(!isPaused);
    resetControlsTimeout();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    resetControlsTimeout();
  };

  const handleScreenTap = () => {
    resetControlsTimeout();
  };

  if (!url) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.videoTouchArea}
        activeOpacity={1}
        onPress={handleScreenTap}
      >
        <Video
          ref={videoRef}
          source={{ uri: url as string }}
          style={getVideoStyle()}
          resizeMode={getResizeMode()}
          repeat={false}
          paused={isPaused}
          volume={isMuted ? 0 : currentVolume}
          playInBackground={false}
          playWhenInactive={false}
          onLoad={handleVideoLoad}
          onError={handleVideoError}
          onEnd={handleVideoEnd}
          progressUpdateInterval={5000}
          bufferConfig={{
            minBufferMs: 15000,
            maxBufferMs: 50000,
            bufferForPlaybackMs: 2500,
            bufferForPlaybackAfterRebufferMs: 5000
          }}
          onLoadStart={() => {
            console.log('Video load started from URL:', url);
            setIsLoading(true);
          }}
          onReadyForDisplay={() => {
            console.log('Video ready for display');
            setIsLoading(false);
          }}
        />
      </TouchableOpacity>

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      )}

      {/* Error indicator */}
      {hasError && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>Video playback error</Text>
          <Text style={styles.errorSubText}>Unable to play video from URL</Text>
        </View>
      )}

      {/* Controls overlay */}
      {showControls && !isLoading && !hasError && (
        <View style={styles.controlsOverlay}>
          {/* Center play/pause button */}
          <TouchableOpacity 
            style={styles.playButton}
            onPress={togglePlayPause}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isPaused ? 'play-circle' : 'pause-circle'} 
              size={60} 
              color="rgba(255, 255, 255, 0.9)" 
            />
          </TouchableOpacity>

          {/* Top controls */}
          <View style={styles.topControls}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            
            <Text style={styles.videoTitle} numberOfLines={1}>
              {(name as string) || 'Video'}
            </Text>
          </View>

          {/* Bottom controls */}
          <View style={styles.bottomControls}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={toggleMute}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isMuted ? 'volume-mute' : 'volume-high'} 
                size={24} 
                color="white" 
              />
            </TouchableOpacity>

            {/* Video info */}
            {videoSize && videoOrientation && (
              <View style={styles.videoInfo}>
                <Text style={styles.videoInfoText}>
                  {videoSize.width}×{videoSize.height}
                </Text>
                <Text style={styles.videoInfoText}>
                  {videoOrientation.isLandscape ? 'Landscape' : 'Portrait'} 
                  {videoOrientation.rotationNeeded !== 0 && ` (Rotated ${videoOrientation.rotationNeeded}°)`}
                </Text>
                <Text style={styles.videoInfoText}>
                  Ratio: {videoOrientation.aspectRatio.toFixed(2)}
                </Text>
                <Text style={styles.videoInfoText}>
                  Streaming: Direct URL
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoTouchArea: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultVideo: {
    width: '100%',
    height: '100%',
  },
  landscapeVideo: {
    width: '100%',
    height: '100%',
  },
  portraitVideo: {
    width: '100%',
    height: '100%',
  },
  landscapeOnPortraitVideo: {
    width: '100%',
    height: (screenWidth * 9) / 16,
    maxHeight: '100%',
  },
  portraitOnLandscapeVideo: {
    width: (screenHeight * 9) / 16,
    height: '100%',
    maxWidth: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorSubText: {
    color: '#ffcc02',
    fontSize: 14,
    textAlign: 'center',
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  topControls: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  videoTitle: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  controlButton: {
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
  },
  videoInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'flex-end',
    maxWidth: 200,
  },
  videoInfoText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
  },
});