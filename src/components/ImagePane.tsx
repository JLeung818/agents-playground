'use client';
import React from 'react';

type Props = {
  imageUrl?: string | null;
  imageData?: string | null; // base64 (no data: prefix needed)
  sending?: boolean;
  onSetUrl?: (url: string) => void;
};

export default function ImagePane({ imageUrl, imageData, sending, onSetUrl }: Props) {
  const [url, setUrl] = React.useState('');

  const src = imageData
    ? `data:image/png;base64,${imageData}`
    : (imageUrl || null);

  return (
    <aside style={{
      borderLeft: '1px solid #e5e7eb',
      padding: 12,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      minWidth: 320,
      maxWidth: 420,
    }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Picture</h3>

      <div style={{
        border: '1px dashed #d1d5db',
        borderRadius: 8,
        padding: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 240,
        background: '#fafafa',
      }}>
        {src
          ? <img
              src={src}
              alt="assistant-visual"
              style={{ maxWidth: '100%', maxHeight: 360, borderRadius: 6 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          : <span style={{ color: '#6b7280' }}>No image yet</span>}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Paste an image URL…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 10px' }}
        />
        <button
          onClick={() => { if (onSetUrl && url.trim()) onSetUrl(url.trim()); }}
          disabled={sending}
          style={{
            border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px',
            background: sending ? '#e5e7eb' : '#fff', cursor: sending ? 'not-allowed' : 'pointer',
          }}
        >
          Show
        </button>
      </div>

      <p style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
        Tip: send <code>{'{ "type":"image", "url":"https://…" }'}</code> or
        <code>{' { "type":"image", "data":"<base64>" } '}</code> on the data channel.
      </p>
    </aside>
  );
}