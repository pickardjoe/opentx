all: readcontrol readhmd

clean:
	rm -f readcontrol readhmd

readcontrol: readcontrol.c
	gcc readcontrol.c -Wall -Wextra -O2 -o readcontrol

readhmd: readhmd.cpp
	g++ readhmd.cpp -Wall -Wextra -O2 -o readhmd -I/usr/local/include/openhmd -I/usr/include/hidapi -L/usr/local/lib -lopenhmd -lhidapi-libusb  -lm

