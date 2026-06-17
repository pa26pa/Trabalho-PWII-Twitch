import random
from flask import Flask, json
from email_validator import EmailNotValidError, validate_email
from datetime import datetime
from dotenv import load_dotenv
import os
import requests


load_dotenv()

bd_password = os.getenv("DB_PASSWORD")
email_password = os.getenv("EMAIL_PASSWORD")
brevo_api = os.getenv("BREVO_API")

# enviando email com um código novo 
def send_code(email_forgot,tipo):
    # criação do código aleatórioooo 
    codigo = random.randint(10000,99999)
    
    de = 'witch.auth@gmail.com'
    to = email_forgot
    password = email_password

    if tipo == 'forgot_password':
        texto = 'Olá! Recebemos uma solicitação para redefinir a senha da sua conta. Use o código de verificação abaixo para prosseguir:'
    elif tipo == 'delete_account':
        texto = 'Olá! Recebemos uma solicitação para excluir sua conta. Utilize este código para prosseguir:'
    else:
        texto = 'Olá! Recebemos uma solicitação. Utilize este código de verificação:'
        
    #info = 'Witch' 

    #msg = EmailMessage()
    #msg['From'] = de
    # msg['To'] = to
    # msg['Subject'] = info
    #msg.set_content(f'Olá, este é o seu código --> {codigo}')

    html_template = f"""
    <html>
      <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f0f0f5; padding: 40px 20px; margin: 0;">
        <div style="background-color: #ffffff; max-width: 500px; margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    
          <div style="background-color: #9146FF; padding: 25px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 0.5px;">Witch</h2>
          </div>
    
          <div style="padding: 30px; color: #1f1f23;">
            <h3 style="margin-top: 0; font-size: 18px; color: #000000;">Verifique sua conta</h3>
            <p style="font-size: 14px; line-height: 1.6; color: #53535f;">
              {texto}
            </p>
            
            
            <div style="background-color: #f2f2f7; border-left: 4px solid #9146FF; padding: 15px 20px; margin: 25px 0; text-align: center; border-radius: 4px;">
              <span style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #53535f; display: block; margin-bottom: 5px;">Seu código de segurança</span>
              <strong style="font-size: 32px; letter-spacing: 4px; color: #9146FF; font-family: monospace;">{codigo}</strong>
            </div>
            
            <p style="font-size: 12px; line-height: 1.5; color: #848494; margin-bottom: 0;">
              Se você não solicitou essa alteração, por favor ignore este e-mail com segurança. Este código expira em breve.
            </p>
          </div>
          
          <!-- Rodapé -->
          <div style="background-color: #f7f7f8; padding: 15px; text-align: center; border-top: 1px solid #eeeeee;">
            <span style="font-size: 11px; color: #848494;">Mensagem automática. Por favor não responda este email</span>
          </div>
          
        </div>
      </body>
    </html>
    """
    print(brevo_api)
    
    
    headers = {
      "accept":"application/json",
      "api-key":brevo_api,
      "content-type":"application/json"
    }
    
    payload = {
      "sender": {
        "name":"Witch - Auth",
        "email":"witch.auth@gmail.com"
      },
      "to": [
        {
          "email": email_forgot
        }      
      ],
      "subject":"Witch",
      "htmlContent":html_template
    }
    
    response = requests.post(
      "https://api.brevo.com/v3/smtp/email",
      headers=headers,
      json=payload,
      timeout=30
    )
    
    print(f'Status: {response.status_code}')
    
    if response.status_code not in [200, 201]:
      raise Exception(
        f"Erro ao enviar email pelo Brevo: {response.text}"
      )
      
    # Define o conteúdo como HTML
    #msg.add_alternative(html_template, subtype='html')
    
    # with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as email:
    #     print("3 - Conectou")
    #     email.starttls()
    #     print("4 - TLS OK")
    #     email.login(de, password)
    #     print("5 - Login OK")
    #     email.send_message(msg)
    #     print("6 - Email enviado")
    
    # retorna o código para salvar na session
    return(codigo)

# vendo se o email é valido