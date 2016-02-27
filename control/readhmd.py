#!/usr/bin/python

import time
from rift import PyRift

rift = PyRift()

xchan = 4
ychan = 5

def TransformAxis(axis):
  return int(axis*1024.0)
             
while True:
  rift.poll()
  print("so %d %d" % (xchan, TransformAxis(rift.rotation[2]))) # x
  print("so %d %d" % (ychan, TransformAxis(rift.rotation[1]))) # y
  time.sleep(0.05)
  # print("rotation quat: %f %f %f %f" % (rift.rotation[0], 
  #   rift.rotation[1], 
  #   rift.rotation[2], 
  #   rift.rotation[3]))
