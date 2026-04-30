// cache fora do DOMContentLoaded para ser acessível globalmente
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
                body: JSON.stringify({ textos: toTranslate, lang: targetLanguage, source:currentLanguage})
            });
            const data = await res.json();
            
            console.log(data)
            // salva tudo no cache de uma vez
            toTranslate.forEach((text, i) => {
                translationCache[`${text}_${targetLanguage}`] = data.traducoes[i];
            });
        } catch (err) {
            console.error('Erro na tradução em lote:', err);
        }
    }

    // devolve do cache
    return texts.map(t => translationCache[`${t}_${targetLanguage}`] || t);
}

async function putLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('idioma', lang);

    // ── textos normais ──────────────────────────────
    const elements = document.querySelectorAll('[data-i18n]');

    // salva o original em pt só na primeira vez
    elements.forEach(el => {
        if (!el.dataset.original) {
            el.dataset.original = el.textContent.trim();
        }
    });

    // traduz tudo em uma única requisição
    const textos = Array.from(elements).map(el => el.dataset.original);
    const traduzidos = await translateAll(textos, lang);

    // aplica na página
    elements.forEach((el, i) => {
        if (traduzidos[i]) el.textContent = traduzidos[i];
    });

    // ── placeholders ────────────────────────────────
    const inputs = document.querySelectorAll('[data-i18n-placeholder]');

    inputs.forEach(el => {
        if (!el.dataset.originalPlaceholder) {
            el.dataset.originalPlaceholder = el.placeholder;
        }
    });

    const placeholders = Array.from(inputs).map(el => el.dataset.originalPlaceholder);
    const traduzidosPlaceholders = await translateAll(placeholders, lang);

    inputs.forEach((el, i) => {
        if (traduzidosPlaceholders[i]) el.placeholder = traduzidosPlaceholders[i];
    });
}

// aplica o idioma salvo ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    putLanguage(currentLanguage);
});
