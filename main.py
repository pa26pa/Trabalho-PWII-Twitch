from flask import Flask, render_template
from flask_restful import Api, Resource
from backend.resources.auth import signin, login, forgot, redefine_password, search, resend_code, check_codigo, google
from dotenv import load_dotenv
from authlib.integrations.flask_client import OAuth
import os

# aqui eu to carregando o .env pra que eu possa pegar as senhas dele
load_dotenv()

# Oiii prof aqui eu to expecificando aonde tão as pastas porque ele não tava encontrando
app = Flask(__name__, template_folder='frontend/templates', static_folder='frontend/static')
api = Api(app)
app.secret_key = os.getenv("SECRET_KEY")

oauth = OAuth(app)

google = oauth.register(
    name='google',
    client_id=os.getenv("CLIENT_ID"),
    client_secret=os.getenv("CLIENT_SECRET_KEY") ,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={'scope':'openid profile email'}
)

#  é pra ficar mais fácil, porque ele abre o site 
@app.route("/")
def home():
    return render_template("teste.html")

# Aqui eu defino os endpoints que o js pode acessar, e defino uma função para cada um delessssssss
api.add_resource(signin,'/signin')
api.add_resource(login,'/login')
api.add_resource(google,'/login/google')

api.add_resource(forgot,'/forgot')
api.add_resource(resend_code,'/resend')
api.add_resource(check_codigo,'/check_codigo')
api.add_resource(redefine_password,'/redefine_password')

api.add_resource(search,'/search')

# É só pra garantir que só se pode rodar ele pela main
if __name__ == "__main__":
    app.run(debug=True)