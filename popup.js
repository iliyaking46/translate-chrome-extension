'use strict';
import { LANGUAGES } from './languages.js';
import { Settings } from './settings.js';
import { ApiTranslator } from './api-translator.js';
import { AiTranslator } from './ai-translator.js';

const swapButton = document.getElementById('swap-button');
const [source, target] = document.getElementsByClassName('lang')
const translatedTextBlock = document.getElementById('translation');
const copyButton = document.getElementById('copy-btn');
const clearButton = document.getElementById('clear-btn');
const more = document.getElementsByClassName('more')[0];
const textInput = document.getElementById('text-input');
const settingsButton = document.getElementById('settings-button');
const methodIndicator = document.getElementById('method-indicator');

const LANGUAGE_CODES = {
    EN: 'en',
    RU: 'ru',
    AUTO: 'auto',
}

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
            onTranslate(value);
        } else {
            setTranslation({ translation: '' })
        }
    })
);

async function onTranslate(data) {
    if (!data) return;
    const text = typeof data === 'string' ? data : data[0];
    if (!text) return;

    try {
        // Get user settings for language preferences
        const settings = await Settings.get();
        const { mainLanguage, secondaryLanguage } = settings;

        // Determine source and target languages based on settings
        let sl, tl;
        
        // Simple language detection - check if text contains characters from main language
        const isMainLanguage = await detectMainLanguage(text, mainLanguage);
        
        if (isMainLanguage) {
            // Text is in main language, translate to secondary
            sl = mainLanguage;
            tl = secondaryLanguage;
        } else {
            // Text is not in main language, translate to main
            // For AI translation, we need to detect the actual language since 'auto' is not supported
            if (settings.translationMethod === 'ai') {
                sl = await detectLanguageFromText(text, mainLanguage);
            } else {
                sl = LANGUAGE_CODES.AUTO; // Auto-detect source (API only)
            }
            tl = mainLanguage;
        }

        getTranslate({ text, sl, tl });
    } catch (error) {
        console.error('Error in onTranslate:', error);
        // Fallback to old logic if settings fail
        const { sl, tl } = /[а-яёА-ЯЁ]+/.test(text) ? {
            sl: LANGUAGE_CODES.RU,
            tl: LANGUAGE_CODES.EN
        } : { sl: LANGUAGE_CODES.AUTO, tl: LANGUAGE_CODES.RU };

        getTranslate({ text, sl, tl });
    }
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

    translatedTextBlock.classList.add('fade');

    try {
        // Get current settings to determine translation method
        const settings = await Settings.get();
        
        // Set fallback URL for Google Translate
        more.href = `https://translate.google.com/#${sl}/${tl}/${encodeURIComponent(text)}`;

        let result;
        
        if (settings.translationMethod === 'ai') {
            // Use Chrome AI Translation
            try {
                result = await AiTranslator.translate({
                    text,
                    sourceLanguage: sl,
                    targetLanguage: tl
                });
            } catch (aiError) {
                console.warn('AI translation failed, falling back to API:', aiError);
                // Fallback to API if AI fails
                result = await ApiTranslator.translate({
                    text,
                    sourceLanguage: sl,
                    targetLanguage: tl
                });
            }
        } else {
            // Use Google API Translation
            result = await ApiTranslator.translate({
                text,
                sourceLanguage: sl,
                targetLanguage: tl
            });
        }

        // Update language info if detection changed
        const { detectedLanguage, translation } = result;
        if (source.dataset.lang !== detectedLanguage || target.dataset.lang !== tl) {
            if (source.dataset.lang !== detectedLanguage && target.dataset.lang !== tl) {
                // change languages without rotate animation
                swapLanguageInfo(detectedLanguage, tl, false);
            } else {
                changeLanguageInfo(detectedLanguage, tl);
            }
        }

        // Display translation
        setTranslation({ translation });

    } catch (error) {
        console.error('Translation error:', error);
        
        // Create fallback error message
        const fallbackUrl = ApiTranslator.createFallbackUrl(text, sl, tl);
        let errorMessage;
        
        if (error.message.includes('Chrome AI')) {
            errorMessage = `Chrome AI translation not available. <br/><a href="${fallbackUrl}" target="_blank">Try Google Translate</a>`;
        } else {
            errorMessage = `Something went wrong, click link below for fix<br/><a href="${fallbackUrl}" target="_blank">Open in Google Translate...</a>`;
        }
        
        setTranslation({ translation: errorMessage, error: true });
    }
}

function setTranslation({ translation, error }) {
    if (error) {
        translatedTextBlock.innerHTML = translation;
    } else {
        translatedTextBlock.innerText = translation;
    }
    translatedTextBlock.classList.remove('fade')
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
    if (text.length > 300 && !textInput.classList.contains('small')) {
        textInput.classList.add('small')
        translatedTextBlock.classList.add('small')
    }

    if (text.length <= 300 && textInput.classList.contains('small')) {
        textInput.classList.remove('small')
        translatedTextBlock.classList.remove('small')
    }
}

function clearInput() {
    textInput.value = ''
    setTranslation({ translation: '' })
}

function copyToClipboard() {
    const text = translatedTextBlock.innerText;
    if (!text) return; // Не копировать, если текста нет

    navigator.clipboard.writeText(text).then(() => {
        // Успешно скопировано
        copyButton.classList.add('copied');

        // Убираем класс через 2 секунды
        setTimeout(() => {
            copyButton.classList.remove('copied');
        }, 1000);
    }).catch(err => {
        // Обработка ошибки копирования, если нужно
        console.error('Could not copy text: ', err);
    });
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

async function initializeSettings() {
    try {
        const settings = await Settings.get();
        updateMethodIndicator(settings.translationMethod);
    } catch (error) {
        console.error('Error initializing settings:', error);
    }
}

function updateMethodIndicator(method) {
    methodIndicator.textContent = method === 'ai' ? 'AI' : 'API';
    methodIndicator.classList.toggle('ai', method === 'ai');
}

function openSettings() {
    chrome.runtime.openOptionsPage();
}

// Language detection helper functions
async function detectLanguageFromText(text, fallbackLanguage = 'en') {
    try {
        // Try Chrome AI Language Detection API first
        if (self.LanguageDetector) {
            const detector = await LanguageDetector.create();
            const results = await detector.detect(text);
            
            // Return the most confident result
            if (results && results.length > 0) {
                const topResult = results[0];
                // Only use the result if confidence is reasonable
                if (topResult.confidence > 0.5) {
                    return topResult.detectedLanguage;
                }
            }
        }
    } catch (error) {
        console.warn('Chrome AI Language Detection failed, falling back to pattern matching:', error);
    }

    // Fallback to pattern-based detection
    const languagePatterns = {
        'en': /\b(the|and|for|are|but|not|you|all|can|had|her|was|one|our|out|day|get|has|him|his|how|man|new|now|old|see|two|way|who|boy|did|its|let|put|say|she|too|use)\b/i,
        'ru': /[а-яёА-ЯЁ]/,
        'ja': /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/,
        'ko': /[\uAC00-\uD7AF]/,
        'zh': /[\u4E00-\u9FFF]/,
        'ar': /[\u0600-\u06FF]/,
        'th': /[\u0E00-\u0E7F]/,
        'hi': /[\u0900-\u097F]/,
        'he': /[\u0590-\u05FF]/,
        'de': /[äöüßÄÖÜ]|\b(der|die|das|und|ist|ich|sie|mit|auf|für|ein|von|zu|im|den|dem|einer|eine|einem|einen|wird|aus|am|bei|nach|über|durch|gegen|ohne|um|unter|vor|zwischen)\b/i,
        'fr': /[àâäçéèêëîïôöùûüÿÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ]|\b(le|la|les|un|une|des|de|du|et|est|il|elle|je|tu|nous|vous|ils|elles|ce|cette|ces|son|sa|ses|mon|ma|mes|ton|ta|tes|notre|votre|leur|leurs)\b/i,
        'es': /[ñáéíóúüÑÁÉÍÓÚÜ]|\b(el|la|los|las|un|una|de|del|y|es|en|que|por|con|para|su|sus|mi|mis|tu|tus|se|te|me|nos|os|le|les|lo|al)\b/i,
        'it': /[àèéìíîòóùúÀÈÉÌÍÎÒÓÙÚ]|\b(il|la|lo|gli|le|un|una|di|del|della|dei|delle|e|è|in|che|per|con|su|sua|sue|suo|suoi|mia|mie|mio|miei|tua|tue|tuo|tuoi|si|ci|vi|li)\b/i,
        'pt': /[àáâãäçéêëíîïóôõöúûüÀÁÂÃÄÇÉÊËÍÎÏÓÔÕÖÚÛÜ]|\b(o|a|os|as|um|uma|de|do|da|dos|das|e|é|em|que|por|com|para|seu|sua|seus|suas|meu|minha|meus|minhas|teu|tua|teus|tuas|se|te|me|nos|vos|lhe|lhes)\b/i
    };

    // Check for specific language patterns
    for (const [lang, pattern] of Object.entries(languagePatterns)) {
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
            const detector = await LanguageDetector.create();
            const results = await detector.detect(text);
            
            // Check if the detected language matches the main language
            if (results && results.length > 0) {
                const topResult = results[0];
                // Only use the result if confidence is reasonable
                if (topResult.confidence > 0.5) {
                    return topResult.detectedLanguage === mainLanguage;
                }
            }
        }
    } catch (error) {
        console.warn('Chrome AI Language Detection failed in detectMainLanguage, falling back to pattern matching:', error);
    }

    // Fallback to pattern-based detection
    const languagePatterns = {
        'en': /\b(the|and|for|are|but|not|you|all|can|had|her|was|one|our|out|day|get|has|him|his|how|man|new|now|old|see|two|way|who|boy|did|its|let|put|say|she|too|use)\b/i,
        'ru': /[а-яёА-ЯЁ]/,
        'ja': /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/,
        'ko': /[\uAC00-\uD7AF]/,
        'zh': /[\u4E00-\u9FFF]/,
        'ar': /[\u0600-\u06FF]/,
        'th': /[\u0E00-\u0E7F]/,
        'hi': /[\u0900-\u097F]/,
        'he': /[\u0590-\u05FF]/,
        'de': /[äöüßÄÖÜ]|\b(der|die|das|und|ist|ich|sie|mit|auf|für|ein|von|zu|im|den|dem|einer|eine|einem|einen|wird|aus|am|bei|nach|über|durch|gegen|ohne|um|unter|vor|zwischen)\b/i,
        'fr': /[àâäçéèêëîïôöùûüÿÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ]|\b(le|la|les|un|une|des|de|du|et|est|il|elle|je|tu|nous|vous|ils|elles|ce|cette|ces|son|sa|ses|mon|ma|mes|ton|ta|tes|notre|votre|leur|leurs)\b/i,
        'es': /[ñáéíóúüÑÁÉÍÓÚÜ]|\b(el|la|los|las|un|una|de|del|y|es|en|que|por|con|para|su|sus|mi|mis|tu|tus|se|te|me|nos|os|le|les|lo|al)\b/i,
        'it': /[àèéìíîòóùúÀÈÉÌÍÎÒÓÙÚ]|\b(il|la|lo|gli|le|un|una|di|del|della|dei|delle|e|è|in|che|per|con|su|sua|sue|suo|suoi|mia|mie|mio|miei|tua|tue|tuo|tuoi|si|ci|vi|li)\b/i,
        'pt': /[àáâãäçéêëíîïóôõöúûüÀÁÂÃÄÇÉÊËÍÎÏÓÔÕÖÚÛÜ]|\b(o|a|os|as|um|uma|de|do|da|dos|das|e|é|em|que|por|com|para|seu|sua|seus|suas|meu|minha|meus|minhas|teu|tua|teus|tuas|se|te|me|nos|vos|lhe|lhes)\b/i
    };

    // If we have a pattern for the main language, use it
    if (languagePatterns[mainLanguage]) {
        return languagePatterns[mainLanguage].test(text);
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