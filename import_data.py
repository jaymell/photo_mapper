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

def get_db_duplicates(md5sum, collection, user):
	results = [ i for i in collection.find({'md5sum': md5sum, 'user': user}) ]
	return results

def write_image(file_handle, folder, name, rotation):
	""" write image, rotating if necessary and stripping out
		exif data for illusion of privacy's sake """

	QUALITY = 50
	SCALED = 1000
	THUMBNAIL = 512
	SMALL = 100

	try:
		img = Image.open(file_handle)
	except Exception as e:
		print('Failed to open image: %s' % e)

	if rotation:
			print('\trotating...')
			img = img.rotate(rotation)

	width, height = img.size
	sizes = { 
		'full': { 
			'width': width,
			'height': height,
			'name': name
		}
	}
	# scale largest dimension to SCALED px if one
	# of them is larger -- skip 'scaled' altogether
	# neither larger than SCALED:
	big_dimension = width if width > height else height
	if big_dimension > SCALED:
		sizes['scaled'] = {
			'width': int(width * SCALED/float(big_dimension)),
			'height': int(height * SCALED/float(big_dimension)),
			'name': name + '-scaled' 
		}
	# hackish, but trying to save space til a better idea
	# comes:
	else: os.symlink(os.path.join(folder,name), os.path.join(folder, name+'-scaled'))

	# thumbnail scaling:
	sizes['thumbnail'] = { 
			'width': int(width * SCALED/float(big_dimension)),
			'height': int(height * SCALED/float(big_dimension)),
			'name': name + '-thumbnail'
	}
	# hackish, but trying to save space til a better idea
	# comes:
	sizes['small'] =  {
			'width': SMALL,
			'height': SMALL,
			'name': name + '-small'
		}


	extension = '.jpg'	
	for key, size in sizes.items():
		# resize and save:
		destination = os.path.join(folder,size['name']+extension)
		print('Saving %s... ' % destination)
		try:
			print('Original dimensions: %s\t%s' % ((width, height)))
			print('Current: %s\t%s' % ((size['width'], size['height'])))
			resized = img.resize((size['width'], size['height']), Image.ANTIALIAS)
			resized.save(destination, quality=QUALITY)
		except Exception as e:
			print('Failed to save %s: %s' % (destination, e))
		
	# because the call needs to know whether to update dimensions in json:
	# more hackish nonsense:
	return width, height

def update_db(db_entry, collection):
	try:
		collection.insert_one(db_entry)
	except Exception as e:
		raise InsertError

def process(jpeg, collection, user):
	""" figure out whether it's a db duplicate; act
		accordingly """

	write_file_only = False

	db_dupes = get_db_duplicates(jpeg.md5sum, collection, user)
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
	db_entry["user"] = user
	# write file:
	try:
		jpeg.fh.seek(0)
		# write the file in various sizes:
		width, height = write_image(jpeg.fh, PHOTO_FOLDER, jpeg.md5sum, jpeg.jpgps.rotation()) 
	except Exception as e:
		print('Failed to write image to file system: %s' % e)
		jpeg.close()
		return
	
	# if image is rotated, 'height' and 'width' need to be flipped, 
	#so have write_image func return the dimensions of saved image
	# -- hackish, but for now, fuck it:
	db_entry['width'] = width
	db_entry['height'] = height

	if not write_file_only:
		try:
			update_db(db_entry, collection)
		except InsertError as e:
			print('Failed to update database with %s: %s' % (jpeg.file_name_orig, e))

	jpeg.close()
	
if __name__ == '__main__':

	import imghdr

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
	user = raw_input('Enter user name: ')
	try:
		dir_items = os.listdir(location)	
	except Exception as e:
		print('Failed to open directory: %s' % e)	
		sys.exit(2)
	for item in dir_items:
		if imghdr.what(os.path.join(location,item)) == 'jpeg':
			try:
				jpeg = Jpeg(os.path.join(location, item))
			except Exception as e:
				print('Failed to create jpeg object from %s: %s' % (item, e))
			else:
				print('FILE NAME: %s' % jpeg.file_name_orig)
				try:
					process(jpeg, collection, user)
				finally:
					jpeg.close()
