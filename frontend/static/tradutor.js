const translationCache = {};

let csrfToken = "";

    fetch("/csrf-token")
        .then(res => res.json())
        .then(data => {
            csrfToken = data.csrf_token;
        });

// detecta idioma do dispositivo se não houver preferência salva
function detectarIdioma() {
    return localStorage.getItem('idioma') || 'pt'; // ← padrão sempre pt
}

let currentLanguage = detectarIdioma();

async function translateAll(texts, targetLanguage) {
    if (targetLanguage === 'pt') return texts;

    // filtra textos vazios antes de mandar para a API
    const toTranslate = texts.filter(t => t && t.trim() !== '' && !translationCache[`${t}_${targetLanguage}`]);

    if (toTranslate.length > 0) {
        try {
            const res = await fetch('/traduzir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', "X-CSRFToken": csrfToken },
                body: JSON.stringify({ textos: toTranslate, lang: targetLanguage, source: 'pt' })
            });
            const data = await res.json();

            // FIX: verifica se data.traducoes existe e é array antes de iterar
            if (data.traducoes && Array.isArray(data.traducoes)) {
                toTranslate.forEach((text, i) => {
                    if (data.traducoes[i] !== undefined) {
                        translationCache[`${text}_${targetLanguage}`] = data.traducoes[i];
                    }
                });
            }
        } catch (err) {
            console.error('Erro na tradução:', err);
        }
    }

    return texts.map(t => translationCache[`${t}_${targetLanguage}`] || t);
}

async function putLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('idioma', lang);

    const elements = document.querySelectorAll('[data-i18n]');
    // FIX: filtra elementos que existem e têm texto
    const textos = Array.from(elements).map(el => el.dataset.original || el.textContent.trim());
    
    // só chama a API se houver textos para traduzir
    const traduzidos = textos.length > 0 ? await translateAll(textos, lang) : [];
    elements.forEach((el, i) => {
        if (traduzidos[i] !== undefined && traduzidos[i] !== '') {
            el.textContent = traduzidos[i];
        }
    });

    const inputs = document.querySelectorAll('[data-i18n-placeholder]');
    const placeholders = Array.from(inputs).map(el => el.dataset.originalPlaceholder || el.placeholder);

    const traduzidosPlaceholders = placeholders.length > 0 ? await translateAll(placeholders, lang) : [];
    inputs.forEach((el, i) => {
        if (traduzidosPlaceholders[i] !== undefined && traduzidosPlaceholders[i] !== '') {
            el.placeholder = traduzidosPlaceholders[i];
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    // salva originais em pt — só se ainda não foram salvos
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const texto = el.textContent.trim();
        if (!el.dataset.original && texto !== '') {
            el.dataset.original = texto;
        }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        if (!el.dataset.originalPlaceholder && el.placeholder !== '') {
            el.dataset.originalPlaceholder = el.placeholder;
        }
    });

    // FIX: só traduz se o idioma salvo for diferente de pt
    if (currentLanguage !== 'pt') {
        await putLanguage(currentLanguage);
    }
});