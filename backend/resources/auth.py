"""
            Módulo de autentificação e gerenciamento de contas de usuários
    Esse módulo cria endoints que são utilizados pela APIRest, alguns dos endpoints são
    de autentificação (login), criação de conta (signin), encerramento de sessão (logout).
    
    Seguranças: 
        Proteção contra Captcha inválido, validação de token enviado pelo JS e futuramente válidação de CPF válido
"""

from flask import Flask, Blueprint,render_template, request, flash, redirect, url_for, session, make_response
from flask_restful import Api, Resource
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import generate_password_hash, check_password_hash 
import pymysql
import random
import smtplib
from email.message import EmailMessage
import mimetypes
from backend.database.connection import connection, supabase, acorda_cloudinary, email_valido, data_valida, carregar, salvar, cache_traducoes, file
from backend.resources.seguranca import cpf_math_validate, cpf_real_or_not, captcha, check_csrf
from backend.resources.email_code import send_code
from datetime import date, datetime, timedelta
from email_validator import validate_email, EmailNotValidError
from deep_translator import GoogleTranslator
import time
from uuid import uuid4
from datetime import date
from urllib.parse import urlparse 
import cloudinary
import cloudinary.uploader
import requests
import os
from dotenv import load_dotenv
from backend.database.connection import limiter
from datetime import date
from markupsafe import escape

#carregando o .env
load_dotenv()

secret = os.getenv("CAPTCHA_SECRET")

extensoes_permitidas = {'jpg','jpeg','png','gif','mp4','webm'}

#chamando função para poder inserir videos e imagens no cloudnary
acorda_cloudinary()


class signin(Resource):
    """
        Endpoint responsável pelo registro de novos usuários no sistema.
    """
    def post(self):
        """
            Processa a criação de um novo usuário.
            
            Válidações: 
                Token('X-CSRFToken'), captcha, cpf, email, existência de um usuário já criado com os mesmos dados.
            
            Retornos: 
                403 = CAPTCHA inválido
                400 = Campos incompletos
                406 = Email inválido ou informações duplicadas
                500 = Erro interno do servidor 
                201 = Usuário criado com sucesso
                
        """
        
        data = request.get_json()

        con = connection()
        cursor = con.cursor()
        
        token = request.headers.get("X-CSRFToken")
        check = check_csrf(token)
        
        if not check or check.get("status") == "error":
            return {'status': 'error', 'mensagem' : check.get("mensagem")}
        
        #captcha_enviado = data.get('captcha')
        #captcha_valido = captcha(captcha_enviado)
        
        #if captcha_valido['status'] == 'error':
        #    return {
        #        'status':'error',
        #        'mensagem':'captcha inválido'
        #    }, 403
            
        cpf = str(data.get('cpf'))
        cpf = cpf.strip()
        cpf_limpo = cpf.replace(".","").replace("-","")
        
        email = data.get('email')
        user_name = data.get('user_name')
        data_nascimento = data.get('data_nascimento')
        senha = data.get('senha')
        
        if not all([cpf_limpo, email, user_name, data_nascimento, senha]):
            cursor.close()
            con.close()
            return {
                'status': 'error',
                'mensagem': 'Todos os campos são obrigatórios'
            }, 400

        valido = email_valido(email)
        if valido == False:
            cursor.close()
            con.close()
            return {
                'status':'error',
                'mensagem':'Este email não é valido'
            }, 406
        
        email = valido

        
        data_formatada = data_valida(data_nascimento)
        if not data_formatada:
            cursor.close()
            con.close()
            return {
                'status': 'error',
                'mensagem': 'Data de nascimento inválida. Use o formato DD/MM/AAAA'
            }, 500

        senha_hash = generate_password_hash(senha)
        
        query = """select * from usuarios where cpf = %s or email = %s or BINARY user_name = %s"""
        cursor.execute(query,(cpf_limpo,email,user_name))
        existe = cursor.fetchone()
                
        if existe:
            cursor.close()
            con.close()
            return{
                'status':'error',
                'mensagem':'Já existe um usuário com este CPF, email ou nome de usuario'
            }, 406
        
        user_name = str(escape(user_name))
        email = str(escape(email))
        
        try:
            insert = """insert into usuarios(cpf,email,user_name,senha,data_nascimento) values (%s,%s,%s,%s,%s)"""
            cursor.execute(insert,(cpf_limpo,email,user_name,senha_hash,data_formatada))
            con.commit()
        
        except pymysql.err.IntegrityError:
            cursor.close()
            con.close()
            return {
                'status':'error',
                'mensagem':'Ouve um erro, informações duplicadas'
            }, 400
        
        except Exception as e:
            cursor.close()
            con.close()
            print("ERRO NO INSERT:", str(e))
            return {
                'status': 'error',
                'mensagem': 'Erro ao cadastrar usuário'
            }, 500
        
        cursor.close()
        con.close()
        return {
            'status':'success',
            'mensagem':'O cadastro foi feito com sucesso'
        }, 201
    
class login(Resource):
    """
        Endpoint responsável pela autentificação do usuário
    """
    decorators = [limiter.limit("10 per minute")] # define um limite de utilizações desse endpoint
    
    def post(self):
        """
            Autentifica as informações dadas pelo usuário
            
            Validações: 
                Token('X-XSRFToken'), email, existencia de uma conta com aquelas credênciais, validação da senha em hash
            
            Retornos: 
                202 = Login feito com sucesso
                401 = Email, nome de usuário ou senha incorretos
        """
            
        token = request.headers.get("X-CSRFToken")
        
        check = check_csrf(token)
        
        if not check or check.get("status") == "error":
            return {'status': 'error', 'mensagem' :check.get("mensagem")}
        
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor(pymysql.cursors.DictCursor)
            
        
        username_email = data.get('username_email')
        senha = data.get('senha')

        
        vendo = email_valido(username_email)

        if vendo == False:
            coluna = 'user_name'
            username_email = str(escape(username_email))
        else:
            coluna = 'email'
        
        # vendo se realmente existe alguem com aquele email ou nome de usuario
        query = f"""select id_usuario, senha from usuarios where BINARY {coluna} = %s"""
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
    """
        Endpoint responsável pelo termino de sessões
    """
    def post(self):
        """
            Encerra a sessão do usuário
            
            Validações: 
                Token('X-CSRFToken'), existencia da session
            
            Retornos: 
                400 = Usuário não está logado
                200 = Logout feito com sucesso
        """
        token = request.headers.get("X-CSRFToken")
        
        check = check_csrf(token)
        
        if not check or check.get("status") == "error":
            return {'status': 'error', 'mensagem' : check.get("mensagem")}
        
        if not session:
            return {
                "status":"error",
                "mensagem":"Você ainda não está logado"
            }, 400
            
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
    """
        Endpoint responsável por buscar informações do usuári
    """
    def post(self):
        """
            Acha e envia as informações ao JS
            
            Validações: 
                Existencia do id do usuário na session, (O token tava dando problema, então retirei ele por enquanto)
            
            Retornos: 
                200 = Informações retiradas com sucesso
                400 = Usuário não logado
        """
        
        # sem check_csrf aqui — só leitura
        if 'usuario_id' in session:
            con = connection()
            cursor = con.cursor(pymysql.cursors.DictCursor)
            
            email = """select cpf, email, user_name, data_nascimento, foto_url, bio from usuarios where id_usuario = %s"""
            cursor.execute(email, (session['usuario_id'],))
            info_usuario = cursor.fetchone()
            
            data_formatada = info_usuario['data_nascimento'].strftime('%d/%m/%Y')
            
            cursor.close()
            con.close()
            
            return {
                'status': 'success',
                'mensagem': 'Logado',
                'logado': 'true',
                'foto': info_usuario['foto_url'],
                'bio': info_usuario['bio'],
                'email': info_usuario['email'],
                'cpf': info_usuario['cpf'],
                'data': data_formatada,
                'name': info_usuario['user_name']
            }, 200

        return {
            'status': 'error',
            'mensagem': 'não está logado',
            'logado': False
        }, 400

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
    """
        Endpoint responsável pela troca de senha do usuário
    """
    def post(self):
        """
            Troca a senha do usuário
            
            Validação: 
                Token('X-CSRFToken'), email, existencia de uma conta com o email
            
            Retornos:
                401 = Email inválido
                404 = Email ainda não foi cadastrado 
                200 = Código enviado com sucesso
        """
        
        token = request.headers.get("X-CSRFToken")
        
        check = check_csrf(token)
        
        if not check or check.get("status") == "error":
            return {'status': 'error', 'mensagem' :check.get("mensagem")}
        
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor()
        
        # pegando email do js
        email_forgot = str(data.get('email'))
        who = str(data.get('who'))


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
        
        codigo = send_code(email,who)
        
        # guardando o id e o código na session
        session['id_provisorio'] = id
        session['code'] = codigo 
        session['who'] = who
        
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
        token = request.headers.get("X-CSRFToken")

        check = check_csrf(token)

        if not check or check.get("status") == "error":
            return {
                'status': 'error',
                'mensagem': check.get("mensagem")
            }, 400

        # Verifica se a sessão ainda existe
        id_usuario = session.get("id_provisorio")
        tipo = session.get("who")

        if not id_usuario or not tipo:
            return {
                'status': 'error',
                'mensagem': 'Sessão expirada'
            }, 401

        con = connection()
        cursor = con.cursor()

        query = """SELECT email FROM usuarios WHERE id_usuario = %s"""
        cursor.execute(query, (id_usuario,))

        resultado = cursor.fetchone()

        if resultado is None:
            cursor.close()
            con.close()

            return {
                'status': 'error',
                'mensagem': 'Usuário não encontrado'
            }, 404

        # Pega apenas o email da tupla
        email = resultado[0]

        # Envia o novo código
        codigo = send_code(email, tipo)

        # Atualiza o código na sessão
        session["code"] = codigo

        cursor.close()
        con.close()

        return {
            'status': 'success',
            'mensagem': 'Código enviado com sucesso'
        }, 200
    
class check_codigo(Resource):
    """
        Esse endpoint tem a função de checar se o código enviado é valido.
    """
    
    def post(self):
        """
            Valida o código enviado
            
            Validações:
                Token('X-CSRFToken'), verifica se o código inserido é igual ao código salvo
                
            Retornos:
                401 = Código inválido
                200 = Código válido
        """
        token = request.headers.get("X-CSRFToken")
        
        check = check_csrf(token)
        
        if not check or check.get("status") == "error":
            return {'status': 'error', 'mensagem' :check.get("mensagem")}
        
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor()
        
        codigo_inserido = data.get('codigo')
        codigo_salvo = str(session.get('code'))
        
        if codigo_inserido != codigo_salvo:
            return {
                'status': 'error',
                'mensagem': 'Código inválido'
            }, 401

        session.pop("code", None)

        return {
            'status': 'success',
            'mensagem': 'Código correto'
        }, 200
class redefine_password(Resource):
    """
        Endpoint responsável pela redefinição da senha do usuário (para o esqueci a senha)
    """
    def put(self):
        """
            Atualiza a senha do usuário pela nova
            
            Validações:
                Token('X-CSRFToken'), 
            
            Retornos:
                200 = Senha mudada com sucesso
        """
        
        token = request.headers.get("X-CSRFToken")
        
        check = check_csrf(token)
        
        if not check or check.get("status") == "error":
            return {'status': 'error', 'mensagem' :check.get("mensagem")}
        
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor()
        
        nova_senha = data.get('nova_senha')
        
        nova_senha_hash = generate_password_hash(nova_senha)
        
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
    """
        Endpoint responsável pelo processo de inscrição 
    """
    def post(self):
        """
            Inscreve o usuário em algum canal
            
            Validações:
                Token('X-CSRFToken'), sessão existente
                
            Retornos:
                400 = Usuário não está logado
                200 = Incrição feita com sucesso
        """
        
        token = request.headers.get("X-CSRFToken")
        
        check = check_csrf(token)
        
        if not check or check.get("status") == "error":
            return {'status': 'error', 'mensagem' :check.get("mensagem")}
        
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
    """
        Endpoint responsável pela pesquisa de informações
    """
    def post(self):
        """
            Retira as informações do Banco de Dados
            
            Validações: 
                Token('X-CSRFToken')
                
            Retornos: 
                200 =Informações retiradas com sucesso
        """
        
        token = request.headers.get("X-CSRFToken")
        
        check = check_csrf(token)
        
        if not check or check.get("status") == "error":
            return {'status': 'error', 'mensagem' :check.get("mensagem")}
        
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
    """
        Endpoint responsável por anular o código salvo na session
    """
    def get(self):
        """
            Anula o código salvo na session
            
            Verificações: 
                Token('X-CSRFToken'), existencia de uma session
                
            Retornos: 
                500 = Não existe session (Erro interno da API)
                200 = Código espirado com sucesso
        """
        
        token = request.headers.get("X-CSRFToken")
        
        check = check_csrf(token)
        
        if not check or check.get("status") == "error":
            return {'status': 'error', 'mensagem' :check.get("mensagem")}
        
        if not session:
            return {
                "status":"error",
                "mensagem":"código não foi salvo na session"
            }, 500
                
        session.pop('code', None)
        
        return {
            'status':'success',
            'mensagem':'Seu código espirou'
        }, 200
        
class translate(Resource):
    """
        Endpoint Responsável por traduzir o site
    """
    def post(self):
        """
            Traduz o site
            
            Validações: 
                Token('X-CSRFToken')
            
            Retorno:
                200 = Traduzido com sucesso
        """
        token = request.headers.get("X-CSRFToken")
        
        check = check_csrf(token)
        
        if not check or check.get("status") == "error":
            return {'status': 'error', 'mensagem' :check.get("mensagem")}
        
        data = request.json
        lingua = data['lang']
        textos = data['textos']

        traducoes = []
        textos_para_traduzir = []
        indices_para_traduzir = []


        for i, texto in enumerate(textos):
            chave = f"{texto}_{lingua}"
            if chave in cache_traducoes:
                traducoes.append(cache_traducoes[chave]) 
            else:
                traducoes.append(None)
                textos_para_traduzir.append(texto)
                indices_para_traduzir.append(i)

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
    """
        Endpoint responsável por apagar a conta do usuário
    """
    def delete(self):
        """
            Apaga a conta do usuário do Banco de Dados
            
            Verificações:
                Token, usuário logado
            
            Retornos: 
                400 = Usuário não está logado
                200 = Conta excluida com sucesso
        """
        
        token = request.headers.get("X-CSRFToken")
        
        check = check_csrf(token)
        
        if not check or check.get("status") == "error":
            return {'status': 'error', 'mensagem' :check.get("mensagem")}
        
        con = connection()
        cursor = con.cursor(pymysql.cursors.DictCursor)
        
        if 'usuario_id' not in session:
            return {
                "status":"error",
                "mensagem":"Você precisa estar logado para deletar sua conta"
            }, 400
        id = session['usuario_id']
        
        a = """delete from bloqueados where id_bloqueador = %s or id_bloqueado = %s"""
        cursor.execute(a, (id,id))
        con.commit()
        
        query = """delete from usuarios where id_usuario = %s """
        cursor.execute(query, (id,))
        
        con.commit()
        
        ab = """delete from streams where id_streamer = %s"""
        cursor.execute(ab, (id,))

        con.commit()

        ac = """delete from subs where id_usuario = %s or id_streamer = %s"""
        cursor.execute(ac, (id,))
        con.commit()

        ad = """delete from tipo_sub where id_criador = %s"""
        cursor.execute(ad, (id,))
        con.commit()

        ae = """delete from seguidores where id_seguido = %s or id_seguidor = %s"""
        cursor.execute(ae, (id,))
        con.commit()
        
        session.clear()
        
        cursor.close()
        con.close()
        
        return {
            'status':'success',
            'mensagem':'Conta excluida'
        }, 200
    
class update_Password(Resource):
    """
        Endpoint responsável por atualizar a senha de um usuário que já está logado
    """
    def put(self):
        """
            Atualiza a senha do usuário
            
            Validações:
                Token('X-CSRFToken'), id do usuário na session, senha inserida igual a senha antiga
            
            Retornos:
                400 = Usuário não está logado
                200 = Senha atualizada com sucesso
                401 = Senha não é igual a antiga
                
        """
        
        token = request.headers.get("X-CSRFToken")
        
        check = check_csrf(token)
        
        if not check or check.get("status") == "error":
            return {'status': 'error', 'mensagem' :check.get("mensagem")}
        
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor(pymysql.cursors.DictCursor)
        
        old = data.get('senha_antiga')
        nova = data.get('senha_nova')
        
        if 'usuario_id' not in session:
            return {
                "status":"error",
                "mensagem":"Você precisa estar logado para deletar sua conta"
            }, 400
        
        id = session['usuario_id']
        
        nova = generate_password_hash(nova)
        query = """select senha from usuarios where id_usuario = %s"""
        cursor.execute(query, (id,))
        senha = cursor.fetchone()
        
        
        if check_password_hash(senha['senha'], old):
            a = """update usuarios set senha = %s where id_usuario = %s"""
            cursor.execute(a,(nova,id))
            con.commit()

            return {
                'status':'success',
                'mensagem':'Senha atualizada'
            }, 200
        
        return {
            'status':'error',
            'mensagem':'senha incorreta'
        }, 401

class bloquear(Resource):
    """
        Endpoint responsável por bloquear usuários
    """
    def post(self):
        """
            Bloqueia usuários
            
            Verificações:
                Token('X-CSRFToken'),id do bloqueador na session, usuário existente, se usuário já foi bloqueado
                
            Retornos:
                400 = Usuário não encontrado, usuário ja foi bloqueado ou usuário não está logado
                200 = Usuário bloqueado
        """
        
        token = request.headers.get("X-CSRFToken")
        
        check = check_csrf(token)
        
        if not check or check.get("status") == "error":
            return {'status': 'error', 'mensagem' :check.get("mensagem")}
        
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor(pymysql.cursors.DictCursor)
        
        person = data.get('nome')
        date = data.get('data')

        person = str(escape(person))
          
        data_bloq = data_valida(date)
        query = """select * from usuarios where BINARY user_name = %s"""
        cursor.execute(query,(person,))
        existe = cursor.fetchone()
        
        if existe:
            b = """select id_usuario from usuarios where BINARY user_name = %s"""
            cursor.execute(b,(person,))
            resposta = cursor.fetchone()
            id_bloqueado = resposta['id_usuario']
            
            if 'usuario_id' not in session:
                return {
                    "status":"error",
                    "mensagem":"Você precisa estar logado para deletar sua conta"
                }, 400
                
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
    """
        Endpoint responsável por desbloquear usuários
    """
    def post(self):
        """
            Cancela bloqueios
            
            Validações:
                Token('X-CSRFToken'), id do usuário na session
            
            Retornos:
                400 = Não foi possivel cancelar o bloqueio 
                200 = Desbloqueou com sucesso
        """
        
        token = request.headers.get("X-CSRFToken")
        
        check = check_csrf(token)
        
        if not check or check.get("status") == "error":
            return {'status': 'error', 'mensagem' :check.get("mensagem")}
        
        data = request.get_json()
        
        con = connection()
        cursor = con.cursor(pymysql.cursors.DictCursor)
        
        nome = data.get('nome')

        if 'usuario_id' not in session:
            return {
                "status":"error",
                "mensagem":"Você precisa estar logado para deletar sua conta"
            }, 400
            
        usuario = session['usuario_id']
        
        a = """select id_usuario from usuarios where BINARY user_name = %s"""
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
            }, 200
            
        except pymysql.MySQLError as error:
            
            return {
                'status':'error',
                'mensagem':'não foi possivel desbloquear'
            }, 500
        
class bloqueados(Resource):
    """
        Endpoint que mostra todos os usuários já bloqueados
    """
    def get(self):
        """
            Pega todos os usuários que já foram bloqueados pelo cliente
            
            Validações:
                Token('X-CSRFToken'), id do cliente na session
            
            Retornos:
                401 = Usuário não está logado
                200 = Informações retiradas com sucesso
        """
        
        token = request.headers.get("X-CSRFToken")
        
        check = check_csrf(token)
        
        if not check or check.get("status") == "error":
            return {'status': 'error', 'mensagem' :check.get("mensagem")}
        
        if "usuario_id" not in session:
            return {
                'status':'success',
                'mensagem':'Você precisa estar logado para fazer essa ação'
            }, 401
        
        con = connection()
        cursor = con.cursor(pymysql.cursors.DictCursor)
        
        id = session["usuario_id"]
        
        query = """select id_bloqueado,data_bloq from bloqueados where id_bloqueador = %s """
        cursor.execute(query,(id,))
        id_bloqueado = cursor.fetchall()
        
        info = []
        for i in id_bloqueado:
            q = """select user_name from usuarios where id_usuario = %s"""
            cursor.execute(q,(i['id_bloqueado'],))
            usuario = cursor.fetchone()
            info.append({
                'nome': usuario['user_name'],
                'data': i['data_bloq'].strftime('%d/%m/%Y')
            })
        return {
            'status':'success',
            'bloqueados':info
        }, 200
        
class editar_bio(Resource):
    """
        Endpoint responsável por editar a bio
    """
    def put(self):
        """
            Atualiza a bio
            
            Verificações:
                Token('X-CSRFToken'), id do usuário na session
            
            Retornos:
                400 = Usuário não está logado 
                200 = Bio editada com sucesso
        """
        
        token = request.headers.get("X-CSRFToken")
        
        check = check_csrf(token)
        
        if not check or check.get("status") == "error":
            return {'status': 'error', 'mensagem' :check.get("mensagem")}
        
        data = request.get_json()
        con = connection()
        cursor = con.cursor(pymysql.cursors.DictCursor)
        
        if 'usuario_id' not in session:
            return {
                "status":"error",
                "mensagem":"Você precisa estar logado para deletar sua conta"
            }, 400
            
        id = session['usuario_id']
        
        bio = data.get('bio')
        bio = str(escape(bio))
        
        query = """update usuarios set bio = %s where id_usuario = %s"""
        cursor.execute(query,(bio,id))
        
        con.commit()
        cursor.close()
        con.close()
        
        return {
            'status':'success',
            'mensagem':'bio mudada com sucesso'
        }, 200
class editar_nome(Resource):
    """
        Endpoint responsável por editar o nome
    """
    def put(self):
        """
            Atualiza o nome do usuário
            
            Verificações:
                Token('X-CSRFToken'), id do usuário na session, se já existe um usuário com o mesmo nome
                
            Retornos:
                401 = Usuário não está logado
                400 = Nome já está sendo utilizado
                200 = Nome editado com sucesso
        """
        
        token = request.headers.get("X-CSRFToken")
        
        check = check_csrf(token)
        
        if not check or check.get("status") == "error":
            return {'status': 'error', 'mensagem' :check.get("mensagem")}
        
        data = request.get_json()
        con = connection()
        cursor = con.cursor(pymysql.cursors.DictCursor)
        
        if 'usuario_id' not in session:
            return {
                "status":"error",
                "mensagem":"Você precisa estar logado para deletar sua conta"
            }, 401
            
        id = session['usuario_id']
        
        nome = data.get('nome')
        nome = str(escape(nome))
        
        a = """select id_usuario, user_name from usuarios where BINARY user_name = %s"""
        cursor.execute(a,(nome,))
        resposta = cursor.fetchone()
        
        if resposta is not None:
            
            if resposta['id_usuario'] != id :
                return {
                    'status':'error',
                    'mensagem':'esse nome de usuario já está sendo utilizado'
                }, 400
            
            
        query = """update usuarios set user_name = %s where id_usuario = %s"""
        cursor.execute(query,(nome,id))
        
        con.commit()
        cursor.close()
        con.close()
        
        return {
            'status':'success',
            'mensagem':'bio mudada com sucesso'
        }, 200
        
class salvar_video(Resource):
    def post(self):
        print("content-type:", request.content_type)
        print("content-length:", request.content_length)
        token = request.headers.get("X-CSRFToken")
        print("token:", token)
        
        check = check_csrf(token)
        
        if not check or check.get("status") == "error":
            return {'status': 'error', 'mensagem' :check.get("mensagem")}, 400
        
        con = connection()
        cursor = con.cursor(pymysql.cursors.DictCursor)
        
        try:
            request.max_content_length = None
            video = request.files["arquivo"]
            categoria = str(escape(request.form["categoria"]))
            titulo = str(escape(request.form["titulo"]))
            descrisao = str(escape(request.form["descrisao"]))
            id = 1#session['usuario_id']
            
            print("files:", request.files) 
            print("form:", request.form)
            print("video:", video)
            print("categoria:", categoria)
            print("titulo:", titulo)
            print("descrisao:", descrisao)
            data = date.today()
            
            if not video:
                print("video n chegou")
                return {
                    'status':'error',
                    'mensagem':'Nenhum arquivo foi enviado'
                }, 400
        
        except Exception as e:
            print("erro",str(e))
            return {"status":"error"},500
            
        ext = video.filename.rsplit('.', 1)[-1].lower()
        
        if ext not in extensoes_permitidas:
            return {
                'status':'error',
                'mensagem':'esse formato não é permitido'
            }, 400
        
        nome = f'{uuid4()}.{ext}'
        
        try:
            resposta = cloudinary.uploader.upload(video.stream,
                resource_type = "video",
                public_id=nome)
            url = resposta["secure_url"]
        
        except Exception as e:
            print("exception: ", str(e))
            return {
                "status":"error",
                "mensagem":"Não foi possivel salvar o video no cloudinary"
            },400 
        
        query = """insert into streams (categoria, titulo, descrisao, video_url, data_upload, id_streamer) values (%s,%s,%s,%s,%s,%s);"""
        cursor.execute(query,(categoria,titulo,descrisao,url,data,id))
        con.commit()
        cursor.close()
        con.close()
        
        return {
            "status":"success",
            "mensagem":"video foi salvo com sucesso"
        }, 200
    
class salvar_foto(Resource):
    """
        Endpoint responsável por salvar fotos no cloudnary
    """
    def post(self):
        """
            Salva foto de perfil
            
            Verificações:
                Token('X-CSRFToken'), foto foi carregada, tipo de arquivo permitido, id do usuário na session
                
            Retornos:    
                401 = Usuário não está logado
                400 = Nenhum arquivo enviado ou arquivo não suportado
                500 = Não foi possivel salvar a imagem no clounary (erro da API)
                200 = Imagem salva
                
        """
        
        token = request.headers.get("X-CSRFToken")
        
        check = check_csrf(token)
        
        if not check or check.get("status") == "error":
            return {'status': 'error', 'mensagem' :check.get("mensagem")}
        
        con = connection()
        cursor = con.cursor(pymysql.cursors.DictCursor)
        
        foto = request.files["foto"]

        if not foto:
            return {
                'status':'success',
                'mensagem':'Nenhum arquivo foi enviado'
            }, 400
            
        ext = foto.filename.rsplit('.',1)[-1].lower()
        
        if ext not in extensoes_permitidas:
            return {
                'status':'error',
                'mensagem':'Esse tipo de arquivo não é suportado'
            }, 400
        
        nome = f'{uuid4()}.{ext}'
        
        if 'usuario_id' not in session:
            return {
                "status":"error",
                "mensagem":"Você precisa estar logado para deletar sua conta"
            }, 401
            
        id = session['usuario_id']
        #session['usuario_id'] = usuario['id']
        #session.permanent = True
        
        try:
            resposta = cloudinary.uploader.upload(foto.stream, public_id=nome)
            url = resposta["secure_url"]
        except Exception as e:
            print(e)
            return {
                "status":"error",
                "mensagem":"Não foi possivel salvar a imagem no cloudinary"
            },500 
        
        query = """update usuarios set foto_url = %s where id_usuario = %s"""
        cursor.execute(query,(url,id))
        con.commit()
        cursor.close()
        con.close()
        
        return {
            "status":"success",
            "mensagem":"foto foi salva com sucesso"
        }, 200        
    
class validar_captcha(Resource):
    """
        Endpoint responsável por validar captcha
    """
    
    def post(self):
        """
            Valida o CAPTCHA enviado
            
            Validações:
                Token('X-CSRFToken'), captcha correto
            
            Retornos: 
                200 = CAPTCHA valido
                403 = CAPTCHA invalido
        """
        
        token = request.headers.get("X-CSRFToken")
        
        check = check_csrf(token)
        
        if not check or check.get("status") == "error":
            return {'status': 'error', 'mensagem' :check.get("mensagem")}
        
        data = request.get_json()
        
        captcha = data.get('captcha')
        
        verifica = 'https://www.google.com/recaptcha/api/siteverify'
        
        load_dotenv()

        secret = os.getenv("CAPTCHA_SECRET")
        
        info = {
            'secret': secret,
            'response': captcha
        }
        
        envia = requests.post(verifica, data=info)
        resultado = envia.json()
        
        if resultado.get('success'):
            return {
                'status':'success',
                'mensagem':'Captcha válido'
            }, 200
    
        return {
                'status':'error',
                'mensagem':'captcha inválido'
            }, 403
        