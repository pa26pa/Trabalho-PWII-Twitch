import smtplib
from email.message import EmailMessage
import pymysql
import random
from flask import Flask, json
from email_validator import EmailNotValidError, validate_email
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client
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

cache_traducoes = carregar()