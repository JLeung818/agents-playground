import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  useRoomContext,   // ⬅️ add this
} from "@livekit/components-react";
import { AnimatePresence, motion } from "framer-motion";
import { Inter } from "next/font/google";
import Head from "next/head";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PlaygroundConnect } from "@/components/PlaygroundConnect";
import Playground from "@/components/playground/Playground";
import { PlaygroundToast, ToastType } from "@/components/toast/PlaygroundToast";
import { ConfigProvider, useConfig } from "@/hooks/useConfig";
import {
  ConnectionMode,
  ConnectionProvider,
  useConnection,
} from "@/hooks/useConnection";
import { ToastProvider, useToast } from "@/components/toast/ToasterProvider";
import { RoomEvent } from "livekit-client";

const themeColors = [
  "cyan",
  "green",
  "amber",
  "blue",
  "violet",
  "rose",
  "pink",
  "teal",
];

const inter = Inter({ subsets: ["latin"] });
function ImageStream() {
  const room = useRoomContext();
  const [items, setItems] = useState<Array<{ src: string; caption?: string; ts: number }>>([]);

  useEffect(() => {
    if (!room) return;

    const handler = (
      payload: Uint8Array,
      _participant: any,
      _kind: any,
      topic?: string,
    ) => {
      // Your agent publishes images on topic "chat"
      if (topic && topic !== "chat") return;

      try {
        const text = new TextDecoder().decode(payload);
        const msg = JSON.parse(text);
        if (msg?.type === "assistant_image" && msg?.data_b64) {
          const mime = msg.mime || "image/jpeg";
          const src = `data:${mime};base64,${msg.data_b64}`;
          const caption = typeof msg.caption === "string" ? msg.caption : undefined;
          setItems(prev => [{ src, caption, ts: Date.now() }, ...prev].slice(0, 12));
        }
      } catch {
        /* ignore non-JSON payloads */
      }
    };

    // room.on("dataReceived", handler);
    // return () => {
    //   room.off("dataReceived", handler);
    // };
    console.log("[ImageStream] attaching RoomEvent.DataReceived listener");
     room.on(RoomEvent.DataReceived, handler);
    return () => {
      console.log("[ImageStream] detaching RoomEvent.DataReceived listener");
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room]);

  if (!items.length) return null;

  return (
    <div className="pointer-events-auto fixed bottom-20 left-4 right-4 z-40">
      <div className="flex gap-2 overflow-x-auto rounded-lg border border-white/10 bg-black/50 p-2 backdrop-blur">
        {items.map(it => (
          <div key={it.ts} className="shrink-0">
            <img
              src={it.src}
              alt={it.caption || "image"}
              className="h-28 w-auto rounded-md object-cover"
            />
            {it.caption && (
              <div className="mt-1 line-clamp-1 text-xs text-white/80">{it.caption}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DataLinkListener() {
  const room = useRoomContext();
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    if (!room) return;

    const onData = (
      payload: Uint8Array,
      _participant: any,
      _kind: any,
      topic?: string,
    ) => {
      // Only handle our chat topic
      if (topic && topic !== "chat") return;

      try {
        const text = new TextDecoder().decode(payload);
        let obj: any;
        try {
          obj = JSON.parse(text);
        } catch {
          obj = { text };
        }

        const raw: string = typeof obj?.text === "string" ? obj.text : text;

        // Find the first URL in the text (don't depend on a specific phrase)
        const m = raw.match(/https?:\/\/\S+/i);
        if (m) {
          // Trim trailing punctuation like ")" or "]" if present
          const url = m[0].replace(/[)>\]]+$/, "");
          console.log("[link] got URL via data channel:", url);

          // Best-effort: try to open a new tab
          // try {
          //   window.open(url, "_blank", "noopener,noreferrer");
          //   console.log("[DataLinkListener] Open button clicked:", link);
          // } catch {
          //   /* popup might be blocked */
          // }

          try {
            window.open(url, "_blank", "noopener,noreferrer");
           console.log("[DataLinkListener] attempted auto-open:", url);
          } catch {
             /* popup might be blocked */
           }

          // Always show a banner so user can click if popups are blocked
          // setLink(url);
          // console.log("[DataLinkListener] URL detected:", url);
          setLink(url);
          console.log("[DataLinkListener] URL detected, showing banner:", url);
        }
      } catch (e) {
        console.warn("[link] onData error:", e);
      }
    };

    // room.on("dataReceived", onData);
    // return () => room.off("dataReceived", onData);
    console.log("[DataLinkListener] attaching RoomEvent.DataReceived listener");
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      console.log("[DataLinkListener] detaching RoomEvent.DataReceived listener");
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room]);

  if (!link) return null;

  return (
    <div
      id="images-link-banner"
      className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between gap-3 rounded-md bg-black/85 px-3 py-2 text-white"
    >
      <span className="truncate">
        Images link ready:{" "}
        <a className="underline" href={link} target="_blank" rel="noopener noreferrer">
          {link}
        </a>
      </span>
      <div className="flex gap-2 shrink-0">
        {/* <button
          onClick={() => window.open(link, "_blank", "noopener,noreferrer")} */}
          <button
          onClick={() => {
            console.log("[DataLinkListener] Open button clicked:", link);
            window.open(link!, "_blank", "noopener,noreferrer");
          }}
          className="rounded bg-white/10 px-3 py-1 hover:bg-white/20"
        >
          Open
        </button>
        <button
          onClick={async () => {
            try {
              if ((window as any).isSecureContext && navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(link);
                console.log("[link] copied:", link);
              }
            } catch {
              /* ignore clipboard errors */
            }
          }}
          className="rounded bg-white/10 px-3 py-1 hover:bg-white/20"
        >
          Copy
        </button>
        <button
          onClick={() => setLink(null)}
          className="rounded bg-white/10 px-3 py-1 hover:bg-white/20"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <ConfigProvider>
        <ConnectionProvider>
          <HomeInner />
        </ConnectionProvider>
      </ConfigProvider>
    </ToastProvider>
  );
}

export function HomeInner() {
  const { shouldConnect, wsUrl, token, mode, connect, disconnect } =
    useConnection();

  const { config } = useConfig();
  const { toastMessage, setToastMessage } = useToast();

  const handleConnect = useCallback(
    async (c: boolean, mode: ConnectionMode) => {
      c ? connect(mode) : disconnect();
    },
    [connect, disconnect],
  );

  const showPG = useMemo(() => {
    if (process.env.NEXT_PUBLIC_LIVEKIT_URL) {
      return true;
    }
    if (wsUrl) {
      return true;
    }
    return false;
  }, [wsUrl]);

  return (
    <>
      <Head>
        <title>{config.title}</title>
        <meta name="description" content={config.description} />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta
          property="og:image"
          content="https://livekit.io/images/og/agents-playground.png"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="relative flex flex-col justify-center px-4 items-center h-full w-full bg-black repeating-square-background">
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              className="left-0 right-0 top-0 absolute z-10"
              initial={{ opacity: 0, translateY: -50 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: -50 }}
            >
              <PlaygroundToast />
            </motion.div>
          )}
        </AnimatePresence>
        {showPG ? (
        <LiveKitRoom
          className="flex flex-col h-full w-full"
          serverUrl={wsUrl}
          token={token}
          connect={shouldConnect}
          onError={(e) => {
            setToastMessage({ message: e.message, type: "error" });
            console.error(e);
          }}
        >
          <Playground
            themeColors={themeColors}
            onConnect={(c) => {
              const m = process.env.NEXT_PUBLIC_LIVEKIT_URL ? "env" : mode;
              handleConnect(c, m);
            }}
          />

          {/* Renders images sent by the agent via data channel */}
          <ImageStream />

          {/* Opens Google Images links sent by the agent */}
          <DataLinkListener />

          <RoomAudioRenderer />
          <StartAudio label="Click to enable audio playback" />
        </LiveKitRoom>
        ) : (
          <PlaygroundConnect
            accentColor={themeColors[0]}
            onConnectClicked={(mode) => {
              handleConnect(true, mode);
            }}
          />
        )}
                {/* VA deployment marker */}
        <div
          id="va-marker"
          className="fixed bottom-2 right-2 z-50 rounded-md bg-white/10 px-2 py-1 text-[11px] font-medium text-white"
        >
          VA custom build — hello from your edited page
        </div>
      </main>
    </>
  );
}
