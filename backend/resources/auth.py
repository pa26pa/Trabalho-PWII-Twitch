from flask import Flask, Blueprint,render_template, request, flash, redirect, url_for, session, make_response
from flask_restful import Api, Resource
from werkzeug.security import generate_password_hash, check_password_hash 
import pymysql
import random
import smtplib
from email.message import EmailMessage
import mimetypes
from backend.database.connection import connection, email_valido, data_valida, carregar, salvar, cache_traducoes, file
from backend.resources.cpf import cpf_math_validate, cpf_real_or_not
from backend.resources.email_code import send_code
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
        

        cpf = cpf.strip()
        cpf_limpo = cpf.replace(".","").replace("-","")
        
        email = data.get('email')
        user_name = data.get('user_name')
        data_nascimento = data.get('data_nascimento')
        senha = data.get('senha')
        

        valido = email_valido(email)
        if valido == False:
            return {
                'status':'error',
                'mensagem':'Este email não é valido'
            }, 406
        
        email = valido
        

        data_formatada = data_valida(data_nascimento)


        senha_hash = generate_password_hash(senha)

        
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
    def get(self):
        session.clear()
        return {
            "status":'success',
            'mensagem':'Você saiu da sua conta'
        }, 200
    
    def post(self):
        return {
            'status':'error',
            'mensagem':'Esse metodo não é reconhecido'
        }, 405
        
class check_login(Resource):
    def get(self):
        print(session)
        if 'usuario_id' in session:
            con = connection()
            cursor = con.cursor(pymysql.cursors.DictCursor)

            #id_ficticio = 1
            
            #session['usuario_id'] = id_ficticio
            
            email = """select cpf, email, user_name, data_nascimento from usuarios where id_usuario = %s"""
            cursor.execute(email,(session['usuario_id'],))
            info_usuario = cursor.fetchone()
            
            data_formatada = info_usuario['data_nascimento'].strftime('%d/%m/%Y')
            
            cursor.close()
            con.close()
            
            return {
                'status':'success',
                'mensagem':'Logado',
                'logado':'true',
                'email': info_usuario['email'],
                'cpf': info_usuario['cpf'],
                'data': data_formatada,
                'name':info_usuario['user_name'] 
            }, 200

        return {
            'status':'error',
            'mensagem':'não está logado'
        }, 204
    
class dados_config(Resource):
    def get(self):
        con = connection()
        cursor = con.cursor(pymysql.cursors.DictCursor)

        #id_ficticio = 1
        
        #session['usuario_id'] = id_ficticio
        
        email = """select cpf, email, user_name, data_nascimento from usuarios where id_usuario = %s"""
        cursor.execute(email,(session['usuario_id'],))
        info_usuario = cursor.fetchone()
        
        data_formatada = info_usuario['data_nascimento'].strftime('%d/%m/%Y')
        
        cursor.close()
        con.close()

        return {
            'status':'success',
            'mensagem':'Email encontrado',
            'email': info_usuario['email'],
            'cpf': info_usuario['cpf'],
            'data': data_formatada,
            'name':info_usuario['user_name'] 
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
        resposta = cursor.fetchone()

        id = resposta[0]
        # mandando código no email
        
        codigo = send_code(email,'forgot_password')
        
        # guardando o id e o código na session
        session['id_provisorio'] = id
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
        cursor.execute(query,(session['id_provisorio']))
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
    def put(self):
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor()
        
        # pegando a nova senha do JS
        nova_senha = data.get('nova_senha')
        
        # tranformando ela em hash
        nova_senha_hash = generate_password_hash(nova_senha)
        
        # atualizando a senha
        update = """ update usuarios set senha = %s where id_usuario = %s"""
        cursor.execute(update,(nova_senha_hash,session['id_provisorio']))
        con.commit()
        id = session['id_provisorio']
        
        session['usuario_id'] = id
        session.pop('id_provisorio')
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

class delete_Account(Resource):
    def delete(self):
        
        con = connection()
        cursor = con.cursor(pymysql.cursors.DictCursor)
        
        id = session['usuario_id']
        
        a = """delete from bloqueados where id_bloqueador = %s or id_bloqueado"""
        cursor.execute(a, (id,))
        cursor.commit()
        
        query = """delete from usuarios where id_usuario = %s """
        cursor.execute(query, (id,))
        
        con.commit()
        
        session.clear()
        
        cursor.close()
        con.close()
        
        return {
            'status':'success',
            'mensagem':'Conta excluida'
        }, 200
    
class update_Password(Resource):
    def put(self):
        
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor(pymysql.cursors.DictCursor)
        
        old = data.get('senha_antiga')
        nova = data.get('senha_nova')
        id = session['usuario_id']
        print(nova)
        nova = generate_password_hash(nova)
        query = """select senha from usuarios where id_usuario = %s"""
        cursor.execute(query, (id,))
        senha = cursor.fetchone()
        
        
        if check_password_hash(senha['senha'], old):
            a = """update usuarios set senha = %s where id_usuario = %s"""
            cursor.execute(a,(nova,id))
            con.commit()
            print('deu BOM') 
            return {
                'status':'success',
                'mensagem':'Senha atualizada'
            }, 200
        
        return {
            'status':'error',
            'mensagem':'senha incorreta'
        }, 400

class bloquear(Resource):
    def post(self):
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor(pymysql.cursors.DictCursor)
        
        person = data.get('nome')
        date = data.get('data')

        data_bloq = data_valida(date)
        
        query = """select * from usuarios where user_name = %s"""
        cursor.execute(query,(person,))
        existe = cursor.fetchone()
        
        if existe:
            b = """select id_usuario from usuarios where user_name = %s"""
            cursor.execute(b,(person,))
            resposta = cursor.fetchone()
            id_bloqueado = resposta['id_usuario']
            id_bloqueador = session['usuario_id']
                    
            aaa = """select id_bloqueador from bloqueados where id_bloqueador = %s and id_bloqueado = %s"""
            cursor.execute(aaa,(id_bloqueador,id_bloqueado))
            ja = cursor.fetchone()
            
            if ja:
                return {
                    'status':'error',
                    'mensagem':'Ele já está bloqueado'
                },400
                
            a = """insert into bloqueados(id_bloqueador, id_bloqueado, data_bloq) values(%s,%s,%s);"""
            cursor.execute(a,(id_bloqueador,id_bloqueado,data_bloq))
            con.commit()
            
            cursor.close()
            con.close()

            return {
                'status':'success',
                'mensagem':'usuario encontrado e bloquado',
                'existe':True
            },200

        return {
            'status':'error',
            'mensagem':'Não foi possivel encontrar esse usuario'
        }, 400

class desbloquear(Resource):
    def post(self):
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor(pymysql.cursors.DictCursor)
        
        nome = data.get('nome')
   
        usuario = session['usuario_id']
        
        a = """select id_usuario from usuarios where user_name = %s"""
        cursor.execute(a,(nome,))
        resposta = cursor.fetchone()
        id = resposta['id_usuario']
        
        try:
            query = """delete from bloqueados where id_bloqueador = %s and id_bloqueado = %s"""
            cursor.execute(query,(usuario,id))
            con.commit()
        
            cursor.close()
            con.close()
            
            
            
            return {
                'status':'success',
                'mensagem':'Usuario desbloqueado com sucesso'
            }
        except pymysql.MySQLError as error:
            
            return {
                'status':'error',
                'mensagem':'não foi possivel desbloquear'
            }
        
        
        