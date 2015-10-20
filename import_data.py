#!/usr/bin/python

import os
import uuid
import datetime
import dateutil.tz
import json
from pymongo import MongoClient
import re

def is_duplicate(md5sum, collection):
	'''check whether a record with same md5sum
		already exists in given mongo collection'''
	results = [ i for i in collection.find({'md5sum': md5sum}) ]
	if results:
		print('\nDuplicate found! %s\n' % item)
		return True
	else:
		return False

def process(jpeg, collection, dest_folder):
	''' expects to be passed a jpeg file handle, and
		a db collection handle '''

	'''
	hashlib.md5(open('/home/backup/pictures/2015 vacation/20150907_130923.jpg', 'rb').read()).hexdigest()

	) open, generate md5sum
	) check if it's duplicate in DB
	if yes: 
		if file exists on file system:
			if md5sum(file) == file name:
				it's a duplicate -- return True
		else:
			delete db entry
			return False
	if no:
		write db entry
		write file (possibly overwriting)

	'''
	md5sum = hashlib.md5(jpeg.read()).hexdigest()
	if not is_duplicate(md5sum, collection): 
		# try to update database AND
		# put files in right place; if one
		# fails, undo the other:	
		try:
			jpeg_obj = jpgps.Jpgps(jpeg)
		except Exception as e:
			print('Failed to instantiate Jpgps object: %s' % e)
			return
		the_dict = jpeg_obj.as_dict()
		the_dict['md5sum'] = md5sum
		try:
			collection.insert_one(the_dict)
		except Exception as e:
			print('Failed to update database with %s: %s' % (jpeg.name, e))
			return
		else:
			# write file:
			try:
				with open('%s/%s' % (dest_folder, md5sum), 'wb') as f:
					jpeg.seek(0)
					f.write(jpeg.read())
			except Exception as e:
				try:
					collection.remove(the_dict)
				except Exception as e:
					print('Failed to remove item from database -- db is no longer consistent w/ file system: %s' % e)
		
if __name__ == '__main__':
	''' iterate through images in directory passed and 
		process appropriately '''

	import jpgps
	import sys
	import hashlib

	MONGODB_HOST = 'localhost'
	MONGODB_PORT = 27017
	connection = MongoClient(MONGODB_HOST, MONGODB_PORT)
	DB_NAME = 'photo_mapper'
	collection = connection[DB_NAME]['photo_mapper']
	DEST_FOLDER = './photos'

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
		if item[-3:].lower() == 'jpg' or item[-4:].lower() == 'jpeg':
			with open(os.path.join(location,item), 'rb') as f:
				print('FILE NAME: %s' % item)
				process(f, collection, DEST_FOLDER)
