import smtplib
from email.message import EmailMessage
import pymysql
import random
from flask import Flask
def connection():
    return pymysql.connect (
        host='localhost',
        user='root',
        password='Pg260410',
        database='twitch-projeto',
        cursorclass=pymysql.cursors.Cursor
    )
    
def send_code(email_forgot):
    codigo = random.randint(10000,99999)

    de = 'paula.pires2640@gmail.com'
    to = email_forgot
    password = 'rvcr wtfd gtal ijog'

    info = 'Twitch | Código redefinir senha'

    msg = EmailMessage()
    msg['From'] = de
    msg['To'] = to
    msg['Subject'] = info
    msg.set_content(f'Olá, este é o seu código --> {codigo}')
    
    with smtplib.SMTP_SSL("smtp.gmail.com",465) as email:
        email.login(de,password)
        email.send_message(msg)
    
    return(codigo)