import os
import re
import unicodedata
from functools import lru_cache

file = 'palavras_proibidas'

def padronizador(frase):
    texto = unicodedata.normalize("NFD", str(frase).lower())
    return ''.join(c for c in texto if unicodedata.category(c) != 'Mn')  # tira acentos

@lru_cache(maxsize=1)
def carregar_proibidas():
    if not os.path.exists(file):
        return frozenset()
    with open(file, 'r', encoding='utf-8') as f:
        linhas = (padronizador(l).strip() for l in f)
        return frozenset(l for l in linhas if l)

def verificar_palavra(frase):
    proibidas = carregar_proibidas()
    palavras = re.findall(r"[a-z0-9]+", padronizador(frase))

    for p in palavras:
        if p in proibidas:
            return p

    # entradas com espaço, ex: "garota de programa"
    texto = ' ' + ' '.join(palavras) + ' '
    for termo in proibidas:
        if ' ' in termo and f' {termo} ' in texto:
            return termo

    return None