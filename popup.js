'use strict';

const swapButton = document.getElementById('swap-button');
const [source, translated] = document.getElementsByClassName('lang')
const translatedTextBlock = document.getElementById('translation');
const copyButton = document.getElementById('copy-btn');
const more = document.getElementsByClassName('more')[0];
const textInput = document.getElementById('text-input');
const SOURCES = {
    EN: 'en',
    RU: 'ru'
}
let currentSource = SOURCES.EN

swapButton.onclick = swapLanguages

copyButton.onclick = copyToClipboard;

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        const [injectionResult] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => window.getSelection().toString().trim(),
        });
        const { result = '' } = injectionResult
        textInput.value = result;
        startTranslate(result);
    } catch (error) {
        console.log(error)
    }
});

textInput.addEventListener(
    'keyup',
    debounce((event) => {
        startTranslate(event.target.value);
    })
);

function startTranslate(data) {
    if (!data) return;
    const text = typeof data === 'string' ? data : data[0];
    if (!text) return;
    checkTextSize(text)
    const { sl, tl } = /[а-яёА-ЯЁ]+/.test(text) ? { sl: SOURCES.RU, tl: SOURCES.EN } : { sl: SOURCES.EN, tl: SOURCES.RU };
    if (sl != currentSource) {
        currentSource = sl;
        swapLanguageInfo()
    }
    getTranslate({ text, sl, tl })
}

function swapLanguages() {
    if (swapButton.classList.contains('rotate')) {
        swapButton.classList.remove('rotate')
    } else {
        swapButton.classList.add('rotate')
    }
    swapLanguageInfo()

    textInput.value = translatedTextBlock.innerText;
    translatedTextBlock.innerText = ''
    checkTextSize(textInput.value)

    const newSource = currentSource === SOURCES.EN ? SOURCES.RU : SOURCES.EN
    getTranslate({ text: textInput.value, sl: newSource, tl: currentSource })
    currentSource = newSource;
}

async function getTranslate({ text, sl, tl }) {
    if (!text) return;

    more.href = `https://translate.google.com/#${sl}/${tl}/${encodeURI(text)}`;

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
};

function swapLanguageInfo() {
    const temp = source.textContent
    source.textContent = translated.textContent
    translated.textContent = temp
}

function checkTextSize(text) {
    if (text.length > 40 && !textInput.classList.contains('small')) {
        textInput.classList.add('small')
    }

    if (text.length <= 40 && textInput.classList.contains('small')) {
        textInput.classList.remove('small')
    }
}

// copy to clipboard
// function copyToClipboard(str) {
//     const el = document.createElement('textarea');
//     el.value = str;
//     el.setAttribute('readonly', '');
//     el.style.position = 'absolute';
//     el.style.left = '-9999px';
//     document.body.appendChild(el);
//     el.select();
//     document.execCommand('copy');
//     document.body.removeChild(el);
// };

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