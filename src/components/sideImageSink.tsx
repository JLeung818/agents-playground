'use client';

import React, { useEffect, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';

type ImagePayload =
  | { type?: 'image'; url?: string; data?: string; base64?: string; mime?: string }
  | string;

/**
 * Listens for LiveKit data-channel messages carrying images and renders them
 * in a right-side pane. Supports:
 *  - topic: "image" | "visual" | "visuals"
 *  - plain URL strings
 *  - JSON: { type: "image", url } or { type: "image", data/base64, mime? }
 */
export default function SideImageSink() {
  const room = useRoomContext();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);

  useEffect(() => {
    if (!room) return;

    const decoder = new TextDecoder('utf-8');

    const onData = (
      payload: Uint8Array,
      _participant?: any,
      _kind?: any,
      topic?: string,
    ) => {
      try {
        // If publisher set a topic, only accept our image topics
        if (topic && !['image', 'visual', 'visuals'].includes(topic)) return;

        const txt = decoder.decode(payload).trim();

        // Case 1: direct URL (non-JSON)
        if (/^https?:\/\/\S+/i.test(txt) && !txt.startsWith('{')) {
          setImageData(null);
          setImageUrl(txt);
          return;
        }

        // Case 2: JSON envelope or raw string inside JSON
        const obj: ImagePayload = JSON.parse(txt);

        if (typeof obj === 'string') {
          if (/^https?:\/\/\S+/i.test(obj)) {
            setImageData(null);
            setImageUrl(obj);
          }
          return;
        }

        // Default to "image" if not specified
        const isImage = obj.type ? obj.type === 'image' : true;

        if (!isImage) return;

        if (obj.url && typeof obj.url === 'string') {
          setImageData(null);
          setImageUrl(obj.url);
          return;
        }

        const dataField = obj.data ?? obj.base64;
        if (dataField && typeof dataField === 'string') {
          // Ensure we have a proper data URL if only base64 bytes are sent
          const maybeMime = obj.mime ?? (dataField.startsWith('data:') ? undefined : 'image/png');
          const asDataUrl = dataField.startsWith('data:')
            ? dataField
            : `data:${maybeMime};base64,${dataField}`;
          setImageUrl(null);
          setImageData(asDataUrl);
        }
      } catch {
        // ignore parse/shape errors silently
      }
    };

    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room]);

  const containerStyle: React.CSSProperties = {
    width: 360,
    minWidth: 280,
    maxWidth: 480,
    borderLeft: '1px solid #222',
    padding: 12,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (!imageUrl && !imageData) {
    return (
      <aside style={containerStyle}>
        <span style={{ color: '#888', fontSize: 14 }}>No image yet</span>
      </aside>
    );
  }

  return (
    <aside style={containerStyle}>
      <img
        src={imageData ?? imageUrl ?? ''}
        alt="context image"
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          maxHeight: '100%',
          objectFit: 'contain',
          borderRadius: 8,
        }}
      />
    </aside>
  );
}