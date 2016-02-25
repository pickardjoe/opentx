import sys, struct, time
import serial

class TxControl:
    MAX_VALUE =0xFF
    RESET_VALUE = 181
    def SendChannel(self, channel, value):
        channel = int(channel) - 1
        value = value + 1024
        value = int(value) % 2049
        send = []
        send.append(TxControl.RESET_VALUE)
        send.append(channel & TxControl.MAX_VALUE)
        send.append((value >> 8) & TxControl.MAX_VALUE)
        send.append(value & TxControl.MAX_VALUE)

        for data in send:
            self.conn.write(struct.pack('B', data))
            print(data)

        print("Sent %d to channel %d" % (value, channel))
        
	# self.conn.write(struct.pack('B', TxControl.RESET_VALUE))
	# self.conn.write(struct.pack('B', channel & TxControl.MAX_VALUE))
	# self.conn.write(struct.pack('B', (value >> 8) & TxControl.MAX_VALUE))
	# self.conn.write(struct.pack('B', value & TxControl.MAX_VALUE))
      	# print(TxControl.RESET_VALUE)
	# print(channel & TxControl.MAX_VALUE)
	# print((value >> 8) & TxControl.MAX_VALUE)
	# print(value & TxControl.MAX_VALUE)


    def __init__(self, device, baud):
	self.conn = serial.Serial(device, baud)


# conn = serial.Serial(sys.argv[1], sys.argv[2])
# while True:
#     conn.write(struct.pack('B', 0b11111111))
#     conn.write(struct.pack('B', 1))
#     conn.write(struct.pack('B', 64))
#     conn.write(struct.pack('B', 64))
#     time.sleep(0.5)
ctl = TxControl(sys.argv[1], 115200)
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
