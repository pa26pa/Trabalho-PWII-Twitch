//cache para não chamar a API toda vez para o mesmo texto
const translationCache = {};

async function translateText(text, targetLanguage) {
    if (targetLanguage === 'pt') return text; // Retorna o texto original

    const cacheKey = `${text}_${targetLanguage}`;
    if (translationCache[cacheKey]) return translationCache[cacheKey];//retorna do cache se já foi traduzido

    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=pt|${targetLanguage}`;
        const response = await fetch(url);
        const data = await response.json();
        const translate = data.responseData.translatedText;

        translationCache[cacheKey] = translate;//salva no cache
        return translate;
    } catch (err) {
        console.error('Erro na tradução:', err);
        return text; // Retorna o texto original em caso de erro
    }
}

async function putLanguage(lang) {
    console.log('aplicando idioma:', lang);
    localStorage.setItem('idioma', lang);

    const elements = document.querySelectorAll('[data-i18n]');
    console.log('elementos encontrados:', elements.length);

    //traduz todos em paralelo (mais rápido que um por um)
    await Promise.all(Array.from(elements).map(async el => {
        //guarda o texto original em português no próprio elemento
        if (!el.dataset.original) {
            el.dataset.original = el.textContent.trim();
        }

        const translated = await translateText(el.dataset.original, lang);
        el.textContent = translated;
    }));

    //traduz placeholders
    const inputs = document.querySelectorAll('[data-i18n-placeholder]');
    await Promise.all(Array.from(inputs).map(async el => {
        if (!el.dataset.originalPlaceholder) {
            el.dataset.originalPlaceholder = el.placeholder;
        }

        const translated = await translateText(el.dataset.originalPlaceholder, lang);
        el.placeholder = translated;
    }));
}

document.addEventListener('DOMContentLoaded', () => {
    //aplica ao carregar a página
    const savedLanguage = localStorage.getItem('idioma') || 'pt';
    putLanguage(savedLanguage);
});