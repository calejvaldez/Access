# app.py
# Carlos Valdez

from flask import Flask
from .cvaldez import access


def create_app():
    inner_app = Flask(__name__, static_folder=None)
    inner_app.register_blueprint(access.views.bp)
    inner_app.register_blueprint(access.api.bp)

    return inner_app


app = create_app()
