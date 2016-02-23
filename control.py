import sys, struct, time
import serial

class TxControl:
    MAX_VALUE =0b1111111
    RESET_VALUE = 0b11111111
    def SendChannel(self, channel, value):
	self.conn.write(struct.pack('B', TxControl.RESET_VALUE))
	self.conn.write(struct.pack('B', channel % TxControl.MAX_VALUE))

	self.conn.write(struct.pack('B', (value >> 7) & TxControl.MAX_VALUE))
	self.conn.write(struct.pack('B', value & TxControl.MAX_VALUE))
        print("Sent %d to channel %d" % (value, channel))


    def __init__(self, device, baud):
	self.conn = serial.Serial(device, baud)


conn = serial.Serial(sys.argv[1], sys.argv[2])
conn.write(struct.pack('B', 0b11111111))
conn.write(struct.pack('B', 1))
conn.write(struct.pack('B', 64))
conn.write(struct.pack('B', 64))
# ctl = TxControl(sys.argv[1], sys.argv[2])
# while True:
#     ctl.SendChannel(int(sys.argv[3]), int(sys.argv[4]))
#     time.sleep(0.5)
