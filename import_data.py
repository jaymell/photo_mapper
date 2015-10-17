#!/usr/bin/python

import os
import shutil
import uuid
import zipfile
import datetime
import dateutil.tz
import json
from pymongo import MongoClient
import re

import sys
MONGODB_HOST = 'localhost'
MONGODB_PORT = 27017
connection = MongoClient(MONGODB_HOST, MONGODB_PORT)
DB_NAME = 'photo_mapper'


#### let's not make this global, eh?
collection = connection[DB_NAME]['trails']

	
"""
def is_duplicate(kml, collection):
	""" check whether a record with EXACT same
		date already exists in given mongo collection
	"""
	
	results = [ i for i in collection.find({'date': kml['date']}) ]
	if results:
		print('\nDuplicate found! %s\n' % item)
		return True
	else:
		return False

def process(kml_file, kmz=False):
	""" expects to be passed either a kmz or kml file """
	try:
		if kmz:
			zipped = zipfile.ZipFile(kml_file)
			kml = Kml(zipped.open('doc.kml'))
		else: 
			kml = Kml(open(kml_file))
	except Exception as e:
		print('Failed for %s: %s' % (kml_file, e))
	else:
		print('FILE NAME: %s' % kml_file)
		if not is_duplicate(kml.as_dict(), collection): 
			# try to update database AND
			# extract files to right place; if one
			# fails, undo the other:	
			try:
				collection.insert_one(kml.as_dict())
			except Exception as e:
				print('Failed to update database with %s: %s' % (kml, e))
			else:
				try:
					dest = 'static/kml/%s' % kml.uid
					if kmz:
						zipped.extractall(dest)
					else:
						if not os.path.exists(os.path.dirname(dest)): os.makedirs(os.path.dirname(dest))
						shutil.copy(kml_file, '%s/doc.kml' % dest)
				except Exception as e:
					print('Failed to extract files: %s\n\tTrying to remove record from database...' % e)
					try:
						collection.remove(kml.as_json())
					except Exception as e:
						print('Failed to remove item from database -- db is no longer consistent w/ file system: %s' % e)
	finally:
		if kmz:
			zipped.close()
		else:
			kml.close()
		
"""
if __name__ == '__main__':
	""" iterate through images in directory passed and 
		process appropriately """

	if len(sys.argv) != 2:
		print('Usage: %s <directory name>' % sys.argv[0]
		sys.exit(1)
	location = sys.argv[1]
	try:
		dir_items = os.listdir(location)	
	except Exception as e:
		print('Failed to open directory: %s' % e)	
		sys.exit(2)
	for item in dir_items:
		if item[-3:].lower() == 'jpg' or item[-4:].lower() == 'jpeg':
			process(os.path.join(location,item))


