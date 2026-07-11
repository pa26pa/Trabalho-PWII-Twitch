"""
            Módulo de seguranças e verificações
    Esse módulo cria soluções para possiveis ataques ou 
    falhas da segurança. As soluções serão utilizadas pelos 
    endpoints da APIRest. 
"""
import requests
from validate_docbr import CPF 
import os
from dotenv import load_dotenv
from flask_wtf.csrf import validate_csrf
from flask import request

load_dotenv()

secret = os.getenv("CAPTCHA_SECRET")
token = os.getenv("token_hub")

cpf_api = CPF()

def cpf_math_validate(cpf):
    """
        Essa função valida se o cpf é matemáticamente correto

        Parâmetros:
            cpf = argumento inserido pelo usuário
        
        Retornos:
            True = CPF matematicamente correto
            False = CPF matematicamente incorreto
    """    
    if cpf_api.validate(cpf):
        return True
    
    return False


def cpf_real_or_not(cpf, data_nascimento):
    """
        Essa função valida se esse cpf existe e retira informações 
        sobre o dono do cpf, a partir no cpf e a data de nascimento
        
        Parâmentros:
            cpf = argumento inserido pelo usuário
            data_nascimento = argumento inserido pelo usuário
        
        Retornos:
            True = Dados foram recebidos
            False = Não foi possivel receber os dados
            error = Erro conxão com a internet
    """
    # URL da API atualizada do Hub do Desenvolvedor
    url_da_api = "https://ws.hubdodesenvolvedor.com.br/v2/cpf/?cpf=$cpf&data=$data_de_nascimento_formato_pt_br&token=208382980qpnWZIDwHB376229152" 
    
    parametros_obrigatorios = {
        "cpf": cpf,
        "data": data_nascimento,
        "token": token
    }

    try:
        # Enviamos a requisição para o endpoint correto de dados
        resposta = requests.get(url_da_api, params=parametros_obrigatorios, timeout=10)
        
        if resposta.status_code == 200:
            dados = resposta.json()
            print("Conectado com sucesso! Dados recebidos:")
            print(dados)
            return True
        else:
            print(f"Erro na conexão. Código HTTP: {resposta.status_code}")
            print(f"Resposta do servidor: {resposta.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"Erro ao tentar conectar à internet: {e}")
        return {
            'status':'error',
            'mensagem':'Erro ao conectar à internet'
        }

def captcha(captcha):
    """
        Função responsável por validar o CAPTCHA feito melo usuário
        
        Parâmetros:
            captcha = valor enviado pelo js
        
        Retornos:
            error = CAPTCHA inválido
            success = captcha válido
    """
    verifica = 'https://www.google.com/recaptcha/api/siteverify'
        
    info = {
        'secret': secret,
        'response': captcha
    }
    
    envia = requests.post(verifica, data=info)
    resultado = envia.json()
    
    if not resultado.get('success'):
        return {
            'status':'error',
            'mensagem':'captcha inválido'
        }
    return {
        'status':'success',
        'mensagem':'captcha válido'
    }
    
def check_csrf(token):
    """
        Função reponsável por validar o token enviado pelo JS
        
        Parâmetros:
            token = Token('X-CSRFToken') enviado pelo js na requisição
        
        Retornos:
            error = Token incorreto
            success = Token válido
    """
    try:
        validate_csrf(token)
    except Exception:
        return {
            'status':'error',
            'mensagem':'token incorreto'
        }
    return {
        'status':'success',
        'mensagem':'Token válido'
    }