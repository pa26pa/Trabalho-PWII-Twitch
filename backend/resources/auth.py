from flask import Flask, Blueprint,render_template, request, flash, redirect, url_for, session, make_response
from flask_restful import Api, Resource
from werkzeug.security import generate_password_hash, check_password_hash 
import pymysql
import random
import smtplib
from email.message import EmailMessage
import mimetypes
from backend.database.connection import connection
from datetime import date, timedelta
from time import sleep

# criação do signin
class signin(Resource):
    def post(self):
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor()
        
        # retirando dados do js
        cpf = str(data.get('cpf'))
        cpf = cpf.strip()
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
        con.commit()
        
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
        cursor = con.cursor(pymysql.cursors.DictCursor)
        
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
        
        #cpf = str(data.get('cpf'))
        #cpf = cpf.strip()
        
        email_forgot = str(data.get('email_forgot'))
        
        print(email_forgot)
        query = """select * from usuarios where email = %s"""
        cursor.execute(query,(email_forgot,))
        achou_email = cursor.fetchone()
        
        
        if not achou_email:
            cursor.close()
            con.close()
            
            return{
                'status':'error',
                'mensagem':f'Este email ainda não está cadastrado {email_forgot}'
            }
        
        a = 1
        
        while a == 1:
            codigo = random.randint(10000,99999)
        
            session['code'] = str(codigo)
        
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
                
            sleep(50)
            
            code = data.get('codigo')
            
            if code != codigo:
                flash('Outro código será enviado para vc por email')
            else:
                a = 2
            
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
        update = """ update usuarios set senha = %s where id_usuario = %s"""
        cursor.execute(update,(nova_senha_hash,session['usuario_id']))
        con.commit()
        
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
        con.commit()
        
        return {
            'status':'success',
            'mensagem':'Você se inscreveu'
        }, 200
        
class search(Resource):
    def post(self):
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor(pymysql.cursors.DictCursor)
        
        #fetchall
        
        pesquisa = data.get('pesquisa')
        p = f"%{pesquisa}%"
        
        query1 = """select id_usuario, user_name, 'streamer' as tipo from usuarios where user_name like = %s """
        cursor.execute(query1,(p,))
        usuarios = cursor.fetchall()
        
        
        query2 = """select id_stream, categoria, titulo, id_streamer, 'stream' as tipo from streams where titulo like %s or categoria like %s"""
        cursor.execute(query2,(pesquisa,pesquisa))
        streams = cursor.fetchall()
        
        return {
            'status':'success',
            'mensagem':'Resultados da pesquisa',
            'resultado':f'{usuarios},{streams}'
        }