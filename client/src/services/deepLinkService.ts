import * as Linking from 'expo-linking';

/**
 * Extracts an 8-character invite code from a URL or deep link:
 * - roamie://join?code=GOAC8F6C
 * - roamie://join/GOAC8F6C
 * - https://roamie.app/join?code=GOAC8F6C
 */
export function extractInviteCode(url: string): string | null {
  try {
    const parsed = Linking.parse(url);

    // Query param: ?code=XYZ12345
    if (parsed.queryParams?.code) {
      const code = String(parsed.queryParams.code).trim().toUpperCase();
      if (code.length === 8) return code;
    }

    // Path segments: join/XYZ12345
    if (parsed.path) {
      const segments = parsed.path.split('/').filter(Boolean);
      if (segments.length >= 2 && segments[0].toLowerCase() === 'join') {
        const potentialCode = segments[1].trim().toUpperCase();
        if (potentialCode.length === 8) return potentialCode;
      }
    }

    // Raw regex fallback
    const match = url.match(/[?&]code=([A-Za-z0-9]{8})/i);
    if (match) {
      return match[1].toUpperCase();
    }
  } catch (err) {
    console.warn('Error parsing deep link invite code:', err);
  }

  return null;
}

/**
 * Extracts a room ID from a URL or deep link:
 * - roamie://room/6b0557394b3a3c45af76a3b7
 */
export function extractRoomId(url: string): string | null {
  try {
    const parsed = Linking.parse(url);

    if (parsed.queryParams?.roomId) {
      return String(parsed.queryParams.roomId).trim();
    }

    if (parsed.path) {
      const segments = parsed.path.split('/').filter(Boolean);
      if (segments.length >= 2 && segments[0].toLowerCase() === 'room') {
        return segments[1].trim();
      }
    }
  } catch (err) {
    console.warn('Error parsing deep link room ID:', err);
  }

  return null;
}

/**
 * Sets up listeners for initial URL (on app launch) and incoming URLs while app is open
 */
export function setupDeepLinkListeners(callbacks: {
  onJoinCode?: (code: string) => void;
  onOpenRoom?: (roomId: string) => void;
}): () => void {
  // Check initial URL on launch
  Linking.getInitialURL()
    .then((url) => {
      if (url) {
        handleUrl(url, callbacks);
      }
    })
    .catch((err) => {
      console.warn('Error getting initial deep link URL:', err);
    });

  // Listen for incoming URLs while app is running
  const subscription = Linking.addEventListener('url', (event) => {
    handleUrl(event.url, callbacks);
  });

  return () => {
    subscription.remove();
  };
}

function handleUrl(
  url: string,
  callbacks: {
    onJoinCode?: (code: string) => void;
    onOpenRoom?: (roomId: string) => void;
  }
) {
  const code = extractInviteCode(url);
  if (code && callbacks.onJoinCode) {
    callbacks.onJoinCode(code);
    return;
  }

  const roomId = extractRoomId(url);
  if (roomId && callbacks.onOpenRoom) {
    callbacks.onOpenRoom(roomId);
  }
}
