from flask import Flask, render_template, redirect, url_for, session 
from flask_restful import Api, Resource
from backend.resources.auth import foto_streamer,subscribe ,zerar_cadastro_google, videos,comentarios, inscritos, curtidas ,views ,update_Password, parametros, preferencias,signin, login, salvar_foto, bloqueados, salvar_video, editar_bio, editar_nome, forgot,redefine_password,delete_Account,bloquear, logout,desbloquear, check_login , search,translate, resend_code, check_codigo, google, explorar_dados, seguindo_videos
from dotenv import load_dotenv
from authlib.integrations.flask_client import OAuth
import os
#from flask_limiter import Limiter
#from flask_limiter.util import get_remote_address
from flask_wtf.csrf import generate_csrf
from datetime import timedelta
#from backend.database.connection import limiter
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.formparser import MultiPartParser
from werkzeug.middleware.proxy_fix import ProxyFix
import pymysql

# aqui eu to carregando o .env pra que eu possa pegar asn senhas dele
load_dotenv()

# Oiii prof aqui eu to expecificando aonde tão as pastas porque ele não tava encontrando
app = Flask(__name__, template_folder='frontend/templates', static_folder='frontend/static')
app.secret_key = os.getenv("SECRET_KEY")

app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024
app.config['SESSION_COOKIE_HTTPONLY'] = True    
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax' 
app.config['PREFERRED_URL_SCHEME'] = 'https'

app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
api = Api(app)
oauth = OAuth(app)

#limiter.init_app(app)

MultiPartParser.max_form_memory_size = 500 * 1024 * 1024

#app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)

oauth.register(
    name='google',
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

#  é pra ficar mais fácil, porque e ele abre o site 
@app.route("/")
def home():  
    return render_template("inicio.html")

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

@app.route("/turbo")
def turbo():
    return render_template("turbo.html")

@app.route("/seguindo")
def seguindo():
    return render_template("seguindo.html")

@app.route("/explorar")
def explorar():
    return render_template("explorar.html")

@app.errorhandler(RequestEntityTooLarge)
def handle_large_file(e):
    return {'status': 'error', 'mensagem': 'Arquivo muito grande'}, 413

@app.route('/login/google')
def login_google():
    redirect_uri = url_for('authorize', _external=True)
    return oauth.google.authorize_redirect(redirect_uri)

@app.route('/completar_google')
def completar_google():
    if 'google_pendente' not in session:
        return redirect(url_for('home'))
    return render_template('turbo.html', dados=session['google_pendente'])

@app.route('/authorize')
def authorize():
    from backend.database.connection import connection
    
    token = oauth.google.authorize_access_token()
    
    info = token.get('userinfo')
    
    if not info:
        resposta = oauth.google.get('https://openidconnect.googleapis.com/v1/userinfo')
        info = resposta.json()
    
    email = info.get('email') 
    nome = info.get('name') or email.split('@')[0]
    foto = info.get('picture')
    
    con = connection()
    cursor = con.cursor(pymysql.cursors.DictCursor)
    
    query = "select id_usuario from usuarios where email =%s"
    cursor.execute(query,(email,))
    usuario = cursor.fetchone()
    cursor.close()
    con.close()
    
    if usuario:
        session['usuario_id'] = usuario['id_usuario'] 
        return redirect(url_for('home'))
    
    session['google_pendente'] = {'email':email , 'nome':nome , 'foto':foto}
    return redirect(url_for('completar_google'))


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

api.add_resource(zerar_cadastro_google,'/zerar_cadastro_google')

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

api.add_resource(preferencias,'/preferencias')

api.add_resource(parametros, '/parametros')
api.add_resource(videos, '/videos')
api.add_resource(curtidas, '/curtidas')
api.add_resource(views, '/view')
api.add_resource(inscritos, '/inscritos')
api.add_resource(comentarios, '/comentarios')
api.add_resource(subscribe, '/subscribe')
api.add_resource(foto_streamer, '/foto_streamer')

api.add_resource(explorar_dados, '/api/explorar')
api.add_resource(seguindo_videos, '/seguindo_videos')

# É só pra garantir que só se pode rodar ele pela main
#if __name__ == "__main__":
#    port = int(os.environ.get("PORT", 5000))
#    app.run(host="0.0.0.0", port=port)

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )