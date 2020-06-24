# -*- coding: utf-8 -*-

from flask import Flask
from flask import render_template
import os
import sys


application = Flask(__name__)

host = os.getenv("DB_HOST")
user = os.getenv("DB_USER")
password = os.getenv("DB_PASSWORD")

if not (host and user and password):
    print('Could NOT retrieve DB information from environment variables. Exiting...')
    sys.exit(-1)


@application.route('/')
def index():
    print(1)
    return render_template("index.html", host=host, user=user)


if __name__ == '__main__':
    application.run(debug=True, host='0.0.0.0', port='80')
