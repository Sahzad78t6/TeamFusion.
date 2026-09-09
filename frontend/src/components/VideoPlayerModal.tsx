import React, { useEffect, useRef } from 'react';
import { X, Youtube } from 'lucide-react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface VideoPlayerModalProps {
  videoId: string;
  title: string;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ videoId, title, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  const destroyPlayer = () => {
    if (playerRef.current) {
      try {
        if (typeof playerRef.current.destroy === 'function') {
          playerRef.current.destroy();
        }
      } catch (e) {
        // Suppress player cleanup error
      }
      playerRef.current = null;
    }
  };

  const handleClose = () => {
    destroyPlayer();
    onClose();
  };

  useEffect(() => {
    let isMounted = true;

    const initPlayer = () => {
      if (!isMounted || !containerRef.current) return;
      destroyPlayer();

      if (window.YT && window.YT.Player) {
        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId: videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            rel: 0,
            modestbranding: 1,
            autoplay: 1,
          },
        });
      }
    };

    if (!window.YT) {
      const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = () => {
        if (isMounted) {
          initPlayer();
        }
      };
    } else {
      initPlayer();
    }

    return () => {
      isMounted = false;
      destroyPlayer();
    };
  }, [videoId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="fixed inset-0"
        onClick={handleClose}
        title="Close Video"
      />
      <div className="relative z-10 w-full max-w-4xl rounded-3xl bg-[#0c0e17] border border-white/10 p-5 md:p-6 shadow-2xl space-y-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
              <Youtube className="w-4 h-4" />
            </div>
            <h3 className="text-sm md:text-base font-bold text-white truncate" title={title}>
              {title}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors shrink-0"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Frame Container */}
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner">
          <div ref={containerRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
};
