import { ALL_BALKAN_SONGS, normalizeText } from '../src/data/songs/balkanSongs';
import { Song } from '../src/types';

interface AuditResult {
  song: Song;
  status: 'ok' | 'live_detected' | 'wrong_title' | 'no_preview' | 'typo_suspected';
  details: string;
  foundTitle?: string;
  foundArtist?: string;
  foundAlbum?: string;
  previewUrl?: string;
}

// Clean string for fuzzy matching
function cleanForMatch(str: string): string {
  return str.toLowerCase()
    .replace(/[čć]/g, 'c')
    .replace(/đ/g, 'dj')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/[^a-z0-9]/g, '');
}

const LIVE_REGEX = /\b(live|uzivo|uživo|koncert|concert|arena|turneja|bez struje|in concert|at lisinski|hala tivoli|live in|live at|live 20\d\d)\b/i;
const GARBAGE_REGEX = /\b(tribute|karaoke|instrumental|cover|backing track)\b/i;

async function checkSongDeezer(song: Song): Promise<AuditResult> {
  const q = song.previewQuery || `${song.artist} ${song.title}`;
  const url = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=10`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) {
      return { song, status: 'no_preview', details: `Deezer HTTP ${res.status}` };
    }
    const data = await res.json() as any;
    const tracks = data.data || [];

    if (tracks.length === 0) {
      return { song, status: 'no_preview', details: 'Deezer returned 0 tracks' };
    }

    // Score candidates to find best studio match
    const targetCleanTitle = cleanForMatch(song.title);
    const targetCleanArtist = cleanForMatch(song.artist);

    // Check what naive [0] returned vs best studio candidate
    const topTrack = tracks[0];
    const isTopLive = LIVE_REGEX.test(topTrack.title) || LIVE_REGEX.test(topTrack.album?.title || '');
    const topCleanTitle = cleanForMatch(topTrack.title);
    const topCleanArtist = cleanForMatch(topTrack.artist?.name || '');

    // Look for studio candidates in the returned list
    const studioCandidate = tracks.find((t: any) => {
      const isLive = LIVE_REGEX.test(t.title) || LIVE_REGEX.test(t.album?.title || '');
      const isGarbage = GARBAGE_REGEX.test(t.title) || GARBAGE_REGEX.test(t.artist?.name || '');
      const cleanT = cleanForMatch(t.title);
      const titleMatches = cleanT.includes(targetCleanTitle) || targetCleanTitle.includes(cleanT);
      return !isLive && !isGarbage && titleMatches && t.preview;
    });

    if (isTopLive) {
      return {
        song,
        status: 'live_detected',
        details: studioCandidate 
          ? `Top result was LIVE ("${topTrack.title}"), but studio version exists in candidate list ("${studioCandidate.title}")`
          : `Top result was LIVE ("${topTrack.title}") and no studio candidate found in top 10`,
        foundTitle: topTrack.title,
        foundArtist: topTrack.artist?.name,
        foundAlbum: topTrack.album?.title,
        previewUrl: studioCandidate?.preview || topTrack.preview
      };
    }

    const titleMatches = topCleanTitle.includes(targetCleanTitle) || targetCleanTitle.includes(topCleanTitle);
    if (!titleMatches) {
      if (studioCandidate) {
        return {
          song,
          status: 'wrong_title',
          details: `Top result is wrong ("${topTrack.title}"), but studio match found in results: "${studioCandidate.title}"`,
          foundTitle: studioCandidate.title,
          foundArtist: studioCandidate.artist?.name,
          foundAlbum: studioCandidate.album?.title,
          previewUrl: studioCandidate.preview
        };
      } else {
        return {
          song,
          status: 'typo_suspected',
          details: `Neither top result ("${topTrack.title}") nor any candidate matched target "${song.title}"`,
          foundTitle: topTrack.title,
          foundArtist: topTrack.artist?.name
        };
      }
    }

    return {
      song,
      status: 'ok',
      details: 'Studio match verified',
      foundTitle: topTrack.title,
      foundArtist: topTrack.artist?.name,
      foundAlbum: topTrack.album?.title,
      previewUrl: topTrack.preview
    };
  } catch (err: any) {
    return { song, status: 'no_preview', details: `Network error: ${err.message}` };
  }
}

async function runAudit() {
  console.log(`Starting scan of ${ALL_BALKAN_SONGS.length} songs...`);

  // Batch process with concurrency of 5 to respect rate limits
  const results: AuditResult[] = [];
  const BATCH_SIZE = 6;

  for (let i = 0; i < ALL_BALKAN_SONGS.length; i += BATCH_SIZE) {
    const batch = ALL_BALKAN_SONGS.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(checkSongDeezer));
    results.push(...batchResults);

    const issues = batchResults.filter(r => r.status !== 'ok');
    if (issues.length > 0) {
      issues.forEach(iss => {
        console.log(`[${iss.status.toUpperCase()}] ${iss.song.id}: ${iss.song.artist} - ${iss.song.title} -> ${iss.details}`);
      });
    }

    if ((i + BATCH_SIZE) % 60 === 0 || i + BATCH_SIZE >= ALL_BALKAN_SONGS.length) {
      console.log(`Processed ${Math.min(i + BATCH_SIZE, ALL_BALKAN_SONGS.length)} / ${ALL_BALKAN_SONGS.length} songs...`);
    }

    // Small delay between batches to stay under rate limit
    await new Promise(r => setTimeout(r, 200));
  }

  const liveDetected = results.filter(r => r.status === 'live_detected');
  const wrongTitle = results.filter(r => r.status === 'wrong_title');
  const typoSuspected = results.filter(r => r.status === 'typo_suspected');
  const noPreview = results.filter(r => r.status === 'no_preview');

  console.log('\n=== AUDIT COMPLETE ===');
  console.log('Total Songs:', results.length);
  console.log('Verified OK:', results.filter(r => r.status === 'ok').length);
  console.log('Live Recordings Detected at top:', liveDetected.length);
  console.log('Wrong Title at top (studio found deeper in results):', wrongTitle.length);
  console.log('Typo or Not Found on Deezer:', typoSuspected.length);
  console.log('No preview tracks returned:', noPreview.length);

  // Write detailed report to audit_report.json
  const fs = await import('fs');
  fs.writeFileSync('audit_report.json', JSON.stringify({
    summary: {
      total: results.length,
      ok: results.filter(r => r.status === 'ok').length,
      liveDetected: liveDetected.length,
      wrongTitle: wrongTitle.length,
      typoSuspected: typoSuspected.length,
      noPreview: noPreview.length
    },
    liveDetected,
    wrongTitle,
    typoSuspected,
    noPreview
  }, null, 2));

  console.log('Report saved to audit_report.json');
}

runAudit();
