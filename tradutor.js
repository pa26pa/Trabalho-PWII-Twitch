// cache fora do DOMContentLoaded para ser acessível globalmente
const translationCache = {};

async function translateText(text, targetLanguage) {
    if (targetLanguage === 'pt') return text;

    const cacheKey = `${text}_${targetLanguage}`;
    if (translationCache[cacheKey]) return translationCache[cacheKey];

    try {
        const res = await fetch('/traduzir', {  // ← chama o backend
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texto: text, lang: targetLanguage })
        });
        const data = await res.json();
        translationCache[cacheKey] = data.traducao;
        return data.traducao;
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