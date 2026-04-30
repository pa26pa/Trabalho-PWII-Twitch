const translationCache = {};
let currentLanguage = localStorage.getItem('idioma') || 'pt';

async function translateAll(texts, targetLanguage) {
    if (targetLanguage === 'pt') return texts;

    // filtra só os que não estão no cache ainda
    const toTranslate = texts.filter(t => !translationCache[`${t}_${targetLanguage}`]);

    if (toTranslate.length > 0) {
        try {
            const res = await fetch('/traduzir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    textos: toTranslate, 
                    lang: targetLanguage, 
                    source: 'pt'
                })
            });
            const data = await res.json();

            toTranslate.forEach((text, i) => {
                translationCache[`${text}_${targetLanguage}`] = data.traducoes[i];
            });
        } catch (err) {
            console.error('Erro na tradução em lote:', err);
        }
    }

    return texts.map(t => translationCache[`${t}_${targetLanguage}`] || t);
}

async function putLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('idioma', lang);

    const elements = document.querySelectorAll('[data-i18n]');
    const textos = Array.from(elements).map(el => el.dataset.original);
    const traduzidos = await translateAll(textos, lang);

    elements.forEach((el, i) => {
        if (traduzidos[i]) el.textContent = traduzidos[i];
    });

    const inputs = document.querySelectorAll('[data-i18n-placeholder]');
    const placeholders = Array.from(inputs).map(el => el.dataset.originalPlaceholder);
    const traduzidosPlaceholders = await translateAll(placeholders, lang);

    inputs.forEach((el, i) => {
        if (traduzidosPlaceholders[i]) el.placeholder = traduzidosPlaceholders[i];
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    // salva originais em pt antes de tudo
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.dataset.original = el.textContent.trim();
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.dataset.originalPlaceholder = el.placeholder;
    });

    // aplica o idioma salvo PRIMEIRO — sem travar a página
    await putLanguage(currentLanguage);

    // pré-carrega os outros idiomas em segundo plano (sem await)
    const outrosIdiomas = ['en', 'es', 'pt'].filter(l => l !== currentLanguage);
    Promise.all(outrosIdiomas.map(lang => putLanguage(lang))); // ← sem await!
});