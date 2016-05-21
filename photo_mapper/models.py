from __future__ import print_function
import flask
import flask_sqlalchemy as fsql

from photo_mapper import app
import photo_mapper as pm

db = fsql.SQLAlchemy(app)

class User(db.Model):
  pk = db.Column(db.Integer, primary_key=True)    
  user_name = db.Column(db.String(64), unique=True)
  
class Album(db.Model):

class Photo(db.Model):


