from flask import Flask, Blueprint,render_template, request, flash, redirect, url_for, session, make_response
from flask_restful import Api, Resource
from werkzeug.security import generate_password_hash, check_password_hash 
import pymysql
import random
import smtplib
from email.message import EmailMessage
import mimetypes
from backend.database.connection import connection, send_code, email_valido, data_valida
from datetime import date, datetime, timedelta
from email_validator import validate_email, EmailNotValidError

# criação do signin
class signin(Resource):
    def post(self):
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor()
        
        # retirando dados do js
        cpf = str(data.get('cpf'))
        
        # tendo certeza que o cpf não vai estar com algum espaço
        cpf = cpf.strip()
        email = data.get('email')
        user_name = data.get('user_name')
        data_nascimento = data.get('data_nascimento')
        senha = data.get('senha')
        
        # vendo se o email é valido 
        valido = email_valido(email)
        if valido == False:
            return {
                'status':'error',
                'mensagem':'Este email não é valido'
            }
        
        email = valido
        
        #reorganizando a data para que entre direitinho no BD
        data_formatada = data_valida(data_nascimento)
        
        
        # fazendo hash na senhaaaaaa :)
        senha_hash = generate_password_hash(senha)
        
        # vendo se já existe uma conta com este cpf, email ou username
        query = """select * from usuarios where CPF = %s or email = %s or user_name = %s"""
        cursor.execute(query,(cpf,email,user_name))
        existe = cursor.fetchone()
        
        if existe:
            cursor.close()
            con.close()
            
            #retornando msg json
            return{
                'status':'error',
                'mensagem':'Já existe um usuário com este CPF, email ou nome de usuario'
            }, 400
        
        # inserindo as info no BD
        insert = """insert into usuarios(cpf,email,user_name,senha,data_nascimento) values (%s,%s,%s,%s,%s)"""
        cursor.execute(insert,(cpf,email,user_name,senha_hash,data_formatada))
        con.commit()
        
        cursor.close()
        con.close()
        return {
            'status':'success',
            'mensagem':'O cadastro foi feito com sucesso'
        }, 200
  
    def get(self):
        # Só pra deixar organizado e deixar claro que get não está desponivel
        return{
            'status':'error',
            'mensagem':'get não é um metodo aceito'
        }, 400

class login(Resource):
    def post(self):
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor(pymysql.cursors.DictCursor)
        
        #retirando dados do js
        username_email = data.get('username_email')
        senha = data.get('senha')

        # sabendo se é um email ou um nome de usuário
        vendo = email_valido(username_email)

        if vendo == False:
            coluna = 'user_name'
        else:
            coluna = 'email'
        
        # vendo se realmente existe alguem com aquele email ou nome de usuario
        query = f"""select id_usuario, senha from usuarios where {coluna} = %s"""
        cursor.execute(query,(username_email,))
        login_valido = cursor.fetchone()
        
        # Checkando se existe o email ou nome de usuario e se a senha em hash é correta
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
                'mensagem':f'{coluna} ou senha incorretos'
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
        
        # pegando email do js
        email_forgot = str(data.get('email_forgot'))
        
        # vendo se o email existe e está cadastrado
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
            
        email = email_forgot
        
        w = """select id_usuario from usuarios where email = %s"""
        cursor.execute(w,(email,))
        id = cursor.fetchone()
        
        # mandando código no email
        codigo = send_code(email)
        
        # guardando o id e o código na session
        session['usuario_id'] = id
        session['code'] = codigo 
        
        cursor.close()
        con.close()
        return {
            'status':'success',
            'mensagem':'O código foi enviado no seu email'
        }, 200

    def get(self):
        return{
            'status':'error',
            'mensagem':'get não é um metodo aceito'
        }, 400  

class resend_code(Resource):
    def get(self):
        con = connection()
        cursor = con.cursor()
        
        # Usando a session para pegar o email so usuario
        query = """select email from usuarios where id_usuario = %s"""
        cursor.execute(query,(session['usuario_id']))
        email = cursor.fetchone()
        
        # enviando código
        codigo = send_code(email)
        
        # atualizando a session
        session['code'] = codigo 
        
        cursor.close()
        con.close()
        
        return {
            'status':'success',
            'mensagem':'Código enviado'
        }
    
class check_codigo(Resource):
    def post(self):
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor()
        
        # pegando o código do js
        codigo_inserido = data.get('codigo')
        codigo_salvo = str(session.get('code'))
        
        if codigo_inserido != codigo_salvo:
            # Retirando o código da session
            session.pop('code',None)
            return {
                'status':'error',
                'mensagem':'Código invalido'
            }, 400
        
        session.pop('code')
        return{
            'status':'success',
            'mensagem':'Codigo correto'
        }
class redefine_password(Resource):
    def post(self):
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor()
        
        # pegando a nova senha do JS
        nova_senha = data.get('nova_senha')
        
        # tranformando ela em hash
        nova_senha_hash = generate_password_hash(nova_senha)
        
        # atualizando a senha
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