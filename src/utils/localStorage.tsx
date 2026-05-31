import * as FileSystem from "expo-file-system";

const CACHE_DIRECTORY = FileSystem.documentDirectory + 'media_cache/';
const MAX_CACHE_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_FILE_AGE = 24 * 60 * 60 * 1000; // 24 hours

// สร้างโฟลเดอร์ cache ถ้ายังไม่มี
const ensureCacheDirectory = async () => {
  const cacheInfo = await FileSystem.getInfoAsync(CACHE_DIRECTORY);
  if (!cacheInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIRECTORY, { intermediates: true });
  }
};

// ทำความสะอาดไฟล์เก่า
const cleanupOldFiles = async () => {
  try {
    await ensureCacheDirectory();
    const files = await FileSystem.readDirectoryAsync(CACHE_DIRECTORY);
    const now = Date.now();
    
    for (const fileName of files) {
      const filePath = CACHE_DIRECTORY + fileName;
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      
      if (fileInfo.exists && fileInfo.modificationTime) {
        const fileAge = now - fileInfo.modificationTime * 1000;
        if (fileAge > MAX_FILE_AGE) {
          await FileSystem.deleteAsync(filePath);
          console.log(`Deleted old cache file: ${fileName}`);
        }
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

// ตรวจสอบขนาดของ cache
const checkCacheSize = async () => {
  try {
    await ensureCacheDirectory();
    const files = await FileSystem.readDirectoryAsync(CACHE_DIRECTORY);
    let totalSize = 0;
    
    for (const fileName of files) {
      const filePath = CACHE_DIRECTORY + fileName;
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists && fileInfo.size) {
        totalSize += fileInfo.size;
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error('Check cache size error:', error);
    return 0;
  }
};

// ดาวน์โหลดไฟล์สื่อ
export const downloadMediaFile = async (url: string, fileName?: string): Promise<string | null> => {
  try {
    await ensureCacheDirectory();
    await cleanupOldFiles();
    
    // ตรวจสอบว่ามีไฟล์อยู่แล้วหรือไม่
    const finalFileName = fileName || `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`;
    const fileUri = CACHE_DIRECTORY + finalFileName;
    const existingFile = await FileSystem.getInfoAsync(fileUri);
    
    if (existingFile.exists) {
      console.log('File already cached:', fileUri);
      return fileUri;
    }
    
    // ตรวจสอบขนาด cache
    const currentCacheSize = await checkCacheSize();
    if (currentCacheSize > MAX_CACHE_SIZE) {
      console.log('Cache size exceeded, cleaning up...');
      await cleanupCache();
    }
    
    console.log('Downloading media file:', url);
    const downloadResult = await FileSystem.downloadAsync(url, fileUri);
    
    if (downloadResult.status === 200) {
      console.log('Downloaded successfully to:', downloadResult.uri);
      return downloadResult.uri;
    } else {
      console.error('Download failed with status:', downloadResult.status);
      return null;
    }
    
  } catch (error) {
    console.error('Download error:', error);
    return null;
  }
};

// ทำความสะอาด cache ทั้งหมด
export const cleanupCache = async () => {
  try {
    await ensureCacheDirectory();
    const files = await FileSystem.readDirectoryAsync(CACHE_DIRECTORY);
    
    for (const fileName of files) {
      const filePath = CACHE_DIRECTORY + fileName;
      await FileSystem.deleteAsync(filePath);
    }
    
    console.log('Cache cleaned up');
  } catch (error) {
    console.error('Cleanup cache error:', error);
  }
};

// ลบไฟล์เฉพาะ
export const deleteMediaFile = async (fileUri: string) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(fileUri);
      console.log('Deleted file:', fileUri);
    }
  } catch (error) {
    console.error('Delete file error:', error);
  }
};

// ดูข้อมูล cache
export const getCacheInfo = async () => {
  try {
    await ensureCacheDirectory();
    const files = await FileSystem.readDirectoryAsync(CACHE_DIRECTORY);
    const totalSize = await checkCacheSize();
    
    return {
      fileCount: files.length,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    };
  } catch (error) {
    console.error('Get cache info error:', error);
    return { fileCount: 0, totalSize: 0, totalSizeMB: '0' };
  }
};