from flask import Flask, Blueprint,render_template, request, flash, redirect, url_for, session, make_response
from flask_restful import Api, Resource
from werkzeug.security import generate_password_hash, check_password_hash 
import pymysql
import random
import smtplib
from email.message import EmailMessage
import mimetypes
from backend.database import connection
from datetime import date, timedelta

# criação do signin
class signin(Resource):
    def post(self):
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor()
        
        # retirando dados do js
        cpf = data.get('cpf')
        email = data.get('email')
        user_name = data.get('user_name')
        data_nascimento = data.get('data_nascimento')
        senha = data.get('senha')
        
        # criptografando a senhaaaaaa :)
        senha_hash = generate_password_hash(senha)
        
        # vendo se já existe uma conta com este cpf, email ou username
        query = """select * from usuarios where CPF = %s or email = %s or user_name = %s"""
        cursor.execute(query,(cpf,email,user_name))
        existe = cursor.fetchone()
        
        if existe:
            cursor.close()
            con.close()
            return{
                'status':'error',
                'mensagem':'Já existe um usuário com este CPF, email ou nome de usuario'
            }, 400
        
        insert = """insert into usuarios(cpf,email,user_name,senha,data_nascimento) values (%s,%s,%s,%s,%s)"""
        cursor.execute(insert,(cpf,email,user_name,senha_hash,data_nascimento))
        cursor.commit()
        
        cursor.close()
        con.close()
        return {
            'status':'success',
            'mensagem':'O cadastro foi feito com sucesso'
        }, 200
  
    def get(self):
        return{
            'status':'error',
            'mensagem':'get não é um metodo aceito'
        }, 400

class login(Resource):
    def post(self):
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor()
        
        email = data.get('email')
        senha = data.get('senha')
        
        query = """select id_usuario, senha from usuarios where email = %s"""
        cursor.execute(query,(email,))
        login_valido = cursor.fetchone()
        
        if login_valido and check_password_hash(login_valido['senha'], senha):
            session['usuario_id'] = login_valido['id_usuario']
            
            cursor.close()
            con.close()
            return {
                'status':'success',
                'mensagem':'Login feito com sucesso'
            }, 200
        
        else:
            
            cursor.close()
            con.close()
            return {
                'status':'error',
                'mensagem':'email ou senha incorretos'
            }, 400
    
    def get(self):
        return{
            'status':'error',
            'mensagem':'get não é um metodo aceito'
        }, 400
    
class forgot(Resource):
    def post(self):
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor()
        
        cpf = data.get('cpf')
        
        query = """select * from usuarios where cpf = %s"""
        cursor.execute(query,(cpf,))
        achou_email = cursor.fetchone()
        
        if not achou_email:
            cursor.close()
            con.close()
            
            return{
                'status':'success',
                'mensagem':'Este CPF ainda não está cadastrado'
            }
        
        q = """select email from usuarios where cpf = %s"""
        cursor.execute(q,(cpf))

        email_achado = cursor.fetchone()
        
        codigo = random.randint(100000,999999)
        
        session['code'] = str(codigo)
        
        de = 'paula.pires2640@gmail.com'
        to = email_achado
        password = 'rvcr wtfd gtal ijog'
        
        info = 'Twitch | Código redefinir senha'
        
        msg = EmailMessage()
        msg['From'] = de
        msg['To'] = to
        msg['Subject'] = info
        msg.set_content(f'Olá, este é o seu código --> {codigo}')
        
        with smtplib.SMTP_SSL("smtp.gmail.com",425) as email:
            email.login(de,password)
            email.send_message(msg)
        
        return {
            'status':'success',
            'mensagem':'O código foi enviado no seu email'
        }, 200
      
    def get(self):
        return{
            'status':'error',
            'mensagem':'get não é um metodo aceito'
        }, 400  

class redefine_password(Resource):
    def post(self):
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor()
        
        codigo_inserido = data.get('codigo')
        nova_senha = data.get('nova_senha')
        
        nova_senha_hash = generate_password_hash(nova_senha)
        
        if codigo_inserido != session['code']:
            session.pop('code',None)
            return {
                'status':'error',
                'mensagem':'Código invalido'
            }, 400
        
        session.pop('code',None)
        update = """ update usuarios set senha = %s whre id_usuario = %s"""
        cursor.execute(update,(nova_senha_hash,session['usuario_id']))
        cursor.commit()
        
        cursor.close()
        con.close()
        
        return {
            'status':'success',
            'mensagem':'senha modificada com sucesso'
        }, 200
    
    def get(self):
        return{
            'status':'error',
            'mensagem':'get não é um metodo aceito'
        }, 400  

#class search(Resource):
#    def post(self):
        
class subscribe(Resource):
    def post(self):
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor()
        
        id_criador = data.get('criador')
        
        if not session['usuario_id']:
            cursor.close()
            con.close()
            return {
                'status':'error',
                'mensagem':'Você precisa estar logado pra se inscrever'
            }, 400
            
        insert = """insert into seguidores (id_seguidor,id_seguido) values (%s,%s)"""
        cursor.execute(insert,(session['usuario_id'],id_criador))
        cursor.commit()
        
        return {
            'status':'success',
            'mensagem':'Você se inscreveu'
        }, 200