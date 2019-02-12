# -*- coding: utf-8 -*-

import sys, os
import TunisArabicClusterBuilder

if __name__ == '__main__':
  if len(sys.argv) <= 1:
    print('no TEI file location found!')
    print('example usage: python %s ./data/dc_aeb_eng.xml' % (__file__))
    exit(1)

  file_location = sys.argv[1]
  file_real_location = os.path.join(os.getcwd(), file_location)
  if not os.path.isfile(file_real_location):
    print('no TEI file location found at %s ' % (file_real_location))
    exit(1)
  
  builder = TunisArabicClusterBuilder.Builder(file_path=file_real_location)
  builder.load_data()
  builder.make_clusters()
  
