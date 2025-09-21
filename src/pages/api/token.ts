import type { NextApiRequest, NextApiResponse } from "next";
import { generateRandomAlphanumeric } from "@/lib/util";

import { AccessToken } from "livekit-server-sdk";
import type { AccessTokenOptions, VideoGrant } from "livekit-server-sdk";
import type { TokenResult } from "../../lib/types";

// IMPORTANT: do NOT import anything from @livekit/protocol here.
// Vercel can hoist / dedupe deps and cause type mismatches between protocol versions.

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

function parseAttributes(input: unknown): Record<string, string> | undefined {
  if (!input) return undefined;

  // If it's already an object, coerce string values.
  if (typeof input === "object" && !Array.isArray(input)) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (v === undefined || v === null) continue;
      out[k] = String(v);
    }
    return Object.keys(out).length ? out : undefined;
  }

  // If it's a string, try JSON.parse; otherwise return undefined.
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return undefined;
    try {
      const parsed = JSON.parse(trimmed);
      return parseAttributes(parsed);
    } catch {
      // treat as a single attribute blob under "raw"
      return { raw: trimmed };
    }
  }

  return undefined;
}

const createToken = (
  userInfo: AccessTokenOptions,
  grant: VideoGrant,
  agentName?: string,
) => {
  const at = new AccessToken(apiKey, apiSecret, userInfo);
  at.addGrant(grant);

  // Avoid RoomConfiguration/RoomAgentDispatch classes to prevent protocol type conflicts on Vercel
  if (agentName) {
    (at as any).roomConfig = {
      agents: [
        {
          agentName,
          // attach any metadata your agent needs
          metadata: JSON.stringify({ user_id: userInfo.identity }),
        },
      ],
    };
  }

  return at.toJwt();
};

export default async function handleToken(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      res.status(405).end("Method Not Allowed");
      return;
    }
    if (!apiKey || !apiSecret) {
      res.statusMessage = "LIVEKIT_API_KEY / LIVEKIT_API_SECRET not configured";
      res.status(500).end();
      return;
    }

    const {
      roomName: roomNameFromBody,
      participantName: participantNameFromBody,
      participantId: participantIdFromBody,
      metadata: metadataFromBody,
      attributes: attributesFromBody,
      agentName: agentNameFromBody,
    } = req.body ?? {};

    const roomName =
      (roomNameFromBody as string) ||
      `room-${generateRandomAlphanumeric(4)}-${generateRandomAlphanumeric(4)}`;

    const identity =
      (participantIdFromBody as string) ||
      `identity-${generateRandomAlphanumeric(4)}`;

    const participantName =
      (participantNameFromBody as string) || identity;

    const metadata = (metadataFromBody as string | undefined) ?? undefined;
    const attributes = parseAttributes(attributesFromBody);

    const agentName = (agentNameFromBody as string | undefined) || undefined;

    const grant: VideoGrant = {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
      canUpdateOwnMetadata: true,
    };

    const token = createToken(
      { identity, metadata, attributes, name: participantName },
      grant,
      agentName,
    );

    const result: TokenResult = {
      identity,
      accessToken: token,
    };

    res.status(200).json(result);
  } catch (e) {
    res.statusMessage = (e as Error).message;
    res.status(500).end();
  }
}
