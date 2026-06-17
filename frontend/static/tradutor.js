const translationCache = {};

// detecta idioma do dispositivo se não houver preferência salva
function detectarIdioma() {
    return localStorage.getItem('idioma') || 'pt'; // ← padrão sempre pt
}

let currentLanguage = detectarIdioma();

async function translateAll(texts, targetLanguage) {
    if (targetLanguage === 'pt') return texts;

    const toTranslate = texts.filter(t => t && !translationCache[`${t}_${targetLanguage}`]);

    if (toTranslate.length > 0) {
        try {
            const res = await fetch('/traduzir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ textos: toTranslate, lang: targetLanguage, source: 'pt' })
            });
            const data = await res.json();
            toTranslate.forEach((text, i) => {
                if (data.traducoes[i]) translationCache[`${text}_${targetLanguage}`] = data.traducoes[i];
            });
        } catch (err) {
            console.error('Erro na tradução:', err);
        }
    }

    return texts.map(t => translationCache[`${t}_${targetLanguage}`] || t);
}

async function putLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('idioma', lang); // persiste escolha

    const elements = document.querySelectorAll('[data-i18n]');
    const textos = Array.from(elements).map(el => el.dataset.original || el.textContent.trim());
    const traduzidos = await translateAll(textos, lang);
    elements.forEach((el, i) => { if (traduzidos[i]) el.textContent = traduzidos[i]; });

    const inputs = document.querySelectorAll('[data-i18n-placeholder]');
    const placeholders = Array.from(inputs).map(el => el.dataset.originalPlaceholder || el.placeholder);
    const traduzidosPlaceholders = await translateAll(placeholders, lang);
    inputs.forEach((el, i) => { if (traduzidosPlaceholders[i]) el.placeholder = traduzidosPlaceholders[i]; });
}

document.addEventListener('DOMContentLoaded', async () => {
    // salva originais em pt
    document.querySelectorAll('[data-i18n]').forEach(el => {
        if (!el.dataset.original) el.dataset.original = el.textContent.trim();
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        if (!el.dataset.originalPlaceholder) el.dataset.originalPlaceholder = el.placeholder;
    });

    // aplica idioma detectado/salvo — sem pré-traduzir outros
    await putLanguage(currentLanguage);
});