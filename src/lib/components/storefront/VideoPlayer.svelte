<script lang="ts">
  /**
   * Muted, looping YouTube player driven by our own controls instead of YouTube's (so its share /
   * watch-later buttons are not reachable). Fills its positioned parent. A transparent tap layer sits
   * on top: it lets swipes scroll the page and toggles pause on tap.
   *
   * The parent owns `muted` / `paused` and draws the mute button and progress bar; playback time is
   * reported through `onProgress`, and `seek()` jumps to a point (0–1).
   *
   * YouTube always shows its own chrome (title, Share, Watch later) while a video starts and while it is
   * paused, and there is no embed option to turn it off. So the thumbnail covers the player in those
   * states and is lifted only once the video has been playing long enough for that chrome to fade.
   */
  import { onMount } from 'svelte';
  import { reelEmbedUrl, videoThumb, youTubeCommand, YOUTUBE_ORIGIN, type VideoSource } from '$lib/utils/video';

  let {
    source,
    title,
    active = true,
    muted,
    paused,
    onTogglePause,
    onProgress
  }: {
    source: VideoSource;
    title: string;
    /** Only an active player loads YouTube; inactive ones show the thumbnail. */
    active?: boolean;
    muted: boolean;
    paused: boolean;
    onTogglePause: () => void;
    onProgress?: (currentTime: number, duration: number) => void;
  } = $props();

  let frame = $state<HTMLIFrameElement | null>(null);
  let duration = 0;

  // Covered by the thumbnail until YouTube's start-up / pause chrome has faded
  const CHROME_FADE_MS = 3000;
  let revealed = $state(false);
  let revealTimer: ReturnType<typeof setTimeout> | undefined;
  let heardFromPlayer = false;
  let lastTime = 0;
  function onPlayerState(state: number) {
    if (state === 1) {
      // playing: reveal once the chrome has had time to fade
      if (!revealed && !revealTimer) revealTimer = setTimeout(() => { revealed = true; revealTimer = undefined; }, CHROME_FADE_MS);
    } else if (state === 2 || state === -1 || state === 5) {
      // paused / not started: YouTube's chrome is showing — cover it
      clearTimeout(revealTimer);
      revealTimer = undefined;
      revealed = false;
    }
  }

  function send(func: string, args: unknown[] = []) {
    frame?.contentWindow?.postMessage(youTubeCommand(func, args), YOUTUBE_ORIGIN);
  }

  function applyState() {
    send(muted ? 'mute' : 'unMute');
    send(paused ? 'pauseVideo' : 'playVideo');
  }

  // Push mute / pause changes to the player
  $effect(() => {
    if (active && frame) applyState();
  });

  // A player that stops being active starts from scratch next time
  $effect(() => {
    if (!active) {
      duration = 0;
      lastTime = 0;
      heardFromPlayer = false;
      clearTimeout(revealTimer);
      revealTimer = undefined;
      revealed = false;
    }
  });
  // Cover immediately on pause rather than waiting for YouTube to report it
  $effect(() => {
    if (paused) onPlayerState(2);
  });

  function onFrameLoad() {
    // Ask YouTube to send player events (onReady, playback time) to this page. Repeated because
    // the player may not be listening yet when the frame's load event fires.
    for (const delay of [0, 400, 1000, 2000]) {
      setTimeout(() => {
        frame?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: title }), YOUTUBE_ORIGIN);
      }, delay);
    }
    // Fallback in case the ready event is missed
    setTimeout(applyState, 1200);
    // Never leave the video covered if YouTube sends no player events at all
    setTimeout(() => {
      if (!heardFromPlayer && !paused) revealed = true;
    }, 6000);
  }

  function onMessage(e: MessageEvent) {
    if (e.origin !== YOUTUBE_ORIGIN || !frame || e.source !== frame.contentWindow) return;
    let payload: { event?: string; info?: number | { currentTime?: number; duration?: number; playerState?: number } } | null = null;
    try {
      payload = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    } catch {
      return;
    }
    heardFromPlayer = true;
    if (payload?.event === 'onReady' || payload?.event === 'initialDelivery') applyState();
    const info = payload?.info;
    if (payload?.event === 'onStateChange' && typeof info === 'number') onPlayerState(info);
    if (info && typeof info === 'object') {
      if (typeof info.playerState === 'number') onPlayerState(info.playerState);
      if (typeof info.duration === 'number' && info.duration > 0) duration = info.duration;
      if (typeof info.currentTime === 'number') {
        // Time moving forward means it is playing, even if no state event arrived
        if (info.currentTime > lastTime && !paused) onPlayerState(1);
        lastTime = info.currentTime;
        onProgress?.(info.currentTime, duration);
      }
    }
  }

  /** Jump to a point in the video, as a fraction 0–1 of its length. */
  export function seek(fraction: number) {
    if (duration <= 0) return;
    const to = Math.max(0, Math.min(1, fraction)) * duration;
    onProgress?.(to, duration);
    send('seekTo', [to, true]);
  }

  onMount(() => {
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      clearTimeout(revealTimer);
    };
  });
</script>

<div class="vp">
  {#if active}
    <iframe
      bind:this={frame}
      src={reelEmbedUrl(source)}
      {title}
      class="vp-frame"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      onload={onFrameLoad}
    ></iframe>
  {/if}
  <!-- Thumbnail over the player while it starts or is paused, hiding YouTube's own buttons -->
  <img
    src={videoThumb(source)}
    alt=""
    class="vp-poster"
    class:vp-poster--hidden={active && revealed && !paused}
    loading="lazy"
  />
  <button class="vp-tap" onclick={onTogglePause} aria-label={paused && active ? 'Play video' : 'Pause video'}>
    {#if active && paused}
      <span class="vp-paused" aria-hidden="true">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </span>
    {:else if active && !revealed}
      <span class="vp-spinner" aria-label="Loading video"></span>
    {/if}
  </button>
</div>

<style>
  .vp,
  .vp-poster,
  .vp-frame,
  .vp-tap {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .vp { background: #000; overflow: hidden; }
  .vp-poster {
    object-fit: cover;
    filter: brightness(0.75);
    transition: opacity 0.3s ease;
  }
  .vp-poster--hidden { opacity: 0; }
  .vp-frame {
    border: 0;
    background: transparent;
    pointer-events: none; /* the tap layer handles gestures */
  }
  .vp-tap {
    z-index: 1;
    background: transparent;
    border: 0;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-tap-highlight-color: transparent;
  }
  .vp-spinner {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    animation: vp-spin 0.8s linear infinite;
  }
  @keyframes vp-spin { to { transform: rotate(360deg); } }
  .vp-paused {
    color: rgba(255, 255, 255, 0.85);
    filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5));
  }
</style>
