import os
from flask import json
import re
import unicodedata

file = 'palavras_proibidas'

def leitor():
    if os.path.exists(file):
        with open(file, 'r', encoding='utf-8') as f:
            conteudo = f.read()
            return conteudo
        
def padronizador(frase):
    conteudo = frase
    
    texto = str(conteudo).lower() 
    texto = unicodedata.normalize("NFD", texto)     

    return texto 

def caracteres_remover(frase):
    texto = re.sub(r"[\W_]+","",frase)
    return texto

def verificar_palavra(frase):
    conteudo = leitor()
    
    frase_arrumada = padronizador(frase)
    
    palavras = re.findall(r"[a-zA-Z0-9]+", frase_arrumada)
    
    for i in palavras:
        if i in conteudo:
            return i
    
    return None

