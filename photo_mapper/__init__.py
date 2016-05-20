import flask
import ConfigParser
import os
from pymongo import MongoClient

app = flask.Flask(__name__)

import photo_mapper.views
import photo_mapper.api


app.config.update(
    # 100 MB upload limit:
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024,
    PROPAGATE_EXCEPTIONS = True,
    Debug = True
)
p = ConfigParser.ConfigParser()
p.read("config")
MONGODB_HOST = os.environ.get('MONGODB_HOST', p.get('DB', 'MONGODB_HOST'))
MONGODB_PORT = int(os.environ.get('MONGODB_PORT', p.get('DB', 'MONGODB_PORT')))
DB_NAME = os.environ.get('DB_NAME', p.get('DB', 'DB_NAME'))
COLLECTION_NAME = os.environ.get('COLLECTION_NAME', p.get('DB', 'COLLECTION_NAME'))
GMAPS_KEY = os.environ.get('KEY', p.get('GMAPS', 'KEY'))
S3_BUCKET = os.environ.get('S3_BUCKET', p.get('STORAGE', 'S3_BUCKET'))
S3_URL = os.environ.get('S3_URL', p.get('STORAGE', 'S3_URL'))
LOCAL_URL = os.environ.get('LOCAL_URL', p.get('STORAGE', 'LOCAL_URL'))
UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', p.get('STORAGE', 'UPLOAD_FOLDER'))

# constant set at runtime to disable use of s3 -- expects True or False
# -- but assume True:
USE_S3 = os.environ.get('USE_S3')
if USE_S3:
        if USE_S3.lower() == 'false':
                USE_S3 = False
        else:
                USE_S3 = True

def get_collection(): 
        """ handles connections to Mongo; pymongo.MongoClient does its own 
                pooling, so nothing fancy required --- just make a handle to 
                the db collection available """ 
 
        collection = getattr(flask.g, '_collection', None) 
        if collection is None: 
                db = MongoClient(MONGODB_HOST, MONGODB_PORT) 
                collection = flask.g._collection = db[DB_NAME][COLLECTION_NAME] 
        return collection 
 
def get_s3(): 
        """ handles connections to s3; only creation new object if 
                doesn't already exist; boto is supposed to be smart enough 
                to handle re-connections itself """ 
         
        bucket = getattr(flask.g, '_bucket', None) 
        if bucket is None: 
                connection = boto.connect_s3() 
        bucket = flask.g._bucket = connection.get_bucket(S3_BUCKET) 
        return bucket 

