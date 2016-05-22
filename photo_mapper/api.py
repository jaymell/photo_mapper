from __future__ import print_function
from photo_mapper import app
import photo_mapper as pm
import flask
import flask_restful as fr
from flask_restful import reqparse
import sys
import json
from bson import json_util
import imghdr
import datetime
import models

api = fr.Api(app)

def already_exists(class_name, **kwargs):
  """ check to see if record already exists, the
        idea is that all must-be-unique items for a 
        class are iterated through and checked individually """
  model = getattr(models, class_name)
  # iterate through individual key-val pairs of kwargs
  # and launch separate query for each -- is this any
  # better than just a failed insert?
  for k, v in kwargs.items():
    if len (model.query.filter_by(**{k:v}).all()):
      return {k:v}
  return False
        

class UserListAPI(fr.Resource):
  def __init__(self):
    self.reqparse = reqparse.RequestParser()
    self.reqparse.add_argument('name', type = str, required = True,
      help = "No username provided")
    self.reqparse.add_argument('email', type = str, required = True,
      help = "No email provided")
    super(UserListAPI, self).__init__()

  def get(self):
    return User

  def post(self):
    args = self.reqparse.parse_args()
    results = already_exists('User', name=args.name, email=args.email)
    if results:
      return 'already exists: %s' % results, 409
    # else try to insert:
    try: 
        user = models.User(args.name, args.email)
        pm.db.session.add(user)
        pm.db.session.commit()
    except Exception as e:
        return '%s' % e, 500
    else:
        return user.serialize, 200
    
            
    
api.add_resource(UserListAPI, '/api/users')
 
class UserAPI(fr.Resource):
  def get(self):
    pass
api.add_resource(UserAPI, '/api/users/<user>')

class AlbumAPI(fr.Resource):
  def get(self):
    pass


#@app.route("/api/users/<user>/albums", methods=['GET'])
#def album_api(user):
#""" returns list of albums -- since
#albums are retrieved from individual
#photo records """
#if flask.request.method == 'GET':
#col = pm.get_collection()
#                albums = [ i for i in col.distinct('album', {'user': user}) ]
#                albums = json.dumps(albums, default=json_util.default)
#                return albums
#        else:
#                return 'error', 405


#@app.route("/api/users/<user>/albums/<album>/photos", methods=['GET', 'POST'])
#def photo_api(user, album):
#        """ GET: sort and return photo list json given user and album 
#                POST: expects photo uploads, not json, does the storage 
#                        of photos and db update
#        """
#
#        col = pm.get_collection()
#        if flask.request.method == 'POST':
#                """ this shows file number but obviously only gets first one
#                files = flask.request.files.getlist('0')
#                for f in files: 
#                        print(f, file=sys.stderr)
#                """
#                files = flask.request.files
#                for f in files:
#                        print(files[f], file=sys.stderr)
#                        pm.handle_file(files[f], user, album)
#                return 'success'
#
#        elif flask.request.method == 'GET':
#                photos = [ i for i in col.find({'user': user, 'album': album}, {'_id': False}) ]
#                photos.sort(key=lambda k: datetime.datetime.strptime(k['date'],'%Y-%m-%d %H:%M:%S'))
#                photos = json.dumps(photos, default=json_util.default)
#                return photos
#
