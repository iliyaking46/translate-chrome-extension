'use strict';

const translateBox = document.getElementById('translate-box');
const originalTextBlock = document.getElementById('original');
const translatedTextBlock = document.getElementById('translation');
const moreLink = document.getElementById('more');
const copyButton = document.getElementById('copy-btn');
const footer = document.getElementsByClassName('footer')[0];
const textInput = document.getElementById('text-input');

const getTranslate = async (data) => {
    if (!data) return;
    const text = typeof data === 'string' ? data : data[0];
    if (!text) return;

    const { sl, tl } = /[а-яёА-ЯЁ]+/.test(text) ? { sl: 'ru', tl: 'en' } : { sl: 'en', tl: 'ru' };

    footer.href = `https://translate.google.com/#${sl}/${tl}/${encodeURI(text)}`;

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dj=1&sl=${sl}&tl=${tl}&q=${encodeURI(text)}`;

    try {
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(response);
        }

        const { sentences } = await response.json()
        if (sentences && sentences.length > 0) {
            const original = sentences.map(({ orig }) => orig).join(' ');
            const translation = sentences.map(({ trans }) => trans).join('');
            setTranslation({ original, translation, sl, tl });
        }
    } catch (error) {
        console.log(error)
        const original = `Something went wrong, click link bellow for fix<br/><a href=${url} target="_blank">enter captha at google translate...</a>`;
        setTranslation({ original, translation: '' });
    }
};

const setTranslation = ({ original, translation, sl, tl }) => {
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

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        const [injectionResult] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => window.getSelection().toString().trim(),
        });
        const { result = '' } = injectionResult
        textInput.value = result;
        getTranslate(result);
    } catch (error) {
        console.log(error)
    }
});

const debounce = (func) => {
    let timer;
    return (...args) => {
        const next = () => func(...args);
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(next, 300);
    };
}

textInput.addEventListener(
    'keyup',
    debounce((event) => {
        getTranslate(event.target.value);
    })
);
