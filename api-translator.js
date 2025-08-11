'use strict';

export class ApiTranslator {
    static async translate({ text, sourceLanguage, targetLanguage }) {
        if (!text) {
            throw new Error('No text provided for translation');
        }

        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dj=1&sl=${sourceLanguage}&tl=${targetLanguage}&q=${encodeURIComponent(text)}`;

        try {
            const delay = new Promise(resolve => setTimeout(resolve, 100));
            const [response] = await Promise.all([fetch(url), delay]);

            if (!response.ok) {
                throw new Error(`Translation request failed: ${response.status}`);
            }

            const data = await response.json();
            const { sentences, src } = data;

            if (sentences && sentences.length > 0) {
                const translation = sentences.map(({ trans }) => trans).join('');
                return {
                    translation,
                    detectedLanguage: src,
                    sourceLanguage: src,
                    targetLanguage
                };
            } else {
                throw new Error('No translation returned from API');
            }
        } catch (error) {
            console.error('API Translation error:', error);
            throw error;
        }
    }

    static createFallbackUrl(text, sourceLanguage, targetLanguage) {
        return `https://translate.google.com/#${sourceLanguage}/${targetLanguage}/${encodeURIComponent(text)}`;
    }
}