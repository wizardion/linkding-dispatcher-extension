import './styles/main.scss';
import {
  ExtensionSettings,
  getExtensionSettings,
  normalizeHomelabUrl,
  saveExtensionSettings,
} from './core/settings';

const settingsForm = document.getElementById('settings-form') as HTMLFormElement;
const homelabUrlInput = document.getElementById('homelab-url') as HTMLInputElement;
const tokenInput = document.getElementById('new-token') as HTMLInputElement;
const addTokenButton = document.getElementById('add-token') as HTMLButtonElement;
const tokenList = document.getElementById('token-list') as HTMLUListElement;
const noTokensMessage = document.getElementById('no-tokens') as HTMLParagraphElement;
const currentTokenSelect = document.getElementById(
  'current-token'
) as HTMLSelectElement;
const tokenError = document.getElementById('token-error') as HTMLDivElement;
const saveStatus = document.getElementById('save-status') as HTMLSpanElement;
const saveButton = document.getElementById('save-settings') as HTMLButtonElement;

let tokens: string[] = [];

function renderTokens(selectedToken = currentTokenSelect.value): void {
  tokenList.replaceChildren();
  currentTokenSelect.replaceChildren();

  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = tokens.length ? 'Select a token' : 'Add a token first';
  currentTokenSelect.appendChild(emptyOption);
  currentTokenSelect.disabled = false;

  tokens.forEach((token, index) => {
    const item = document.createElement('li');
    item.className =
      'list-group-item d-flex align-items-center justify-content-between gap-3';

    const label = document.createElement('span');
    label.textContent = `Token ${index + 1} (${token.length > 8 ? `${token.slice(0, 4)}...${token.slice(-4)}` : '****'})`;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'btn btn-sm btn-outline-danger';
    removeButton.textContent = 'Delete';
    removeButton.setAttribute('aria-label', `Delete token ${index + 1}`);
    removeButton.addEventListener('click', () => {
      tokens = tokens.filter((candidate) => candidate !== token);

      if (currentTokenSelect.value === token) {
        currentTokenSelect.value = '';
      }

      renderTokens();
      saveStatus.textContent = '';
    });

    item.append(label, removeButton);
    tokenList.appendChild(item);

    const option = document.createElement('option');
    option.value = token;
    option.textContent = `Token ${index + 1}`;
    currentTokenSelect.appendChild(option);
  });

  noTokensMessage.classList.toggle('d-none', tokens.length > 0);
  currentTokenSelect.value = tokens.includes(selectedToken) ? selectedToken : '';
}

function validateHomelabUrl(): string | null {
  const normalizedUrl = normalizeHomelabUrl(homelabUrlInput.value);
  homelabUrlInput.setCustomValidity(normalizedUrl ? '' : 'Enter a valid domain URL.');
  return normalizedUrl;
}

homelabUrlInput.addEventListener('input', () => {
  validateHomelabUrl();
  saveStatus.textContent = '';
});
currentTokenSelect.addEventListener('change', () => {
  saveStatus.textContent = '';
});

addTokenButton.addEventListener('click', () => {
  const token = tokenInput.value.trim();
  tokenError.textContent = '';
  saveStatus.textContent = '';

  if (!token) {
    tokenError.textContent = 'Enter a token before adding it.';
    tokenInput.focus();
    return;
  }

  if (tokens.includes(token)) {
    tokenError.textContent = 'This token has already been added.';
    tokenInput.focus();
    return;
  }

  const selectedToken = currentTokenSelect.value || token;
  tokens.push(token);
  tokenInput.value = '';
  renderTokens(selectedToken);
});

tokenInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addTokenButton.click();
  }
});

settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  event.stopPropagation();
  saveStatus.classList.remove('text-danger');
  saveStatus.classList.add('text-success');
  saveStatus.textContent = '';
  settingsForm.classList.add('was-validated');

  const homelabUrl = validateHomelabUrl();
  if (!homelabUrl || !settingsForm.checkValidity()) {
    settingsForm.reportValidity();
    return;
  }

  const settings: ExtensionSettings = {
    homelabUrl,
    tokens,
    currentToken: currentTokenSelect.value,
  };

  saveButton.disabled = true;

  try {
    await saveExtensionSettings(settings);
    homelabUrlInput.value = homelabUrl;
    saveStatus.textContent = 'Settings saved.';
  } catch (error) {
    saveStatus.classList.remove('text-success');
    saveStatus.classList.add('text-danger');
    saveStatus.textContent =
      error instanceof Error
        ? `Could not save settings: ${error.message}`
        : 'Could not save settings.';
  } finally {
    saveButton.disabled = false;
  }
});

void (async () => {
  try {
    const settings = await getExtensionSettings();
    homelabUrlInput.value = settings.homelabUrl;
    tokens = settings.tokens;
    renderTokens(settings.currentToken);
  } catch (error) {
    saveStatus.classList.remove('text-success');
    saveStatus.classList.add('text-danger');
    saveStatus.textContent =
      error instanceof Error
        ? `Could not load settings: ${error.message}`
        : 'Could not load settings.';
  }
})();
