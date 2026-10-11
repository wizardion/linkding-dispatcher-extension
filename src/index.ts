import './styles/autocomplete.scss';
import './styles/main.scss';
import './styles/popup.scss';
import {
  ApiCheckData,
  Bookmark,
  UserForm,
  ApiInfoData,
  ApiJobDetails,
  ResultInfo,
  Payload,
  ApiMetadataData,
  ApiResetDetails,
} from './types/types';
import {
  getSelectedTags,
  registerEventListeners,
  registerTags,
  setInputTags,
} from './autocomplete/autocomplete';
import { nextFrame } from './core';
import {
  getExtensionSettings,
  normalizeHomelabUrl,
  normalizeUrl,
} from './core/settings';
import { HttpClient } from './request/request';
import { ApiError } from './request/exceptions';

let apiUrl = '';
let currentToken = '';
const editForm = <HTMLFormElement>document.getElementById('dispatch-form');

let bookmarkInfo: ApiInfoData | null = null;
let bookmark: Bookmark | null = null;

const userForm: UserForm = {
  url: document.getElementById('url-id') as HTMLInputElement,
  title: document.getElementById('title-id') as HTMLInputElement,
  dropdown: document.getElementById('bundle-id') as HTMLElement,
  dropdownTitle: document.getElementById('dropdown-title') as HTMLElement,
  bundles: (document
    .getElementById('bundle-id')
    ?.querySelectorAll('input[name="bundle"]') || []) as RadioNodeList,
  tags: document.getElementById('tags-id') as HTMLInputElement,
  session: document.getElementById('session-id') as HTMLInputElement,
  archived: document.getElementById('archived-id') as HTMLInputElement,
  description: document.getElementById('description-id') as HTMLTextAreaElement,
  submit: document.getElementById('submit-id') as HTMLButtonElement,
  remove: document.getElementById('remove-id') as HTMLButtonElement,
  reset: document.getElementById('reset-cache-id') as HTMLLinkElement,
  headTitle: document.getElementById('head-title-id') as HTMLElement,
};

function selectBundle(value: string) {
  const radios = userForm.bundles;

  for (let i = 0; i < radios.length; i++) {
    const radio = radios[i];

    if (radio.value === value) {
      radio.click();
      break;
    }
  }
}

async function getPreference(client: HttpClient): Promise<ApiInfoData | null> {
  try {
    const data = await client.get<ApiInfoData>(`${apiUrl}/bookmark/info`);

    if (data) {
      const radios = userForm.bundles;
      let i = 0,
        j = 0;

      while (i < data.bundles.length || j < radios.length) {
        const bundle = data.bundles[i];
        const radio = radios[j];

        if (!bundle && radio?.parentElement) {
          radio.parentElement.remove();
          j += 1;
          continue;
        }

        if (bundle && radio && radio.value == '-1' && radio.nextSibling) {
          radio.nextSibling.textContent = bundle.name;
          radio.value = bundle.tag;
          radio.dataset.name = bundle.name;
          i += 1;
        }

        if (bundle && !radio) {
          const label = document.createElement('label');
          const input = document.createElement('input');
          const fragment = document.createDocumentFragment();

          input.type = 'radio';
          input.name = 'bundle';
          input.className = 'form-check-input me-2';
          input.value = bundle.tag;
          input.dataset.name = bundle.name;
          label.className = 'list-group-item fs-6 py-1';
          fragment.append(bundle.name);
          label.appendChild(input);
          label.appendChild(fragment);

          userForm.dropdown.appendChild(label);
          i += 1;
        }

        j += 1;
      }
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      console.log('ERROR:', [error.message]);
    } else {
      console.error('An unexpected error occurred');
    }
  }

  return null;
}

async function checkBookmark(
  url: string,
  client: HttpClient
): Promise<Bookmark | null> {
  if (url) {
    userForm.url.value = url;

    try {
      const encodedUrl = encodeURIComponent(url);
      const data = await client.get<ApiCheckData>(
        `${apiUrl}/bookmark/check?url=${encodedUrl}`
      );

      userForm.url.value = data.url;

      if (data.bookmark) {
        userForm.title.value = data.bookmark.title;
        userForm.description.value = data.bookmark.description;
        userForm.archived.checked = data.bookmark.archived;

        userForm.headTitle.textContent = 'Edit bookmark';
        document.title = 'Edit bookmark';

        userForm.remove.classList.remove('d-none');
        userForm.submit.classList.remove('w-100');
        userForm.submit.classList.add('w-75');
        userForm.headTitle.classList.add('text-success');

        userForm.submit.innerText = 'Save Bookmark';

        setInputTags(data.bookmark.tags || []);

        return data.bookmark;
      }

      userForm.headTitle.textContent = 'New bookmark';
      document.title = 'New bookmark';
    } catch (error) {
      if (error instanceof ApiError) {
        console.log('ERROR:', [error.message]);
      } else {
        console.error('An unexpected error occurred');
      }
    }
  }

  return null;
}

async function checkBookmarkMetadata(url: string, client: HttpClient): Promise<void> {
  if (url) {
    try {
      const encodedUrl = encodeURIComponent(url);
      const data = await client.get<ApiMetadataData>(
        `${apiUrl}/bookmark/metadata?url=${encodedUrl}`
      );

      if (!bookmark && data.metadata) {
        userForm.title.value = data.metadata.title;
        userForm.description.value = data.metadata.description;
      }
    } catch (error) {
      if (error instanceof ApiError) {
        console.log('ERROR:', [error.message]);
      } else {
        console.error('An unexpected error occurred');
      }
    }
  }
}

async function loadData(checkUrl?: string) {
  const urlParams = new URLSearchParams(window.location.search);
  const url = checkUrl || urlParams.get('url') || '';

  if (!url) {
    return;
  }

  const client = new HttpClient(currentToken);
  const requests: Promise<any>[] = [checkBookmark(url, client), getPreference(client)];
  const result = await Promise.all(requests);

  bookmark = result[0];
  bookmarkInfo = result[1];

  if (!bookmark) {
    requests.push(checkBookmarkMetadata(url, client));
  }

  if (bookmark && bookmarkInfo) {
    bookmarkInfo.preference = {
      ...bookmarkInfo.preference,

      tags: bookmark.tags,
      archived: bookmark.archived,
      bundle: bookmark.bundle,
    };
  }

  if (bookmarkInfo) {
    selectBundle(bookmarkInfo.preference.bundle);
    toggleTagsSet(bookmarkInfo.preference.archived);
    registerTags(bookmarkInfo.tags || []);
    setInputTags(bookmarkInfo.preference.tags || []);

    if (bookmarkInfo.preference?.remember) {
      userForm.session.checked = bookmarkInfo.preference.remember;
      userForm.archived.checked = bookmarkInfo.preference.archived;
    }

    // if (!bookmarkInfo.bundles.length) {
    //   userForm.dropdown.parentElement?.parentElement?.classList.add('d-none');
    // }
  }

  userForm.title.disabled = false;
  userForm.tags.disabled = false;

  nextFrame().then(() => registerEventListeners());

  await Promise.all(requests);

  userForm.submit.disabled = false;
  userForm.remove.disabled = false;
}

function toggleTagsSet(archived: boolean) {
  const title = bookmark ? 'Edit bookmark' : 'New bookmark';

  if (archived) {
    userForm.headTitle.classList.add('text-danger');
    userForm.headTitle.textContent = `${title} (Archived)`;
  } else {
    userForm.headTitle.classList.remove('text-danger');
    userForm.headTitle.textContent = title;
  }
}

userForm.url.addEventListener('change', (e: Event) => {
  const input = e.target as HTMLInputElement;

  userForm.title.disabled = true;
  userForm.tags.disabled = true;
  userForm.submit.disabled = true;
  userForm.remove.disabled = true;

  loadData(input.value);
});

userForm.dropdown.addEventListener('change', (e: Event) => {
  const input = e.target as HTMLInputElement;
  const name = input.dataset.name ? ` (${input.dataset.name})` : '';
  const title = 'Bundles:';

  userForm.dropdownTitle.innerText = `${title}${name}`;
});

userForm.archived.addEventListener('change', (event) =>
  toggleTagsSet((<HTMLInputElement>event.target).checked)
);

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  e.stopPropagation();

  if (editForm.checkValidity() && currentToken) {
    const client = new HttpClient(currentToken);
    const data = new FormData(editForm);
    const payload: Payload = {
      id: bookmark?.id || null,
      url: userForm.url.value,
      title: userForm.title.value,
      bundle: data.get('bundle')?.toString() || '',
      tags: getSelectedTags(),
      archived: userForm.archived.checked,
      description: userForm.description.value,
      remember: userForm.session.checked,
    };
    const info: ResultInfo = {
      element: document.getElementById('result-info') as HTMLElement,
    };

    userForm.submit.disabled = true;
    userForm.remove.disabled = true;

    try {
      await client.post<ApiJobDetails>(`${apiUrl}/bookmark/save`, payload);

      editForm.classList.add('d-none');
      info.element.classList.remove('d-none');
    } catch (error) {
      if (error instanceof ApiError) {
        console.log('ERROR:', [error.message]);
      } else {
        console.error('An unexpected error occurred');
      }
    }

    userForm.submit.disabled = false;
    userForm.remove.disabled = false;
  } else {
    editForm.classList.add('was-validated');
  }
});

userForm.remove.addEventListener('click', async (e) => {
  e.preventDefault();

  if (bookmark && currentToken) {
    const client = new HttpClient(currentToken);
    const info: ResultInfo = {
      element: document.getElementById('result-info') as HTMLElement,
    };

    userForm.submit.disabled = true;
    userForm.remove.disabled = true;

    try {
      const data = await client.delete<ApiJobDetails>(
        `${apiUrl}/bookmark/${bookmark.id}`
      );

      editForm.classList.add('d-none');
      info.element.classList.remove('d-none');
    } catch (error) {
      if (error instanceof ApiError) {
        console.log('ERROR:', [error.message]);
      } else {
        console.error('An unexpected error occurred');
      }
    }

    userForm.submit.disabled = false;
    userForm.remove.disabled = false;
  }
});

userForm.reset.addEventListener('click', async (e) => {
  e.preventDefault();
  e.stopImmediatePropagation();
  e.stopPropagation();

  if (currentToken) {
    const client = new HttpClient(currentToken);
    const span = userForm.reset.nextElementSibling as HTMLSpanElement;

    userForm.reset.classList.add('d-none');
    span.classList.remove('d-none');
    userForm.submit.disabled = true;
    userForm.remove.disabled = true;

    await nextFrame();

    try {
      const data = await client.post<ApiResetDetails>(`${apiUrl}/bookmark/reset`);

      if (!data.success) {
        throw new ApiError(500, 'Resetting cache was unsuccessful.');
      }

      await loadData();
    } catch (error) {
      if (error instanceof ApiError) {
        console.log('ERROR:', [error.message]);
      } else {
        console.error('An unexpected error occurred');
      }
    }

    userForm.reset.classList.remove('d-none');
    span.classList.add('d-none');
    userForm.submit.disabled = false;
    userForm.remove.disabled = false;
  }
});

(async function () {
  const configurationNotice = document.getElementById('configuration-required');
  const configurationMessage = document.getElementById('configuration-message');

  try {
    const settings = await getExtensionSettings();
    const homelabUrl = normalizeHomelabUrl(settings.homelabUrl);

    if (!homelabUrl || !settings.currentToken) {
      configurationNotice?.classList.remove('d-none');
      return;
    }

    apiUrl = `${homelabUrl}/api/v10/dispatcher`;
    currentToken = settings.currentToken;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = normalizeUrl(tab.url || '');
    // const url = 'https://www.freetobemesalon.com';

    console.log('url-2', [url], [tab.url]);

    if (url) {
      loadData(url);
    } else {
      const client = new HttpClient(currentToken);

      bookmarkInfo = await getPreference(client);

      if (bookmarkInfo) {
        selectBundle(bookmarkInfo.preference.bundle);
        toggleTagsSet(bookmarkInfo.preference.archived);
        registerTags(bookmarkInfo.tags || []);
        setInputTags(bookmarkInfo.preference.tags || []);

        if (bookmarkInfo.preference?.remember) {
          userForm.session.checked = bookmarkInfo.preference.remember;
          userForm.archived.checked = bookmarkInfo.preference.archived;
        }

        // if (!bookmarkInfo.bundles.length) {
        //   userForm.dropdown.parentElement?.parentElement?.classList.add('d-none');
        // }
      }

      userForm.title.disabled = false;
      userForm.tags.disabled = false;

      nextFrame().then(() => registerEventListeners());

      userForm.submit.disabled = false;
      userForm.remove.disabled = false;
    }
  } catch (error) {
    if (configurationMessage) {
      configurationMessage.textContent =
        error instanceof Error
          ? `Unable to load extension settings: ${error.message}`
          : 'Unable to load extension settings.';
    }

    configurationNotice?.classList.remove('d-none');
  }
})();
