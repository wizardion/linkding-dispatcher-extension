import './styles/bootstrap.scss';
import './styles/main.scss';
import {
  ExtensionSettings,
  getExtensionSettings,
  NamedToken,
  normalizeHomelabUrl,
  saveExtensionSettings,
} from './core/settings';

const settingsForm = document.getElementById('settings-form') as HTMLFormElement;
const homelabUrlInput = document.getElementById('homelab-url') as HTMLInputElement;
const tokenNameInput = document.getElementById('token-name') as HTMLInputElement;
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

let tokens: NamedToken[] = [];

function renderTokens(selectedToken = currentTokenSelect.value): void {
  tokenList.replaceChildren();
  currentTokenSelect.replaceChildren();

  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = tokens.length ? 'Select a token' : 'Add a token first';
  currentTokenSelect.appendChild(emptyOption);
  currentTokenSelect.disabled = false;

  tokens.forEach(({ name, token }) => {
    const item = document.createElement('li');
    item.className =
      'list-group-item d-flex align-items-center justify-content-between gap-3';

    const label = document.createElement('span');
    label.textContent = `${name} (${token.slice(0, 4)}...${token.slice(-4)})`;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'btn btn-sm btn-outline-danger';
    removeButton.textContent = 'Delete';
    removeButton.setAttribute('aria-label', `Delete ${name}`);
    removeButton.addEventListener('click', () => {
      tokens = tokens.filter((candidate) => candidate.token !== token);

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
    option.textContent = name;
    currentTokenSelect.appendChild(option);
  });

  noTokensMessage.classList.toggle('d-none', tokens.length > 0);
  currentTokenSelect.value = tokens.some(({ token }) => token === selectedToken)
    ? selectedToken
    : '';
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
  const name = tokenNameInput.value.trim();
  const token = tokenInput.value.trim();
  tokenError.textContent = '';
  saveStatus.textContent = '';

  if (!name) {
    tokenError.textContent = 'Enter a name for this token.';
    tokenNameInput.focus();
    return;
  }

  if (!/^[a-fA-F0-9]{40}$/.test(token)) {
    tokenError.textContent = 'Token must contain exactly 40 hexadecimal characters.';
    tokenInput.focus();
    return;
  }

  if (tokens.some((entry) => entry.token === token)) {
    tokenError.textContent = 'This token has already been added.';
    tokenInput.focus();
    return;
  }

  if (
    tokens.some((entry) => entry.name.toLocaleLowerCase() === name.toLocaleLowerCase())
  ) {
    tokenError.textContent = 'A token with this name already exists.';
    tokenNameInput.focus();
    return;
  }

  const selectedToken = currentTokenSelect.value || token;
  tokens.push({ name, token });
  tokenNameInput.value = '';
  tokenInput.value = '';
  renderTokens(selectedToken);
});

for (const input of [tokenNameInput, tokenInput]) {
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addTokenButton.click();
    }
  });
}

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
