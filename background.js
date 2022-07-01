const CONTEXT_MENU_ID = 'translate-ext'

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ title: 'Translate selected text', contexts: ['selection'], id: CONTEXT_MENU_ID })
});

chrome.contextMenus.onClicked.addListener(
  ({ selectionText, menuItemId }) => {
    if (!selectionText || menuItemId !== CONTEXT_MENU_ID) return;

    const { sl, tl } = /[а-яёА-ЯЁ]+/.test(selectionText) ? { sl: 'ru', tl: 'en' } : { sl: 'en', tl: 'ru' };

    const url = `https://translate.google.com/#${sl}/${tl}/${encodeURI(selectionText)}`;
    chrome.tabs.create({ url: url });
  }
)