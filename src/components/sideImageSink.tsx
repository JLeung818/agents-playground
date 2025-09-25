'use client';

import React, { useEffect, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import ImagePane from './ImagePane'; // adjust path if your ImagePane lives elsewhere

export default function SideImageSink() {
  const room = useRoomContext();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);

  useEffect(() => {
    if (!room) return;
    const decoder = new TextDecoder();

    const onData = (payload: Uint8Array) => {
      try {
        const txt = decoder.decode(payload).trim();

        // Plain URL without JSON
        if (/^https?:\/\/.+/i.test(txt) && !txt.startsWith('{')) {
          setImageData(null);
          setImageUrl(txt);
          return;
        }

        // JSON envelope { type: "image", url?: string, data?: string }
        const obj = JSON.parse(txt);
        if (obj?.type === 'image') {
          if (typeof obj.url === 'string') {
            setImageData(null);
            setImageUrl(obj.url);
          } else if (typeof obj.data === 'string') {
            setImageUrl(null);
            setImageData(obj.data); // expected data URL: data:image/png;base64,...
          }
        }
      } catch {
        // ignore non-image payloads
      }
    };

    room.on(RoomEvent.DataReceived, onData);
    return () => room.off(RoomEvent.DataReceived, onData);
  }, [room]);

  return (
    <div style={{ width: 360, minWidth: 280, maxWidth: 480, borderLeft: '1px solid #222' }}>
      <ImagePane imageUrl={imageUrl} imageData={imageData} onSetUrl={setImageUrl} />
    </div>
  );
}