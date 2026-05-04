from flask import Flask, Blueprint,render_template, request, flash, redirect, url_for, session, make_response
from flask_restful import Api, Resource
from werkzeug.security import generate_password_hash, check_password_hash 
import pymysql
import random
import smtplib
from email.message import EmailMessage
import mimetypes
from backend.database.connection import connection, send_code, email_valido, data_valida, carregar, salvar, cache_traducoes, file
from datetime import date, datetime, timedelta
from email_validator import validate_email, EmailNotValidError
from deep_translator import GoogleTranslator
import time


#from main import app, google, User
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
            }, 406
        
        email = valido
        
        #reorganizando a data para que entre direitinho no BD
        data_formatada = data_valida(data_nascimento)
        
        print(data_formatada)
        # fazendo hash na senhaaaaaa :)
        senha_hash = generate_password_hash(senha)
        
        # vendo se já existe uma conta com este cpf, email ou username
        
        query = """select * from usuarios where cpf = %s or email = %s or user_name = %s"""
        cursor.execute(query,(cpf,email,user_name))
        existe = cursor.fetchone()
        
        
                
        if existe:
            cursor.close()
            con.close()

            return{
                'status':'error',
                'mensagem':'Já existe um usuário com este CPF, email ou nome de usuario'
            }, 406
            
    

        
        # inserindo as info no BD
        try:
            insert = """insert into usuarios(cpf,email,user_name,senha,data_nascimento) values (%s,%s,%s,%s,%s)"""
            cursor.execute(insert,(cpf,email,user_name,senha_hash,data_formatada))
        
        except pymysql.err.IntegrityError:
            return {
            'status':'error',
            'mensagem':'Ouve um erro, informações duplicadas'
            }, 400
        
        con.commit()
        
        cursor.close()
        con.close()
        return {
            'status':'success',
            'mensagem':'O cadastro foi feito com sucesso'
        }, 201
  
    def get(self):
        # Só pra deixar organizado e deixar claro que get não está desponivel
        return{
            'status':'error',
            'mensagem':'get não é um metodo aceito'
        }, 405

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
            }, 202
        
        else:
            
            cursor.close()
            con.close()
            return {
                'status':'error',
                'mensagem':'Email, nome de usuario ou senha incorretos'
            }, 401
    
    def get(self):
        return{
            'status':'error',
            'mensagem':'get não é um metodo aceito'
        }, 405

class logout(Resource):
    def post(self):
        session.clear()
        return {
            "status":'success',
            'mensagem':'Você saiu da sua conta'
        }, 200
    
    def get(self):
        return {
            'status':'error',
            'mensagem':'Esse metodo não é reconhecido'
        }, 405
        
class check_login(Resource):
    def get(self):
        if 'usuario_id' in session:
           
            return {
                'status':'success',
                'mensagem':'logado'
            }, 200
        
        return {
            'status':'success',
            'mensagem':'não está logado'
        }, 200
    
class email(Resource):
    def get(self):
        con = connection()
        cursor = con.cursor(pymysql.cursors.DictCursor)

        email = """select email from usuarios where id_usuario = %s"""
        cursor.execute(email,(session['usuario_id'],))
        email_usuario = cursor.fetchone()

        cursor.close()
        con.close()

        return {
            'status':'success',
            'mensagem':'Email encontrado',
            'email': email_usuario
        }, 200

class google(Resource):
    def post(self):
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor()
        try: 
            redirect_uri = url_for('authorize',_external=True)
            return google.authorize_redirect(redirect_uri)
        except Exception as e:
            #app.logger.error(f"Erro durante login:{str(e)}")
            return {
                'status':'error',
                'mensagem':'Erro durante login'
            }, 500

class auth_google(Resource):
    def post(self):
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor()
        
        token = google.authorize_access_token()
        userinfo_endpoint = google.server_metadata['userinfo_endpoin']
        resp = google.get(userinfo_endpoint)
        user_info = resp.json()
        email = user_info['email']
        
        query = """select id_usuario from usuarios where email = %s"""
        cursor.execute(query,(email,))
        existe = cursor.fetchone()
        
        session['oauth_token'] = token
        
        if not existe: 
            session['email_google'] = email
            mensagem = 'Por favor faça o cadastro'
        else: 
            session['usuario_id'] = existe
            mensagem = 'Login feito com sucesso'

        session['oauth_token'] = token
            
        return {
            'status':'success',
            'mensagem':f'{mensagem}.'
        }, 500
        
class forgot(Resource):
    def post(self):
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor()
        
        # pegando email do js
        email_forgot = str(data.get('email'))
        
        print(email_forgot)

        valido = email_valido(email_forgot)
        
        if not valido:
            return {
                'status':'error',
                'mensagem':'esse email não é valido'
            }, 401
            
        # vendo se o email existe e está cadastrado
        query = """select * from usuarios where email = %s"""
        cursor.execute(query,(email_forgot,))
        achou_email = cursor.fetchone()
        
        
        if not achou_email:
            cursor.close()
            con.close()
            
            return{
                'status':'error',
                'mensagem':'Este email ainda não está cadastrado'
            }, 404
            
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
        }, 405

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
        }, 200
    
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
            }, 401
        
        session.pop('code')
        return{
            'status':'success',
            'mensagem':'Codigo correto'
        }, 200
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
        }, 405

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
        
        query1 = """select id_usuario, user_name, 'streamer' as tipo from usuarios where user_name like %s """
        cursor.execute(query1,(p,))
        usuarios = cursor.fetchall()
        
        
        query2 = """select id_stream, categoria, titulo, id_streamer, 'stream' as tipo from streams where titulo like %s or categoria like %s"""
        cursor.execute(query2,(pesquisa,pesquisa))
        streams = cursor.fetchall()
        
        return {
            'status':'success',
            'mensagem':'Resultados da pesquisa',
            'resultado':f'{usuarios},{streams}'
        }, 200

class block_code(Resource):
    def get(self):
        session.pop('code', None)
        
        return {
            'status':'success',
            'mensagem':'Seu código espirou'
        }, 200
        
class translate(Resource):
    def post(self):
    
        data = request.json
        lingua = data['lang']
        textos = data['textos']

        traducoes = []
        textos_para_traduzir = []
        indices_para_traduzir = []

        # verifica quais já estão no cache
        for i, texto in enumerate(textos):
            chave = f"{texto}_{lingua}"
            if chave in cache_traducoes:
                traducoes.append(cache_traducoes[chave]) 
            else:
                traducoes.append(None)
                textos_para_traduzir.append(texto)
                indices_para_traduzir.append(i)

        # traduz só os que faltam
        if textos_para_traduzir:
            novas = GoogleTranslator(source='pt', target=lingua).translate_batch(textos_para_traduzir)
            
            for i, (texto, traducao) in enumerate(zip(textos_para_traduzir, novas)):
                chave = f"{texto}_{lingua}"
                cache_traducoes[chave] = traducao  
                traducoes[indices_para_traduzir[i]] = traducao
            
            salvar(cache_traducoes)  

        return {
            'status': 'success',
            'mensagem': 'tradução feita com sucesso',
            'traducoes': traducoes
        }, 200           

