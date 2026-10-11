export interface ExtensionSettings {
  homelabUrl: string;
  tokens: string[];
  currentToken: string;
}

const SETTINGS_KEY = 'settings';

export async function getExtensionSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  const value: unknown = stored[SETTINGS_KEY];

  if (!value || typeof value !== 'object') {
    return { homelabUrl: '', tokens: [], currentToken: '' };
  }

  const settings = value as Partial<ExtensionSettings>;
  const tokens = Array.isArray(settings.tokens)
    ? settings.tokens.filter((token): token is string => typeof token === 'string')
    : [];
  const currentToken =
    typeof settings.currentToken === 'string' && tokens.includes(settings.currentToken)
      ? settings.currentToken
      : '';

  return {
    homelabUrl: typeof settings.homelabUrl === 'string' ? settings.homelabUrl : '',
    tokens,
    currentToken,
  };
}

export function saveExtensionSettings(settings: ExtensionSettings): Promise<void> {
  return chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export function normalizeHomelabUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());

    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}
