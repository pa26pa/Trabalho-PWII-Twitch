import smtplib
from email.message import EmailMessage
import pymysql
import random
from flask import Flask, json
from email_validator import EmailNotValidError, validate_email
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client
from urllib.parse import urlparse
import os

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url,key)

bd_password = os.getenv("DB_PASSWORD")
email_password = os.getenv("EMAIL_PASSWORD")

# Conectando com o Mysql :):)
def connection():
    return pymysql.connect (
        host='localhost',
        user='root',
        password=bd_password,
        database='twitch',
        cursorclass=pymysql.cursors.Cursor
    )

def email_valido(email):
    try:
        check = validate_email(email)
        
        # Normalizando o email, e deixando ele minusculo
        email = check.email.lower()
        
        return email
        
    except EmailNotValidError:
        return False

# fiz para garantir que não ia ter erro nessa parte de trazer a data para o BD
def data_valida(data):
    try:
        a = datetime.strptime(data, '%Y-%m-%d').strftime('%Y-%m-%d')
        return a
    except ValueError:
        a = datetime.strptime(data, '%d/%m/%Y').strftime('%Y-%m-%d')
        return a

file = 'tradução.json'
def carregar():
    if os.path.exists(file):
        with open(file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def salvar(cache):
    with open(file, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

# def url(url):
#     path = urlparse(url).path
    
#     tirar = "/storage/v1/object/public/"
#     path_bonito = path.replace(tirar,'',1)
    
#     bucket, arquivo = path_bonito.split('/')
    
#     return {
#         'bucket':bucket,
#         'url':arquivo
#     }
    
# def pegar_arquivo(url,bucket):
    
#     arquivo = supabase.storage\
#         .from_(bucket)\
#         .list(
#             path=url
#         )
    
#     if not arquivo.data:
#         return {'mensagem':'não foi possivel encontrar'}
    
#     return {
#         'arquivo':arquivo.data
#     }

cache_traducoes = carregar()