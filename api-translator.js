export function googleTranslateUrl(text, sourceLanguage, targetLanguage) {
    return `https://translate.google.com/#${sourceLanguage}/${targetLanguage}/${encodeURIComponent(text)}`;
}

export class ApiTranslator {
    static async translate({ text, sourceLanguage, targetLanguage }) {
        if (!text) {
            throw new Error('No text provided for translation');
        }

        const params = new URLSearchParams({
            client: 'gtx',
            dt: 't',
            dj: '1',
            sl: sourceLanguage,
            tl: targetLanguage,
            q: text
        });
        const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`);

        if (!response.ok) {
            throw new Error(`Translation request failed: ${response.status}`);
        }

        const { sentences, src } = await response.json();

        if (!sentences?.length) {
            throw new Error('No translation returned from API');
        }

        return {
            translation: sentences.map(({ trans }) => trans).join(''),
            detectedLanguage: src,
            sourceLanguage: src,
            targetLanguage,
            method: 'api'
        };
    }
}
