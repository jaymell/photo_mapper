#!/usr/bin/python

from pymongo import MongoClient  
import pandas as pd
from datetime import datetime

def data_insert():
   client = MongoClient('localhost',27017)
   db = client.test_insert                     ## name of the database
   collection = db.test_dataset                ## name of the collection 

   db.test_dataset.insert(
   { 
     "user_id"    : "8",
     "date"       : datetime.now()
   }
   )   


   df = pd.DataFrame(list(db.test_dataset.find()))
   print df


   if __name__ == "__main__":
      main()
