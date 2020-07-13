'use strict';

const originalTextBlock = document.getElementById('original');
const translatedTextBlock = document.getElementById('translation');
const moreLink = document.getElementById('more');
const copyButton = document.getElementById('copy-btn');
const footer = document.getElementsByClassName('footer')[0];
const textInput = document.getElementById('text-input')

const getTranslate = (data) => {
    if (!data) return;
    const text = typeof data === 'string' ? data : data[0];
    if (!text) return;

    const {sl, tl} = /[а-яёА-ЯЁ]+/.test(text) ? {sl: 'ru', tl: 'en'} : {sl: 'en', tl: 'ru'};
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dj=1&sl=${sl}&tl=${tl}&q=${text}`
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

const setTranslation = ({original, translation, sl, tl}) => {
    originalTextBlock.innerHTML = original;
    originalTextBlock.style.display = 'block';

    translatedTextBlock.innerHTML = translation;
    translatedTextBlock.style.display = 'block';

    copyButton.onclick = () => copyToClipboard(translation);
    copyButton.style.display = 'flex';

    moreLink.href = `https://translate.google.com/#${sl}/${tl}/${original}`;
    moreLink.style.display = 'inline-block';

    footer.href = `https://translate.google.com/#${sl}/${tl}/${original}`;
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
    const value = textInput.value;
    getTranslate(value);
};
