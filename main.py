from flask import Flask, render_template
from flask_restful import Api, Resource
from backend.resources.auth import signin, login, forgot, redefine_password, search, resend_code, check_codigo
app = Flask(__name__, template_folder='frontend/templates', static_folder='frontend/static')
api = Api(app)
app.secret_key = 'projeto_secreto'

@app.route("/")
def home():
    return render_template("inicio.html")

api.add_resource(signin,'/signin')
api.add_resource(login,'/login')

api.add_resource(forgot,'/forgot')
api.add_resource(resend_code,'/resend')
api.add_resource(check_codigo,'/check_codigo')
api.add_resource(redefine_password,'/redefine_password')

api.add_resource(search,'/search')
if __name__ == "__main__":
    app.run(debug=True)