#!/usr/bin/python

import os
import uuid
import datetime
import json
from pymongo import MongoClient
import re
import jpgps
import sys
import hashlib
from PIL import Image
import io

class InsertError(Exception):
	pass

class Jpeg:
	""" quick n dirty way to get extra
		attributes along with file handle """

	def __init__(self, f):
		self.fh = open(f, 'rb')
		self.name = self.fh.name
		self.path, self.file_name_orig = os.path.split(self.fh.name)
		self.md5sum = hashlib.md5(self.fh.read()).hexdigest()
		self.file_name_new = str(self.md5sum) + '.jpg'
		self.thumb_name = str(self.md5sum) + '-thumbnail.jpg'
	def close(self):
		self.fh.close()

def get_db_duplicates(md5sum, collection):
	results = [ i for i in collection.find({'md5sum': md5sum}) ]
	return results

def write_image(file_handle, destination, rotation, thumbnail=False):
	""" write image, rotating if necessary and stripping out
		exif data for illusion of privacy's sake """

	# if thumbnail was passed, convert it to 
	# file-like stream object first:
	if thumbnail:
		file_handle = io.BytesIO(file_handle)
	img = Image.open(file_handle)
	if rotation:
			print('\trotating...')
			img = img.rotate(rotation)
	img.save(destination)

def update_db(db_entry, collection):
	try:
		collection.insert_one(db_entry)
	except Exception as e:
		raise InsertError

def process(jpeg, collection):
	""" figure out whether it's a db duplicate; act
		accordingly """

	write_file_only = False

	db_dupes = get_db_duplicates(jpeg.md5sum, collection)
	if db_dupes:
		if len(db_dupes) > 1:
			print('Multiple DB duplicates found. Exiting: ', jpeg.file_name_orig)
			sys.exit(3)
		else:
			# if there's a single duplicate and the image already exists, skip it:
			if os.path.exists(os.path.join(PHOTO_FOLDER,jpeg.file_name_new)):
				print('Duplicate found. Skipping: ', jpeg.file_name_orig)
			# there's already a db entry but the image was deleted, just copy the image:
			else:
				print('DB entry found but file is missing... copying file')
				write_file_only = True	
			return

	# try to update database AND
	# put files in right place; if one
	# fails, undo the other:	
	try:
		jpeg.fh.seek(0)
		jpeg.jpgps = jpgps.Jpgps(jpeg.fh)
		db_entry = jpeg.jpgps.as_dict()
	except Exception as e:
		print('Failed to instantiate Jpgps object for %s: %s' % (jpeg.file_name_orig, e))
		return

	# add the md5sum and file_name_new from jpeg to the gps data to be inserted:
	db_entry['md5sum'] = jpeg.md5sum
	db_entry['file_name'] = jpeg.file_name_new
	# adding long/lat again, but this time as geojson point:
	db_entry['geojson'] = { "type": "Point", 
							"coordinates": [jpeg.jpgps.coordinates()[1], 
								jpeg.jpgps.coordinates()[0]]}
	db_entry["thumbnail"] = jpeg.thumb_name

	if not write_file_only:
		try:
			update_db(db_entry, collection)
		except InsertError as e:
			print('Failed to update database with %s: %s' % (jpeg.file_name_orig, e))
			return

	# write file:
	try:
		jpeg.fh.seek(0)
		write_image(jpeg.fh, os.path.join(PHOTO_FOLDER,jpeg.file_name_new), jpeg.jpgps.rotation()) 
		# write thumbnail:
		write_image(jpeg.jpgps.tags['JPEGThumbnail'], os.path.join(PHOTO_FOLDER,jpeg.thumb_name), jpeg.jpgps.rotation(), thumbnail=True) 
	except Exception as e:
		print('Failed to write file. Attempting to remove from database:\n\t%s' % e)
		# if write failed, try to remove DB entry just added:
		try:
			collection.remove(db_entry)
		except Exception as e:
			print('Failed to remove item from database -- db is no longer consistent w/ file system: %s' % e)
			sys.exit(4)
	finally:
		jpeg.close()
	
if __name__ == '__main__':

	MONGODB_HOST = 'localhost'
	MONGODB_PORT = 27017
	DB_NAME = 'photo_mapper'
	COLLECTION_NAME='photo_mapper'
	PHOTO_FOLDER = './public/img'
	connection = MongoClient(MONGODB_HOST, MONGODB_PORT)
	collection = connection[DB_NAME][COLLECTION_NAME]

	if len(sys.argv) != 2:
		print('Usage: %s <directory name>' % sys.argv[0])
		sys.exit(1)
	location = sys.argv[1]
	try:
		dir_items = os.listdir(location)	
	except Exception as e:
		print('Failed to open directory: %s' % e)	
		sys.exit(2)
	for item in dir_items:
		# is there better way to discern jpeg-edness?
		# furthermore, TIFFs are also theoretically possible
		if item[-3:].lower() == 'jpg' or item[-4:].lower() == 'jpeg':
			try:
				jpeg = Jpeg(os.path.join(location, item))
			except Exception as e:
				print('Failed to create jpeg object from %s: %s' % (item, e))
			else:
				print('FILE NAME: %s' % jpeg.file_name_orig)
				try:
					process(jpeg, collection)
				finally:
					jpeg.close()
