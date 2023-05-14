# cvaldez/access/views.py
# Carlos Valdez
#
# The views for the Access authentication system

from flask import render_template, Blueprint

bp = Blueprint('access', __name__,
               template_folder='templates',
               static_folder='static',
               url_prefix='/access/')


@bp.route('/')
def index():
    # The promo page
    return render_template('index.html')
