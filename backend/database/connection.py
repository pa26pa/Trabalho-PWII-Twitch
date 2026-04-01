import smtplib
from email.message import EmailMessage
import pymysql
import random
from flask import Flask
from email_validator import EmailNotValidError, validate_email
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

bd_password = os.getenv("DB_PASSWORD")
email_password = os.getenv("EMAIL_PASSWORD")

# Conectando com o Mysql :):)
def connection():
    return pymysql.connect (
        host='localhost',
        user='root',
        password=bd_password,
        database='twitch-projeto',
        cursorclass=pymysql.cursors.Cursor
    )

# enviando email com um código novo 
def send_code(email_forgot):
    # criação do código aleatórioooo 
    codigo = random.randint(10000,99999)

    de = 'paula.pires2640@gmail.com'
    to = email_forgot
    password = email_password

    info = 'Twitch | Código redefinir senha'

    msg = EmailMessage()
    msg['From'] = de
    msg['To'] = to
    msg['Subject'] = info
    msg.set_content(f'Olá, este é o seu código --> {codigo}')
    
    with smtplib.SMTP_SSL("smtp.gmail.com",465) as email:
        email.login(de,password)
        email.send_message(msg)
    
    # retorna o código para salvar na session
    return(codigo)

# vendo se o email é valido
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
    
    except ValueError:
        a = datetime.strptime(data, '%d/%m/%Y').strftime('%Y-%m-%d')