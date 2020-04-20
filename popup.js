'use strict';

const applyTranslate = (text, {languages = []}) => {
    const language = languages[0]?.language;
    const {sl, tl} = language === 'ru' ? {sl: 'ru', tl: 'en'} : {sl: language, tl: 'ru'};
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dj=1&sl=${sl}&tl=${tl}&q=${text}`;
    fetch(url)
        .then(data => data.json())
        .then((data) => {
            const {sentences} = data;
            if (sentences && sentences.length > 0) {
                const original = sentences.map(({orig}) => orig).join('\n');
                const translation = sentences.map(({trans}) => trans).join(' ');
                setTranslation({original, translation, sl, tl})
            }
        })
};

const getTranslate = (data) => {
    if (!data) return;
    const text = typeof data === 'string' ? data : data[0];
    if (!text) return;

    chrome.i18n.detectLanguage(text, (result) => applyTranslate(text, result))
};

const setTranslation = ({original, translation, sl, tl}) => {
    const originalTextBlock = document.getElementById('original');
    originalTextBlock.innerHTML = original;
    originalTextBlock.style.display = 'block';

    const translatedTextBlock = document.getElementById('translation');
    translatedTextBlock.innerHTML = translation;
    translatedTextBlock.style.display = 'block';

    const copyButton = document.getElementById('copy');
    copyButton.onclick = () => copyToClipboard(translation);
    copyButton.style.display = 'flex';

    const moreLink = document.getElementById('more');
    moreLink.href = `https://translate.google.com/#${sl}/${tl}/${original}`;
    moreLink.style.display = 'inline-block';
};

// copy to clipboard
const copyToClipboard = str => {
    const el = document.createElement('textarea');
    el.value = str;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
};

// translate from selection
document.addEventListener('DOMContentLoaded', () => {
    chrome.tabs.executeScript(
        {code: 'window.getSelection().toString().trim();'},
        getTranslate,
    );
});

document.getElementById('search-form').onsubmit = (e) => {
    e.preventDefault();
    const value = document.getElementById('text-input').value;
    getTranslate(value);
    document.getElementById('text-input').value = '';
};
