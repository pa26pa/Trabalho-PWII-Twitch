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