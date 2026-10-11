export interface NamedToken {
  name: string;
  token: string;
}

export interface ExtensionSettings {
  homelabUrl: string;
  tokens: NamedToken[];
  currentToken: string;
}

const SETTINGS_KEY = 'settings';

export async function getExtensionSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  const value: unknown = stored[SETTINGS_KEY];

  if (!value || typeof value !== 'object') {
    return { homelabUrl: '', tokens: [], currentToken: '' };
  }

  const settings = value as Partial<ExtensionSettings> & {
    tokens?: unknown[];
  };
  const tokens = Array.isArray(settings.tokens)
    ? settings.tokens.reduce<NamedToken[]>((savedTokens, entry, index) => {
        if (typeof entry === 'string') {
          savedTokens.push({ name: `Token ${index + 1}`, token: entry });
        } else if (
          entry &&
          typeof entry === 'object' &&
          'name' in entry &&
          'token' in entry &&
          typeof entry.name === 'string' &&
          typeof entry.token === 'string'
        ) {
          savedTokens.push({ name: entry.name, token: entry.token });
        }

        return savedTokens;
      }, [])
    : [];
  const currentToken =
    typeof settings.currentToken === 'string' &&
    tokens.some(({ token }) => token === settings.currentToken)
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
