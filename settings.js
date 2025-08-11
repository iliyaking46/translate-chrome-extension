'use strict';

export const DEFAULT_SETTINGS = {
    translationMethod: 'ai', // 'api' or 'ai'
    mainLanguage: 'ru',
    secondaryLanguage: 'en'
};

export class Settings {
    static async get() {
        try {
            const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
            return { ...DEFAULT_SETTINGS, ...result };
        } catch (error) {
            console.error('Error loading settings:', error);
            return DEFAULT_SETTINGS;
        }
    }

    static async set(settings) {
        try {
            // Check if chrome.storage is available
            if (!chrome?.storage?.sync) {
                console.warn('Chrome storage not available, cannot save settings');
                return false;
            }
            
            await chrome.storage.sync.set(settings);
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    }

    static async reset() {
        try {
            // Check if chrome.storage is available
            if (!chrome?.storage?.sync) {
                console.warn('Chrome storage not available, cannot reset settings');
                return false;
            }
            
            await chrome.storage.sync.clear();
            await chrome.storage.sync.set(DEFAULT_SETTINGS);
            return true;
        } catch (error) {
            console.error('Error resetting settings:', error);
            return false;
        }
    }
}