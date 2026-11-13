export const AI_MODEL_NOT_READY = 'AI_MODEL_NOT_READY';

// Chrome limits how many translator instances can exist at once, so keep a single
// instance for the current language pair and destroy it when the pair changes.
let cached = null; // { key, translator }

async function getTranslator(sourceLanguage, targetLanguage, options = {}) {
    const key = `${sourceLanguage}-${targetLanguage}`;
    if (cached?.key === key) return cached.translator;

    cached?.translator.destroy?.();
    cached = null;

    const translator = await Translator.create({ sourceLanguage, targetLanguage, ...options });
    cached = { key, translator };
    return translator;
}

export class AiTranslator {
    static async translate({ text, sourceLanguage, targetLanguage }) {
        if (!text) {
            throw new Error('No text provided for translation');
        }

        if (!self.Translator) {
            throw new Error('Chrome AI Translation API is not available in this browser');
        }

        const availability = await Translator.availability({ sourceLanguage, targetLanguage });

        if (availability === 'unavailable') {
            throw new Error(`Translation from ${sourceLanguage} to ${targetLanguage} is not supported by Chrome AI`);
        }

        // 'downloadable' / 'downloading': creating a translator here would start a download
        // without user activation, so let the UI ask the user to download explicitly.
        if (availability !== 'available') {
            const error = new Error(`Chrome AI model for ${sourceLanguage} → ${targetLanguage} is not downloaded`);
            error.code = AI_MODEL_NOT_READY;
            error.sourceLanguage = sourceLanguage;
            error.targetLanguage = targetLanguage;
            throw error;
        }

        const translator = await getTranslator(sourceLanguage, targetLanguage);
        const translation = await translator.translate(text);

        return {
            translation,
            detectedLanguage: sourceLanguage,
            sourceLanguage,
            targetLanguage,
            method: 'ai'
        };
    }

    // Must be called from a user gesture (click), otherwise Chrome refuses to download the model.
    static async downloadModel({ sourceLanguage, targetLanguage, onProgress }) {
        await getTranslator(sourceLanguage, targetLanguage, {
            monitor(monitor) {
                monitor.addEventListener('downloadprogress', ({ loaded }) => onProgress?.(loaded));
            }
        });
    }
}
