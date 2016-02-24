import sys, struct, time
import serial

class TxControl:
    MAX_VALUE =0b1111111
    RESET_VALUE = 0b11111111
    def SendChannel(self, channel, value):
        value = value + 1024
        value = int(value) % 2048
	self.conn.write(struct.pack('B', TxControl.RESET_VALUE))
	self.conn.write(struct.pack('B', channel & TxControl.MAX_VALUE))
	self.conn.write(struct.pack('B', (value >> 7) & TxControl.MAX_VALUE))
	self.conn.write(struct.pack('B', value & TxControl.MAX_VALUE))
        print("Sent %d to channel %d" % (value, channel))
      	print(TxControl.RESET_VALUE)
	print(channel & TxControl.MAX_VALUE)
	print((value >> 7) & TxControl.MAX_VALUE)
	print(value & TxControl.MAX_VALUE)


    def __init__(self, device, baud):
	self.conn = serial.Serial(device, baud)


# conn = serial.Serial(sys.argv[1], sys.argv[2])
# while True:
#     conn.write(struct.pack('B', 0b11111111))
#     conn.write(struct.pack('B', 1))
#     conn.write(struct.pack('B', 64))
#     conn.write(struct.pack('B', 64))
#     time.sleep(0.5)
ctl = TxControl(sys.argv[1], sys.argv[2])
while True:
    ctl.SendChannel(0, float(sys.argv[3]))
    time.sleep(0.001)
