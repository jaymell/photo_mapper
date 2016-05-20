from __future__ import print_function 
import flask
import photo_mapper as pm
from photo_mapper import app

""" html routes """
@app.route("/")
def index():
	""" landing page """
	return flask.render_template("index.j2")

@app.route("/users/<user>")
def user_landing(user):
	""" user page... just redirect to albums page for now """
	return flask.redirect("/users/%s/albums" % user)

@app.route("/users/<user>/albums")
def get_albums(user):
	""" render albums template -- save user in cookie """

	if pm.USE_S3:
		photo_url = pm.S3_URL
	else:
		photo_url = pm.LOCAL_URL

	resp = flask.make_response(flask.render_template("albums.j2", photo_route=photo_url))
	resp.set_cookie('user', user)
	return resp

@app.route("/users/<user>/albums/<album>")
def get_album(user, album):

	if pm.USE_S3:
		photo_url = pm.S3_URL
	else:
		photo_url = pm.LOCAL_URL

	# if request to edit was made, do it:
	if flask.request.args.get('edit') == 'true':
		# there's got to be better way to get this:
		resp = flask.make_response(flask.render_template("photo_edit.j2", photo_route=photo_url))
		resp.set_cookie('user', user)
		resp.set_cookie('album', album)
		return resp

	resp = flask.make_response(flask.render_template("photo_mapper.j2", KEY=pm.GMAPS_KEY, photo_route=photo_url))
	resp.set_cookie('user', user)
	resp.set_cookie('album', album)
	return resp



