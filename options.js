'use strict';
import { Settings } from './settings.js';

const optionsForm = document.getElementById('options-form');
const saveButton = document.getElementById('save-button');
const resetButton = document.getElementById('reset-button');
const statusMessage = document.getElementById('status-message');
const apiOption = document.getElementById('api-option');
const aiOption = document.getElementById('ai-option');

document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    setupRadioOptions();
});

optionsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveSettings();
});

resetButton.addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
        await resetSettings();
    }
});

function setupRadioOptions() {
    // Handle radio option visual selection
    [apiOption, aiOption].forEach(option => {
        option.addEventListener('click', () => {
            const radio = option.querySelector('input[type="radio"]');
            radio.checked = true;
            updateRadioStyles();
        });
    });
    
    // Handle radio input changes
    document.querySelectorAll('input[name="translationMethod"]').forEach(radio => {
        radio.addEventListener('change', updateRadioStyles);
    });
}

function updateRadioStyles() {
    [apiOption, aiOption].forEach(option => {
        const radio = option.querySelector('input[type="radio"]');
        option.classList.toggle('selected', radio.checked);
    });
}

async function loadSettings() {
    try {
        const settings = await Settings.get();
        
        // Set translation method
        document.querySelector(`input[name="translationMethod"][value="${settings.translationMethod}"]`).checked = true;
        
        // Set main language
        document.getElementById('main-language').value = settings.mainLanguage;
        
        // Set secondary language
        document.getElementById('secondary-language').value = settings.secondaryLanguage;
        
        // Update radio styles
        updateRadioStyles();
        
    } catch (error) {
        console.error('Error loading settings:', error);
        showStatusMessage('Error loading settings', 'error');
    }
}

async function saveSettings() {
    try {
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';
        
        const formData = new FormData(optionsForm);
        const settings = {
            translationMethod: formData.get('translationMethod'),
            mainLanguage: formData.get('mainLanguage'),
            secondaryLanguage: formData.get('secondaryLanguage')
        };
        
        const success = await Settings.set(settings);
        
        if (success) {
            saveButton.textContent = 'Saved!';
            showStatusMessage('Settings saved successfully!', 'success');
            setTimeout(() => {
                saveButton.textContent = 'Save Settings';
                saveButton.disabled = false;
            }, 1000);
        } else {
            throw new Error('Failed to save settings');
        }
        
    } catch (error) {
        console.error('Error saving settings:', error);
        saveButton.textContent = 'Error saving';
        showStatusMessage('Failed to save settings', 'error');
        setTimeout(() => {
            saveButton.textContent = 'Save Settings';
            saveButton.disabled = false;
        }, 2000);
    }
}

async function resetSettings() {
    try {
        resetButton.disabled = true;
        resetButton.textContent = 'Resetting...';
        
        const success = await Settings.reset();
        
        if (success) {
            await loadSettings();
            resetButton.textContent = 'Reset Complete';
            showStatusMessage('Settings reset to defaults', 'success');
            setTimeout(() => {
                resetButton.textContent = 'Reset to Defaults';
                resetButton.disabled = false;
            }, 1000);
        } else {
            throw new Error('Failed to reset settings');
        }
        
    } catch (error) {
        console.error('Error resetting settings:', error);
        resetButton.textContent = 'Error resetting';
        showStatusMessage('Failed to reset settings', 'error');
        setTimeout(() => {
            resetButton.textContent = 'Reset to Defaults';
            resetButton.disabled = false;
        }, 2000);
    }
}

function showStatusMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.classList.add('show');
    
    setTimeout(() => {
        statusMessage.classList.remove('show');
    }, 3000);
}