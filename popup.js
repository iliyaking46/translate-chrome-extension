'use strict';

const translateBox = document.getElementById('translate-box');
const originalTextBlock = document.getElementById('original');
const translatedTextBlock = document.getElementById('translation');
const moreLink = document.getElementById('more');
const copyButton = document.getElementById('copy-btn');
const footer = document.getElementsByClassName('footer')[0];
const textInput = document.getElementById('text-input');

const getTranslate = (data) => {
    if (!data) return;
    const text = typeof data === 'string' ? data : data[0];
    if (!text) return;

    const {sl, tl} = /[а-яёА-ЯЁ]+/.test(text) ? {sl: 'ru', tl: 'en'} : {sl: 'en', tl: 'ru'};

    footer.href = `https://translate.google.com/#${sl}/${tl}/${encodeURI(text)}`;

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dj=1&sl=${sl}&tl=${tl}&q=${encodeURI(text)}`;

    fetch(url)
        .then((response) => {
            if (!response.ok) {
                throw response;
            }
            return response.json(); //we only get here if there is no error
        })
        .then((data) => {
            const {sentences} = data;
            if (sentences && sentences.length > 0) {
                const original = sentences.map(({orig}) => orig).join('');
                const translation = sentences.map(({trans}) => trans).join('');
                setTranslation({original, translation, sl, tl});
            }
        })
        .catch((err) => {
            const original = `Something went wrong, click link bellow for fix<br/><a href=${url} target="_blank">enter captha at google translate...</a>`;
            setTranslation({original, translation: ''});
            // err.text().then(log.error);
        });
};

const setTranslation = ({original, translation, sl, tl}) => {
    originalTextBlock.innerHTML = original;
    translatedTextBlock.innerText = translation;

    translateBox.style.display = 'block';

    if (sl && tl) {
        copyButton.onclick = () => copyToClipboard(translation);
        copyButton.style.display = 'flex';

        moreLink.href = `https://translate.google.com/#${sl}/${tl}/${original}`;
        moreLink.style.display = 'inline-block';
    }
};

// copy to clipboard
const copyToClipboard = (str) => {
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
    chrome.tabs.executeScript({code: 'window.getSelection().toString().trim();'}, (value = '') => {
        textInput.value = value;
        getTranslate(value);
    });
});

textInput.addEventListener(
    'keyup',
    debounce((event) => {
        getTranslate(event.target.value);
    })
);

function debounce(func) {
    let timer;
    return (...args) => {
        const next = () => func(...args);
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(next, 300);
    };
}
