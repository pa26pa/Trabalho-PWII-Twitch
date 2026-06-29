from flask import Flask, render_template
from flask_restful import Api, Resource
from backend.resources.auth import update_Password, signin, login, salvar_foto, bloqueados, salvar_video, editar_bio, editar_nome, forgot,redefine_password,delete_Account,bloquear, logout,desbloquear, check_login , search,translate, resend_code, check_codigo, google
from dotenv import load_dotenv
from authlib.integrations.flask_client import OAuth
import os
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_wtf.csrf import CSRFProtect, generate_csrf
from datetime import timedelta
from backend.database.connection import limiter

# aqui eu to carregando o .env pra que eu possa pegar asn senhas dele
load_dotenv()

# Oiii prof aqui eu to expecificando aonde tão as pastas porque ele não tava encontrando
app = Flask(__name__, template_folder='frontend/templates', static_folder='frontend/static')
api = Api(app)
app.secret_key = os.getenv("SECRET_KEY")

oauth = OAuth(app)

limiter.init_app(app)

csrf = CSRFProtect(app)
csrf.exempt("backend.resources.auth.salvar_video")
csrf.exempt("backend.resources.auth.salvar_foto")

app.config['SESSION_COOKIE_HTTPONLY'] = True   
app.config['SESSION_COOKIE_SECURE'] = True     
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax' 
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024
#app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)

#google = oauth.register(
#    name='google',
#    client_id=os.getenv("CLIENT_ID"),
#    client_secret=os.getenv("CLIENT_SECRET_KEY") ,
#    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
#    client_kwargs={'scope':'openid profile email'}
#)

#  é pra ficar mais fácil, porque e ele abre o site 
@app.route("/")
def home():  
    return render_template("teste.html")

@app.route("/csrf-token")
def csrf_token():
    return {"csrf_token":generate_csrf()}

@app.route("/moon")
def luna():
    return render_template("moon.html")

@app.route("/config")
def config(): 
    return render_template('config.html')

@app.route("/ajuda")
def ajuda():
    return render_template("ajuda.html")

@app.route("/perfil")
def perfil():
    return render_template("perfil.html")

# Aqui eu defino os endpoints que o js pode acessar, e defino uma função para cada um delessssssss
api.add_resource(signin,'/signin')
api.add_resource(login,'/login')
api.add_resource(logout, '/logout')
api.add_resource(bloquear, '/bloquear')
api.add_resource(desbloquear, '/desbloquear')
api.add_resource(bloqueados, '/bloqueados')
api.add_resource(update_Password, '/update')
#api.add_resource(upload,'/upload')
api.add_resource(salvar_video, '/salvar_video')
api.add_resource(salvar_foto, '/salvar_foto')

#api.add_resource(google,'/login/google')

api.add_resource(editar_bio,'/editar_bio')
api.add_resource(editar_nome,'/editar_nome')
api.add_resource(delete_Account, '/delete')
api.add_resource(forgot,'/forgot')
api.add_resource(resend_code,'/resend')
api.add_resource(check_codigo,'/check_codigo')
api.add_resource(redefine_password,'/redefine_password')

api.add_resource(check_login, '/session')
api.add_resource(search,'/search')
api.add_resource(translate,'/traduzir')


# É só pra garantir que só se pode rodar ele pela main
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)