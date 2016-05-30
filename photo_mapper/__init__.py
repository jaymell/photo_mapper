from __future__ import print_function
import flask
import flask_sqlalchemy as fsql
import ConfigParser
import os
from pymongo import MongoClient
import photo_importer 
import sys
import tempfile
import imghdr
import boto

app = flask.Flask(__name__)

p = ConfigParser.ConfigParser()
p.read("config")

MYSQL_HOST = os.environ.get('MYSQL_HOST', p.get('DB', 'MYSQL_HOST'))
MYSQL_PORT = int(os.getenv('MYSQL_PORT', p.get('DB', 'MYSQL_PORT')))
MYSQL_DB = os.environ.get('MYSQL_DB', p.get('DB', 'MYSQL_DB'))
MYSQL_USER = os.environ.get('MYSQL_USER', p.get('DB', 'MYSQL_USER'))
### is this the best way to handle this? probably not
MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', p.get('DB', 'MYSQL_PASSWORD'))
####

# this one needs some pre-processing to prevent 'False'
# being interpreted as True:
USE_S3_ENV = os.environ.get('USE_S3')
if USE_S3_ENV:
        if USE_S3_ENV.lower() == 'false':
                USE_S3 = False
        else:
                USE_S3 = True


app.config.update(
    # based on output of imghdr.what:
    SUPPORTED_TYPES = ['jpeg'],
    SQLALCHEMY_TRACK_MODIFICATIONS = False,
    SQLALCHEMY_DATABASE_URI = 'mysql://%s:%s@%s:%s/%s' % (MYSQL_USER,MYSQL_PASSWORD,MYSQL_HOST,MYSQL_PORT,MYSQL_DB),
    USE_S3 = USE_S3 if 'USE_S3' in globals() else p.getboolean('STORAGE', 'USE_S3'),
    GMAPS_KEY = os.environ.get('KEY', p.get('GMAPS', 'KEY')),
    S3_BUCKET = os.environ.get('S3_BUCKET', p.get('STORAGE', 'S3_BUCKET')),
    S3_URL = os.environ.get('S3_URL', p.get('STORAGE', 'S3_URL')),
    LOCAL_URL = os.environ.get('LOCAL_URL', p.get('STORAGE', 'LOCAL_URL')),
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', p.get('STORAGE', 'UPLOAD_FOLDER')),
    # 100 MB upload limit:
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024,
    PROPAGATE_EXCEPTIONS = True,
    Debug = True
)
### unset password variables:
del(MYSQL_PASSWORD)
if 'MYSQL_PASSWORD' in os.environ:
    del(os.environ['MYSQL_PASSWORD'])

# intialize db object:
db = fsql.SQLAlchemy(app)
import models
import photo_mapper.views
import photo_mapper.api


def get_collection(): 
        """ handles connections to Mongo; pymongo.MongoClient does its own 
                pooling, so nothing fancy required --- just make a handle to 
                the db collection available """ 
 
        collection = getattr(flask.g, '_collection', None) 
        if collection is None: 
                db = MongoClient(app.config['MONGODB_HOST'], app.config['MONGODB_PORT']) 
                collection = flask.g._collection = db[app.config['DB_NAME']][app.config['COLLECTION_NAME']] 
        return collection 
 
def get_s3(): 
        """ handles connections to s3; only creation new object if 
                doesn't already exist; boto is supposed to be smart enough 
                to handle re-connections itself """ 
         
        bucket = getattr(flask.g, '_bucket', None) 
        if bucket is None: 
                connection = boto.connect_s3() 
        bucket = flask.g._bucket = connection.get_bucket(app.config['S3_BUCKET']) 
        return bucket 

def build_link(name):
  """ i.e., take a picture's name and prepend appropriate URL to it """
  location = app.config['S3_URL'] if app.config['USE_S3'] else app.config['LOCAL_URL']
  return location + name

