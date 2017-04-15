#include "usb_input.h"

int16_t usbInput[NUM_USB];
Fifo<1024> usbInputFifo;
int8_t usbBytesAvailable = 0;

int32_t usbData = 0;
