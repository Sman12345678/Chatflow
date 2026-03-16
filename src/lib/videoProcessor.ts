import type { VideoMetadata } from '@/types';

const SUPPORTED_PLATFORMS = {
  youtube: /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu\.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/,
  facebook: /^(https?:\/\/)?((?:www|m|web)\.)?(facebook|fb)\.(com|watch)\/.*$/,
  instagram: /^(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)\/(?:p|reel)\/([A-Za-z0-9\-_]+)/,
  tiktok: /^(https?:\/\/)?((?:www|m|vm|vt)\.)?tiktok\.com\/.*$/i,
  twitter: /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/
};

const VIDEO_EXPIRY_MINUTES = 10;
const RATE_LIMIT_PER_MINUTE = 1;
const videoDownloadStats = new Map<string, { lastTime: number; count: number; resetTime: number }>();

export function detectVideoUrl(text: string): { url: string; platform: string } | null {
  for (const [platform, regex] of Object.entries(SUPPORTED_PLATFORMS)) {
    const match = text.match(new RegExp(regex.source, 'i'));
    if (match) {
      return { url: match[0], platform };
    }
  }
  return null;
}

export async function getVideoData(url: string): Promise<any> {
  const encodedUrl = encodeURIComponent(url);
  const res = await fetch(`https://dev-priyanshi.onrender.com/api/alldl?url=${encodedUrl}`, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  
  if (!res.ok) throw new Error('Failed to fetch video');
  
  const json = await res.json();
  if (!json.status || !json.data) throw new Error('Invalid response');
  
  return json.data;
}

export function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const stats = videoDownloadStats.get(userId);
  
  if (!stats) {
    videoDownloadStats.set(userId, {
      lastTime: now,
      count: 1,
      resetTime: now + 60000
    });
    return { allowed: true };
  }
  
  if (now > stats.resetTime) {
    stats.count = 1;
    stats.resetTime = now + 60000;
    return { allowed: true };
  }
  
  if (stats.count >= RATE_LIMIT_PER_MINUTE) {
    const retryAfter = Math.ceil((stats.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  stats.count++;
  return { allowed: true };
}

export async function createVideoMessage(url: string, platform: string, userId: string): Promise<VideoMetadata> {
  const { allowed, retryAfter } = checkRateLimit(userId);
  if (!allowed) {
    throw new Error(`Rate limited. Try again in ${retryAfter}s`);
  }

  const data = await getVideoData(url);

  return {
    platform: platform as any,
    title: data.title || 'Video',
    thumbnail: data.thumbnail || '',
    downloadUrl: data.high || data.low || url,
    originalUrl: url,
    expiresAt: new Date(Date.now() + VIDEO_EXPIRY_MINUTES * 60000)
  };
}
