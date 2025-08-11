'use strict';

export class AiTranslator {
    static async translate({ text, sourceLanguage, targetLanguage }) {
        if (!text) {
            throw new Error('No text provided for translation');
        }

        try {
            // Check if Chrome AI Translation API is available
            if (!self.Translator) {
                throw new Error('Chrome AI Translation API is not available in this browser');
            }

            // Check if the language pair is supported
            const availability = await Translator.availability({ 
                sourceLanguage, 
                targetLanguage 
            });

            if (availability === 'unavailable') {
                throw new Error(`Translation from ${sourceLanguage} to ${targetLanguage} is not supported by Chrome AI`);
            }

            // Create translator instance
            const translator = await Translator.create({ 
                sourceLanguage, 
                targetLanguage 
            });

            // Perform translation
            const translation = await translator.translate(text);

            return {
                translation,
                detectedLanguage: sourceLanguage,
                sourceLanguage,
                targetLanguage
            };

        } catch (error) {
            console.error('AI Translation error:', error);
            throw error;
        }
    }

    static async isAvailable() {
        try {
            return typeof self.Translator !== 'undefined';
        } catch (error) {
            return false;
        }
    }

    static async getSupportedLanguages() {
        try {
            if (!self.Translator) {
                return [];
            }
            // This would return supported language pairs
            // For now, return common ones as placeholder
            return ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'];
        } catch (error) {
            console.error('Error getting supported languages:', error);
            return [];
        }
    }
}