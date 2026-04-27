// cache fora do DOMContentLoaded para ser acessível globalmente
const translationCache = {};

async function translateText(text, targetLanguage) {
    if (targetLanguage === 'pt') return text;

    const cacheKey = `${text}_${targetLanguage}`;
    if (translationCache[cacheKey]) return translationCache[cacheKey];

    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=pt|${targetLanguage}`;
        const response = await fetch(url);
        const data = await response.json();
        const translate = data.responseData.translatedText;

        translationCache[cacheKey] = translate; // ← era 'transslateCache' (typo)
        return translate;
    } catch (err) {
        console.error('Erro na tradução:', err);
        return text;
    }
}

// função fora do DOMContentLoaded para o script.js conseguir chamar
async function putLanguage(lang) {
    console.log('aplicando idioma:', lang);
    localStorage.setItem('idioma', lang);

    const elements = document.querySelectorAll('[data-i18n]');
    console.log('elementos encontrados:', elements.length); // ← era 'elementos' (errado)

    await Promise.all(Array.from(elements).map(async el => {
        if (!el.dataset.original) {
            el.dataset.original = el.textContent.trim();
        }
        const translated = await translateText(el.dataset.original, lang);
        el.textContent = translated;
    }));

    const inputs = document.querySelectorAll('[data-i18n-placeholder]');
    await Promise.all(Array.from(inputs).map(async el => {
        if (!el.dataset.originalPlaceholder) {
            el.dataset.originalPlaceholder = el.placeholder;
        }
        const translated = await translateText(el.dataset.originalPlaceholder, lang);
        el.placeholder = translated;
    }));
}

// aplica ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    const savedLanguage = localStorage.getItem('idioma') || 'pt';
    putLanguage(savedLanguage);
});