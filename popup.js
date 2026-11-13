import { LANGUAGES } from './languages.js';
import { Settings } from './settings.js';
import { ApiTranslator, googleTranslateUrl } from './api-translator.js';
import { AiTranslator, AI_MODEL_NOT_READY } from './ai-translator.js';

const swapButton = document.getElementById('swap-button');
const [source, target] = document.getElementsByClassName('lang')
const translatedTextBlock = document.getElementById('translation');
const noticeBlock = document.getElementById('notice');
const copyButton = document.getElementById('copy-btn');
const clearButton = document.getElementById('clear-btn');
const more = document.getElementsByClassName('more')[0];
const textInput = document.getElementById('text-input');
const settingsButton = document.getElementById('settings-button');
const methodIndicator = document.getElementById('method-indicator');

const AUTO = 'auto';

// Incremented on every new translation (and on clear) so that stale responses are dropped
let requestId = 0;
// Last successful translation: { text, translation, detectedLanguage }
let lastResult = null;
// Set once Chrome refuses to create a translator (e.g. its instance limit is hit):
// retrying on every keystroke won't help, so use the API until the popup is reopened.
let aiBlocked = false;

swapButton.onclick = swapLanguages

copyButton.onclick = copyToClipboard;

clearButton.onclick = clearInput;

settingsButton.onclick = openSettings;

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await initializeSettings();

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        const [injectionResult] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => window.getSelection().toString().trim(),
        });
        const { result = '' } = injectionResult
        checkTextSize(result)
        textInput.value = result;
        onTranslate(result);
    } catch {
        // Restricted pages (chrome://, Web Store, new tab) don't allow script injection
    }
});

textInput.addEventListener('input', ({ target }) => checkTextSize(target.value))

textInput.addEventListener(
    'input',
    debounce(({ target }) => {
        const { value } = target;
        if (value) {
            onTranslate(value);
        } else {
            clearTranslation();
        }
    })
);

async function onTranslate(text) {
    if (!text) return;

    const id = ++requestId;
    const settings = await Settings.get();
    const { mainLanguage, secondaryLanguage } = settings;

    let sl, tl;
    if (await detectMainLanguage(text, mainLanguage)) {
        sl = mainLanguage;
        tl = secondaryLanguage;
    } else {
        // Chrome AI does not support 'auto' as a source language
        sl = settings.translationMethod === 'ai' ? await detectLanguageFromText(text, mainLanguage) : AUTO;
        tl = mainLanguage;
    }

    if (id !== requestId) return;
    getTranslate({ text, sl, tl });
}

function swapLanguages() {
    const sl = target.dataset.lang;
    const tl = source.dataset.lang === AUTO ? lastResult?.detectedLanguage : source.dataset.lang;

    // Nothing known to translate into (e.g. source is still "Detect language")
    if (!tl || tl === AUTO) return;

    swapLanguageInfo(sl, tl)

    // Move the translation into the input only if it belongs to the current text;
    // otherwise (error / no translation yet) re-translate the current text in the new direction.
    if (lastResult && lastResult.text === textInput.value) {
        textInput.value = lastResult.translation;
        checkTextSize(textInput.value)
    }
    clearTranslation();

    getTranslate({ text: textInput.value, sl, tl })
}

async function getTranslate({ text, sl, tl }) {
    if (!text) return;

    const id = ++requestId;
    translatedTextBlock.classList.add('fade');
    hideNotice();
    more.href = googleTranslateUrl(text, sl, tl);

    const settings = await Settings.get();
    let aiModelNotReady = null;
    let result;

    try {
        if (settings.translationMethod === 'ai' && !aiBlocked) {
            try {
                result = await AiTranslator.translate({ text, sourceLanguage: sl, targetLanguage: tl });
            } catch (aiError) {
                console.warn('AI translation failed, falling back to API:', aiError);
                if (aiError.code === AI_MODEL_NOT_READY) aiModelNotReady = aiError;
                if (aiError.name === 'NotSupportedError') aiBlocked = true;
                result = await ApiTranslator.translate({ text, sourceLanguage: sl, targetLanguage: tl });
            }
        } else {
            result = await ApiTranslator.translate({ text, sourceLanguage: sl, targetLanguage: tl });
        }
    } catch (error) {
        if (id !== requestId) return;
        console.error('Translation error:', error);
        lastResult = null;
        setError(error, text, sl, tl);
        showAiNotice(settings, aiModelNotReady, false);
        return;
    }

    if (id !== requestId) return;

    const { detectedLanguage, translation, method } = result;
    if (source.dataset.lang !== detectedLanguage || target.dataset.lang !== tl) {
        if (source.dataset.lang !== detectedLanguage && target.dataset.lang !== tl) {
            // change languages without rotate animation
            swapLanguageInfo(detectedLanguage, tl, false);
        } else {
            changeLanguageInfo(detectedLanguage, tl);
        }
    }

    lastResult = { text, translation, detectedLanguage };
    updateMethodIndicator(method, settings.translationMethod);
    setTranslation(translation);
    showAiNotice(settings, aiModelNotReady, method === 'api');
}

function showAiNotice(settings, aiModelNotReady, apiUsed) {
    if (settings.translationMethod !== 'ai') return;
    if (aiBlocked) showAiUnavailableNotice(apiUsed);
    else if (aiModelNotReady) showDownloadNotice(aiModelNotReady, apiUsed);
}

function setTranslation(translation) {
    translatedTextBlock.textContent = translation;
    translatedTextBlock.classList.remove('fade')
}

function setError(error, text, sl, tl) {
    const link = document.createElement('a');
    link.href = googleTranslateUrl(text, sl, tl);
    link.target = '_blank';
    link.textContent = 'Open in Google Translate...';

    translatedTextBlock.replaceChildren(
        // fetch() rejects with TypeError when the request never reached the server
        error instanceof TypeError || !navigator.onLine
            ? 'No connection to Google Translate. Check your network (VPN/proxy) and try again, or use the link below'
            : 'Something went wrong, click link below for fix',
        document.createElement('br'),
        link
    );
    translatedTextBlock.classList.remove('fade')
}

function clearTranslation() {
    requestId++;
    lastResult = null;
    hideNotice();
    setTranslation('');
}

// Pairs Chrome refused to download, remembered for the browser session so we don't nag
const FAILED_PAIRS_KEY = 'aiDownloadFailedPairs';

async function getFailedPairs() {
    try {
        const { [FAILED_PAIRS_KEY]: pairs = [] } = await chrome.storage.session.get(FAILED_PAIRS_KEY);
        return pairs;
    } catch {
        return [];
    }
}

async function rememberFailedPair(pair) {
    const pairs = await getFailedPairs();
    if (pairs.includes(pair)) return;
    try {
        await chrome.storage.session.set({ [FAILED_PAIRS_KEY]: [...pairs, pair] });
    } catch {
        // session storage unavailable — notice will just show again next time
    }
}

function showAiUnavailableNotice(apiUsed = true) {
    const message = document.createElement('span');
    message.textContent = 'Chrome AI is unavailable right now (Chrome refused to create a translator)'
        + (apiUsed ? ', Google API was used.' : '.') + ' Restarting Chrome usually helps.';
    noticeBlock.replaceChildren(message);
    noticeBlock.hidden = false;
}

async function showDownloadNotice({ sourceLanguage, targetLanguage }, apiUsed) {
    const pair = `${sourceLanguage}-${targetLanguage}`;
    if ((await getFailedPairs()).includes(pair)) return;

    const from = LANGUAGES[sourceLanguage] || sourceLanguage;
    const to = LANGUAGES[targetLanguage] || targetLanguage;

    const message = document.createElement('span');
    message.textContent = `Chrome AI model ${from} → ${to} is not downloaded`
        + (apiUsed ? ', Google API was used.' : '.');

    const button = document.createElement('button');
    button.className = 'notice-btn';
    button.textContent = 'Download AI model';
    button.onclick = () => downloadAiModel(sourceLanguage, targetLanguage, button);

    noticeBlock.replaceChildren(message, button);
    noticeBlock.hidden = false;
}

function hideNotice() {
    noticeBlock.hidden = true;
    noticeBlock.replaceChildren();
}

async function downloadAiModel(sourceLanguage, targetLanguage, button) {
    button.disabled = true;
    button.textContent = 'Downloading... 0%';

    try {
        await AiTranslator.downloadModel({
            sourceLanguage,
            targetLanguage,
            onProgress: loaded => button.textContent = `Downloading... ${Math.round(loaded * 100)}%`
        });
    } catch (error) {
        console.warn('AI model download failed:', error);
        if (error.name === 'NotSupportedError') {
            await rememberFailedPair(`${sourceLanguage}-${targetLanguage}`);
            aiBlocked = true;
            showAiUnavailableNotice();
        } else {
            button.disabled = false;
            button.textContent = 'Download failed, retry';
        }
        return;
    }

    hideNotice();
    getTranslate({ text: textInput.value, sl: sourceLanguage, tl: targetLanguage });
}

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
    source.dataset.lang = sl
    target.dataset.lang = tl

    source.classList.add('fade')
    target.classList.add('fade')

    if (withRotate) {
        swapButton.classList.toggle('rotate')
    }

    setTimeout(() => {
        source.textContent = LANGUAGES[source.dataset.lang] || 'UNKNOWN'
        target.textContent = LANGUAGES[target.dataset.lang] || 'UNKNOWN'
        source.classList.remove('fade')
        target.classList.remove('fade')
    }, 150)
}

function checkTextSize(text) {
    const isLong = text.length > 300;
    textInput.classList.toggle('small', isLong)
    translatedTextBlock.classList.toggle('small', isLong)
}

function clearInput() {
    textInput.value = ''
    checkTextSize('')
    clearTranslation();
}

function copyToClipboard() {
    const text = lastResult?.translation;
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
        copyButton.classList.add('copied');
        setTimeout(() => {
            copyButton.classList.remove('copied');
        }, 1000);
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
}

function debounce(func) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func(...args), 500);
    };
}

async function initializeSettings() {
    const settings = await Settings.get();
    updateMethodIndicator(settings.translationMethod, settings.translationMethod);
}

function updateMethodIndicator(method, preferredMethod) {
    methodIndicator.textContent = method === 'ai' ? 'AI' : 'API';
    methodIndicator.classList.toggle('ai', method === 'ai');
    methodIndicator.title = method !== preferredMethod
        ? 'Chrome AI was unavailable, Google Translate API was used'
        : 'Translation Method';
}

function openSettings() {
    chrome.runtime.openOptionsPage();
}

const LANGUAGE_PATTERNS = {
    'en': /\b(the|and|for|are|but|not|you|all|can|had|her|was|one|our|out|day|get|has|him|his|how|man|new|now|old|see|two|way|who|boy|did|its|let|put|say|she|too|use)\b/i,
    'ru': /[а-яёА-ЯЁ]/,
    'ja': /[぀-ゟ゠-ヿ]/,
    'ko': /[가-힯]/,
    'zh': /[一-鿿]/,
    'ar': /[؀-ۿ]/,
    'th': /[฀-๿]/,
    'hi': /[ऀ-ॿ]/,
    'he': /[֐-׿]/,
    'de': /[äöüßÄÖÜ]|\b(der|die|das|und|ist|ich|sie|mit|auf|für|ein|von|zu|im|den|dem|einer|eine|einem|einen|wird|aus|am|bei|nach|über|durch|gegen|ohne|um|unter|vor|zwischen)\b/i,
    'fr': /[àâäçéèêëîïôöùûüÿÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ]|\b(le|la|les|un|une|des|de|du|et|est|il|elle|je|tu|nous|vous|ils|elles|ce|cette|ces|son|sa|ses|mon|ma|mes|ton|ta|tes|notre|votre|leur|leurs)\b/i,
    'es': /[ñáéíóúüÑÁÉÍÓÚÜ]|\b(el|la|los|las|un|una|de|del|y|es|en|que|por|con|para|su|sus|mi|mis|tu|tus|se|te|me|nos|os|le|les|lo|al)\b/i,
    'it': /[àèéìíîòóùúÀÈÉÌÍÎÒÓÙÚ]|\b(il|la|lo|gli|le|un|una|di|del|della|dei|delle|e|è|in|che|per|con|su|sua|sue|suo|suoi|mia|mie|mio|miei|tua|tue|tuo|tuoi|si|ci|vi|li)\b/i,
    'pt': /[àáâãäçéêëíîïóôõöúûüÀÁÂÃÄÇÉÊËÍÎÏÓÔÕÖÚÛÜ]|\b(o|a|os|as|um|uma|de|do|da|dos|das|e|é|em|que|por|com|para|seu|sua|seus|suas|meu|minha|meus|minhas|teu|tua|teus|tuas|se|te|me|nos|vos|lhe|lhes)\b/i
};

// One detector per popup: creating a new one on every keystroke leaks instances
// and counts towards Chrome's built-in AI limits.
let detectorPromise = null;
function getLanguageDetector() {
    detectorPromise ??= LanguageDetector.create().catch(error => {
        detectorPromise = null;
        throw error;
    });
    return detectorPromise;
}

// Language detection helper functions
async function detectLanguageFromText(text, fallbackLanguage = 'en') {
    try {
        // Try Chrome AI Language Detection API first
        if (self.LanguageDetector) {
            const detector = await getLanguageDetector();
            const results = await detector.detect(text);
            
            // Return the most confident result
            if (results && results.length > 0) {
                const topResult = results[0];
                // Only use the result if confidence is reasonable
                if (topResult.confidence > 0.1) {
                    return topResult.detectedLanguage;
                }
            }
        }
    } catch (error) {
        console.warn('Chrome AI Language Detection failed, falling back to pattern matching:', error);
    }

    // Fallback to pattern-based detection
    // Check for specific language patterns
    for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
        if (pattern.test(text)) {
            return lang;
        }
    }

    // If no specific pattern matches, assume it's Latin-based (fallback language)
    return fallbackLanguage;
}

async function detectMainLanguage(text, mainLanguage) {
    try {
        // Try Chrome AI Language Detection API first for better accuracy
        if (self.LanguageDetector) {
            const detector = await getLanguageDetector();
            const results = await detector.detect(text);

            // If any result matches the main language, return true
            if (results && results.some(r => r.detectedLanguage === mainLanguage && r.confidence > 0.1)) {
                return true;
            }
        }
    } catch (error) {
        console.warn('Chrome AI Language Detection failed in detectMainLanguage, falling back to pattern matching:', error);
    }

    // Fallback to pattern-based detection
    // If we have a pattern for the main language, use it
    if (LANGUAGE_PATTERNS[mainLanguage]) {
        return LANGUAGE_PATTERNS[mainLanguage].test(text);
    }

    // For languages without specific patterns, use the heuristic approach
    // we assume if text doesn't contain non-Latin characters, it might be the main language
    // This is a simple heuristic and not perfect
    const hasNonLatinChars = /[^\u0000-\u024F\u1E00-\u1EFF]/.test(text);
    
    // If main language is Latin-based and text has no non-Latin chars, assume it's main language
    const latinLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt'];
    if (latinLanguages.includes(mainLanguage) && !hasNonLatinChars) {
        return true;
    }

    // If main language is Latin-based but text has non-Latin chars, it's probably not main language
    if (latinLanguages.includes(mainLanguage) && hasNonLatinChars) {
        return false;
    }

    // Default fallback - if unsure, return false to auto-detect
    return false;
}