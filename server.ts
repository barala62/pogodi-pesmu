import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { ALL_BALKAN_SONGS } from './src/data/songs/balkanSongs';
import { Song, SongPreviewResponse } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory cache for resolved previews
const previewCache = new Map<string, SongPreviewResponse>();

// Clean query terms for search engines
function sanitizeSearchQuery(str: string): string {
  return str
    .replace(/[čć]/g, 'c')
    .replace(/đ/g, 'dj')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/['"()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Generate candidate queries for a song
function getCandidateQueries(song: Song): string[] {
  const queries: string[] = [];
  
  if (song.previewQuery) {
    queries.push(sanitizeSearchQuery(song.previewQuery));
  }
  
  // Artist + Title
  queries.push(sanitizeSearchQuery(`${song.artist} ${song.title}`));
  
  // First main artist + Title (split & or feat)
  const mainArtist = song.artist.split(/&|,|feat\.|ft\./i)[0].trim();
  if (mainArtist !== song.artist) {
    queries.push(sanitizeSearchQuery(`${mainArtist} ${song.title}`));
  }
  
  // Title + Artist
  queries.push(sanitizeSearchQuery(`${song.title} ${mainArtist}`));

  // Unique list
  return Array.from(new Set(queries));
}

// Fetch from Deezer API
async function fetchDeezerPreview(query: string): Promise<{ previewUrl: string; coverUrl: string; albumTitle?: string } | null> {
  try {
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=5`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const data = await res.json() as { data?: Array<{ preview?: string; album?: { cover_medium?: string; cover_big?: string; title?: string } }> };
    
    if (data?.data && data.data.length > 0) {
      for (const track of data.data) {
        if (track.preview) {
          return {
            previewUrl: track.preview,
            coverUrl: track.album?.cover_big || track.album?.cover_medium || '',
            albumTitle: track.album?.title
          };
        }
      }
    }
    return null;
  } catch (err) {
    console.warn(`Deezer fetch error for query "${query}":`, err);
    return null;
  }
}

// Fetch from iTunes API as fallback
async function fetchItunesPreview(query: string): Promise<{ previewUrl: string; coverUrl: string; albumTitle?: string } | null> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=5`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const data = await res.json() as { results?: Array<{ previewUrl?: string; artworkUrl100?: string; collectionName?: string }> };
    
    if (data?.results && data.results.length > 0) {
      for (const track of data.results) {
        if (track.previewUrl) {
          // Upgrade artwork size if available (replace 100x100bb with 600x600bb)
          const highResCover = track.artworkUrl100 ? track.artworkUrl100.replace('100x100bb', '600x600bb') : '';
          return {
            previewUrl: track.previewUrl,
            coverUrl: highResCover,
            albumTitle: track.collectionName
          };
        }
      }
    }
    return null;
  } catch (err) {
    console.warn(`iTunes fetch error for query "${query}":`, err);
    return null;
  }
}

// API: Song List for autocomplete
app.get('/api/songs', (req, res) => {
  const songs = ALL_BALKAN_SONGS.map(s => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    year: s.year,
    genre: s.genre,
    album: s.album,
    searchTerms: s.searchTerms
  }));
  res.json({ total: songs.length, songs });
});

// API: Audio Proxy to bypass CORS / iframe restrictions & provide Range support
app.get('/api/proxy/audio', async (req, res) => {
  const audioUrl = req.query.url as string;
  if (!audioUrl) {
    res.status(400).send('Missing audio URL parameter');
    return;
  }

  try {
    const parsed = new URL(audioUrl);
    // Only allow streaming from deezer or apple/itunes CDNs
    const allowedHosts = ['deezer.com', 'dzcdn.net', 'itunes.apple.com', 'apple.com', 'mzstatic.com', 'akamaihd.net'];
    const isAllowed = allowedHosts.some(host => parsed.hostname.endsWith(host));
    if (!isAllowed) {
      res.status(403).send('Audio host not allowed');
      return;
    }

    const rangeHeader = req.headers.range;
    const forwardHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    };
    if (rangeHeader) {
      forwardHeaders['Range'] = rangeHeader;
    }

    const audioRes = await fetch(audioUrl, { headers: forwardHeaders });
    if (!audioRes.ok && audioRes.status !== 206) {
      res.status(audioRes.status).send('Failed to fetch upstream audio');
      return;
    }

    res.status(audioRes.status);
    const contentType = audioRes.headers.get('content-type') || 'audio/mpeg';
    const contentLength = audioRes.headers.get('content-length');
    const contentRange = audioRes.headers.get('content-range');
    const acceptRanges = audioRes.headers.get('accept-ranges') || 'bytes';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', acceptRanges);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);

    if (audioRes.body) {
      // Stream chunks to client
      // @ts-ignore Node 18+ Web ReadableStream to Node Writable
      const reader = audioRes.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      };
      await pump();
    } else {
      const buffer = await audioRes.arrayBuffer();
      res.send(Buffer.from(buffer));
    }
  } catch (err) {
    console.error('Audio proxy error:', err);
    if (!res.headersSent) {
      res.status(500).send('Internal audio proxy error');
    }
  }
});

// API: Preview endpoint for a song ID
app.get('/api/preview/:songId', async (req, res) => {
  const { songId } = req.params;
  const song = ALL_BALKAN_SONGS.find(s => s.id === songId);

  if (!song) {
    res.status(404).json({ error: 'Song not found' });
    return;
  }

  // Check cache
  if (previewCache.has(songId)) {
    res.json(previewCache.get(songId));
    return;
  }

  const queries = getCandidateQueries(song);
  let resolvedPreview: { previewUrl: string; coverUrl: string; albumTitle?: string } | null = null;
  let source: 'deezer' | 'itunes' | 'synth' = 'synth';

  // 1. Try Deezer first
  for (const q of queries) {
    const deezerResult = await fetchDeezerPreview(q);
    if (deezerResult) {
      resolvedPreview = deezerResult;
      source = 'deezer';
      break;
    }
  }

  // 2. Try iTunes as fallback
  if (!resolvedPreview) {
    for (const q of queries) {
      const itunesResult = await fetchItunesPreview(q);
      if (itunesResult) {
        resolvedPreview = itunesResult;
        source = 'itunes';
        break;
      }
    }
  }

  const response: SongPreviewResponse = {
    songId: song.id,
    title: song.title,
    artist: song.artist,
    year: song.year,
    genre: song.genre,
    album: resolvedPreview?.albumTitle || song.album,
    coverUrl: resolvedPreview?.coverUrl || '',
    previewUrl: resolvedPreview?.previewUrl ? `/api/proxy/audio?url=${encodeURIComponent(resolvedPreview.previewUrl)}` : '',
    directPreviewUrl: resolvedPreview?.previewUrl || '',
    source: resolvedPreview ? source : 'synth',
    startOffset: song.startOffset || 0
  };

  // Cache result
  previewCache.set(songId, response);
  res.json(response);
});

async function startServer() {
  // Vite middleware in dev mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pogodi Pesmu server running on port ${PORT}`);
  });
}

startServer();
