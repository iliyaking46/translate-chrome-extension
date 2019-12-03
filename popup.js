'use strict';

const getTranlate = (data) => {
    if (!data) return;
    const text = typeof data === 'string' ? data : data[0]
    if (!text) return;

    const word = text.split(' ')[0];
    const { sl, tl } = /^[а-яА-Я\d ]+$/.test(word) ? { sl: 'ru', tl: 'en' } : { sl: 'en', tl: 'ru' };
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dj=1&sl=${sl}&tl=${tl}&q=${text}`
    fetch(url)
        .then(data => data.json())
        .then((data) => {
            const { sentences } = data;
            if (sentences && sentences.length > 0) {
                const original = sentences.map(({ orig }) => orig).join('\n')
                const translation = sentences.map(({ trans }) => trans).join(' ')
                setTranslation({original, translation, sl, tl})
            }
        })
}

const setTranslation = ({original, translation, sl, tl}) => {
    const originalTextBlock = document.getElementById("original")
    originalTextBlock.innerHTML = original;
    originalTextBlock.style.display = 'block';

    const translatedTextBlock = document.getElementById("translation")
    translatedTextBlock.innerHTML = translation;
    translatedTextBlock.style.display = 'block';

    document.getElementById("copy").onclick = () => {
      copyToClipboard(translation)
    }

    const moreLink = document.getElementById("more");
    moreLink.href = `https://translate.google.com/?#${sl}/${tl}/${original}`
    moreLink.style.display = 'inline-block';
}

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
    {code: "window.getSelection().toString().trim();"},
    getTranlate
  );
});

document.getElementById('search-form').onsubmit = (e) => {
    e.preventDefault();
    const value = document.getElementById('text-input').value;
    getTranlate(value);
    document.getElementById('text-input').value = '';
}