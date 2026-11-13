import { Settings } from './settings.js';
import { googleTranslateUrl } from './api-translator.js';

const CONTEXT_MENU_ID = 'translate-ext'

// Languages whose script can be recognised reliably by a single regex
const SCRIPT_PATTERNS = {
  ru: /\p{Script=Cyrillic}/u,
  ja: /[\p{Script=Hiragana}\p{Script=Katakana}]/u,
  ko: /\p{Script=Hangul}/u,
  zh: /\p{Script=Han}/u,
};

function looksLikeLanguage(text, language, otherLanguage) {
  if (SCRIPT_PATTERNS[language]) return SCRIPT_PATTERNS[language].test(text);
  // Latin-script language: decide by absence of the other language's script
  if (SCRIPT_PATTERNS[otherLanguage]) return !SCRIPT_PATTERNS[otherLanguage].test(text);
  return false;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ title: 'Translate text', contexts: ['selection'], id: CONTEXT_MENU_ID })
});

chrome.contextMenus.onClicked.addListener(async ({ selectionText, menuItemId }) => {
  if (!selectionText || menuItemId !== CONTEXT_MENU_ID) return;

  const { mainLanguage, secondaryLanguage } = await Settings.get();
  const { sl, tl } = looksLikeLanguage(selectionText, mainLanguage, secondaryLanguage)
    ? { sl: mainLanguage, tl: secondaryLanguage }
    : { sl: 'auto', tl: mainLanguage };

  chrome.tabs.create({ url: googleTranslateUrl(selectionText, sl, tl) });
})
