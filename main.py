from flask import Flask
from flask_restful import Api, Resource
from backend import signin, login, forgot, redefine_password
app = Flask(__name__)
api = Api(app)
app.secret_key = 'projeto_secreto'

api.add_resource(signin,'/signin')
api.add_resource(login,'/login')

api.add_resource(forgot,'/forgot')
api.add_resource(redefine_password,'/redefine_password')

if __name__ == "__main__":
    app.run(debug=True)