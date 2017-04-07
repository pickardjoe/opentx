#!/usr/bin/python
import sys, struct, time

# import pygame
import serial

class TxControl:
    class TxControlState:
	NONE, EXIT = range(2)

    MAX_VALUE =0xFF
    RESET_VALUE = 181
    CHANNEL_COUNT=16

    def DebugOut(self, msg):
        if self.debug:
            print(msg)

    def SendChannel(self, channel, value):
	valueSend = int(value + 1024) % 2049
	send = []
	send.append(TxControl.RESET_VALUE)
	send.append((channel - 1) & TxControl.MAX_VALUE)
	send.append((valueSend >> 8) & TxControl.MAX_VALUE)
	send.append(valueSend & TxControl.MAX_VALUE)

	for data in send:
	    self.conn.write(struct.pack('B', data))
	    self.DebugOut(data)

	self.channelValues[channel] = value
	self.DebugOut("Sent %d to channel %d" % (value, channel))

	# self.conn.write(struct.pack('B', TxControl.RESET_VALUE))
	# self.conn.write(struct.pack('B', channel & TxControl.MAX_VALUE))
	# self.conn.write(struct.pack('B', (value >> 8) & TxControl.MAX_VALUE))
	# self.conn.write(struct.pack('B', value & TxControl.MAX_VALUE))
	# print(TxControl.RESET_VALUE)
	# print(channel & TxControl.MAX_VALUE)
	# print((value >> 8) & TxControl.MAX_VALUE)
	# print(value & TxControl.MAX_VALUE)

    def SetChannel(self, channel, value):
	if channel < len(self.channelValues):
	    if value != self.channelValues[channel]:
		self.SendChannel(channel, value)

    def _PrintUsage(cmd):
	print(("Usage:" + " %s"*len(cmd)) % cmd)

    def ProcessCommand(self, cmd):
        usage = ["COMMAND (e | exit | so | setone | sm | setmultiple)", "[ARGUMENTS]"]
	if 0 == len(cmd):
	    return TxControlState.NONE

	elif cmd[0] in ["exit", "e"]:
            usage = [cmd[0]]
	    return TxControlState.EXIT

	elif cmd[0] in ["so", "setone"]:
            usage = [cmd[0], "CHANNEL#", "VALUE"]
	    if 2 < len(cmd):
                try:
                    self.SetChannel(int(cmd[1]), int(cmd[2]))
                except:
                    pass

	    else:
		TxControl._PrintUsage(usage)

	elif cmd[0] in ["sm", "setmultiple"]:
            usage = [cmd[0], "[VALUE | CHANNEL#:VALUE] ..."]
	    if 1 < len(cmd):
		channel = 0
		channelsWritten = []
		for value in cmd[1:]:
		    if 0 <= value.find(":"):
			va = value.split(":")
			if(2 == len(va)):
			    channel = int(va[0])
			    value = int(va[1])
                    self.SetChannel(va[0], va[2])
		    channelsWritten.append(channel)
                    channel = channel + 1
                
	    else:
		TxControl._PrintUsage(usage)

    def SendLoop(self):
	endLoop = False
	while not endLoop:
	    line = sys.stdin.readline()
	    line = line.split(' ')
            self.ProcessCommand(line)
            
    def __init__(self, device, baud):
	self.channelValues = []
        self.debug = False
	for i in range(TxControl.CHANNEL_COUNT):
	    self.channelValues.append(None)

	self.conn = serial.Serial(device, baud)

    def __del__(self):
        if None != self.conn:
            self.conn.close()
            self.conn = None
            
if __name__ == "__main__":
    ctl = TxControl(sys.argv[1], 115200)
#    ctl.debug = True
    ctl.SendLoop()
    exit(0)
    #while True:
    channel = 0
    position = 0
    if 3 < len(sys.argv):
        channel = int(sys.argv[2])
        position = float(sys.argv[3])
    else:
        position = float(sys.argv[2])

    ctl.SendChannel(channel, position)
    #    time.sleep(0.001)
