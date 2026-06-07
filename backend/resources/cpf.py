import requests
from validate_docbr import CPF 

cpf_api = CPF()

def cpf_math_validate(cpf):
    
    if cpf_api.validate(cpf):
        return True
    
    return False


def cpf_real_or_not(cpf, data_nascimento):
    # URL correta da API atualizada do Hub do Desenvolvedor
    url_da_api = "https://ws.hubdodesenvolvedor.com.br/v2/cpf/?cpf=$cpf&data=$data_de_nascimento_formato_pt_br&token=208382980qpnWZIDwHB376229152" 
    
    parametros_obrigatorios = {
        "cpf": cpf,
        "data": data_nascimento,
        "token": "208382980qpnWZIDwHB376229152"
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