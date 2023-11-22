'use strict';
import { LANGUAGES } from './languages.js';

const swapButton = document.getElementById('swap-button');
const [source, target] = document.getElementsByClassName('lang')
const translatedTextBlock = document.getElementById('translation');
const copyButton = document.getElementById('copy-btn');
const clearButton = document.getElementById('clear-btn');
const more = document.getElementsByClassName('more')[0];
const textInput = document.getElementById('text-input');

const LANGUAGE_CODES = {
    EN: 'en',
    RU: 'ru',
    AUTO: 'auto',
}

swapButton.onclick = swapLanguages

copyButton.onclick = copyToClipboard;

clearButton.onclick = clearInput;

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        const [injectionResult] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => window.getSelection().toString().trim(),
        });
        const { result = '' } = injectionResult
        checkTextSize(result)
        textInput.value = result;
        startTranslate(result);
    } catch (error) {
        console.log(error)
    }
});

textInput.addEventListener('input', ({ target }) => checkTextSize(target.value))

textInput.addEventListener(
    'input',
    debounce(({ target }) => {
        const { value } = target;
        if (value) {
            startTranslate(value);
        } else {
            setTranslation({ translation: '' })
        }
    })
);

function startTranslate(data) {
    if (!data) return;
    const text = typeof data === 'string' ? data : data[0];
    if (!text) return;

    const { sl, tl } = /[а-яёА-ЯЁ]+/.test(text) ? { sl: LANGUAGE_CODES.RU, tl: LANGUAGE_CODES.EN } : { sl: LANGUAGE_CODES.AUTO, tl: LANGUAGE_CODES.RU };

    if (source.dataset.lang !== sl || target.dataset.lang !== tl) {
        if (source.dataset.lang !== sl && target.dataset.lang !== tl) {
            // change languages without rotate animation
            swapLanguageInfo(sl, tl, false)
        } else {
            changeLanguageInfo(sl, tl)
        }
    }

    getTranslate({ text, sl, tl })
}

function swapLanguages() {
    const [sl, tl] = swapLanguageInfo()

    textInput.value = translatedTextBlock.innerText;
    translatedTextBlock.innerText = ''
    checkTextSize(textInput.value)

    getTranslate({ text: textInput.value, sl, tl })
}

async function getTranslate({ text, sl, tl }) {
    if (!text) return;

    translatedTextBlock.classList.add('fade')
    more.href = `https://translate.google.com/#${sl}/${tl}/${encodeURI(text)}`;

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dj=1&sl=${sl}&tl=${tl}&q=${encodeURI(text)}`;

    try {
        const delay = new Promise(resolve => setTimeout(resolve, 100));

        const [response] = await Promise.all([fetch(url), delay])

        if (!response.ok) {
            throw new Error(response);
        }

        const { sentences, src } = await response.json()

        const currentSourceLang = source.dataset.lang
        if (currentSourceLang !== src) {
            changeLanguageInfo(src, tl)
        }

        if (sentences && sentences.length > 0) {
            const translation = sentences.map(({ trans }) => trans).join('');
            setTranslation({ translation });
        }
    } catch (error) {
        console.log(error)
        const original = `Something went wrong, click link bellow for fix<br/><a href=${url} target="_blank">enter captha at google translate...</a>`;
        setTranslation({ translation: original, error: true });
    }
};

function setTranslation({ translation, error }) {
    if (error) {
        translatedTextBlock.innerHTML = translation;
    } else {
        translatedTextBlock.innerText = translation;
    }
    translatedTextBlock.classList.remove('fade')
};

function changeLanguageInfo(sl, tl) {
    const isSourceLangChanged = sl !== source.dataset.lang
    const current = isSourceLangChanged ? source : target

    current.dataset.lang = isSourceLangChanged ? sl : tl
    current.classList.add('fade')

    setTimeout(() => {
        current.textContent = LANGUAGES[current.dataset.lang] || 'UNKNOWN'
        current.classList.remove('fade')
    }, 150)
}

function swapLanguageInfo(sl, tl, withRotate = true) {
    const tempSourceLang = tl || source.dataset.lang
    source.dataset.lang = sl || target.dataset.lang
    target.dataset.lang = tempSourceLang

    source.classList.add('fade')
    target.classList.add('fade')

    if (withRotate) {
        if (swapButton.classList.contains('rotate')) {
            swapButton.classList.remove('rotate')
        } else {
            swapButton.classList.add('rotate')
        }
    }

    setTimeout(() => {
        source.textContent = LANGUAGES[source.dataset.lang] || 'UNKNOWN'
        target.textContent = LANGUAGES[target.dataset.lang] || 'UNKNOWN'
        source.classList.remove('fade')
        target.classList.remove('fade')
    }, 150)

    return [source.dataset.lang, target.dataset.lang]
}

function checkTextSize(text) {
    if (text.length > 40 && !textInput.classList.contains('small')) {
        textInput.classList.add('small')
    }

    if (text.length <= 40 && textInput.classList.contains('small')) {
        textInput.classList.remove('small')
    }
}

function clearInput() {
    textInput.value = ''
    setTranslation({ translation: '' })
}

function copyToClipboard() {
    const text = translatedTextBlock.innerText;
    navigator.clipboard.writeText(text)
}

function debounce(func) {
    let timer;
    return (...args) => {
        const next = () => func(...args);
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(next, 500);
    };
}