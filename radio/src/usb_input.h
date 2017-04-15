#ifndef usb_input_h
#define usb_input_h

#include "myeeprom.h"
#include "fifo.h"

#define NUM_USB 16

// Usb input channels
extern int16_t usbInput[NUM_USB];
extern int8_t usbBytesAvailable;
extern int32_t usbData;
extern Fifo<1024> usbInputFifo;
// // Timer gets decremented in per10ms()
// #define USB_IN_VALID_TIMEOUT 100 // 1s
// extern uint8_t usbInputValidityTimer;

// #define IS_USB_INPUT_VALID() (usbInputValidityTimer != 0)

// #if defined(CPUARM)
// void checkUsbSignalWarning();
// #else
// #define checkUsbSignalWarning()
// #endif

inline void processUsbInput()
{
	const uint8_t usbInputStartPattern = 181;
	static uint32_t usbDataBuffer = 0;
	static uint8_t usbDataStage = 0;
	uint8_t c;

	while (usbInputFifo.pop(c))
	{
		if(0 == usbDataStage)
		{
			if(c == usbInputStartPattern)
			{
				usbDataStage = 1;
				usbDataBuffer = 0;
			}
			continue;
		}
		usbDataBuffer |= c << (24 - 8*usbDataStage);
		if(2 < usbDataStage)
		{
			usbInput[usbDataBuffer >> 16] = (usbDataBuffer & 0xFFFF) - 1024;
			usbDataStage = 0;
		}
		else
		{
			++usbDataStage;
		}
	}
}
// // Needs to be inlined to avoid slow function calls in ISR routines
// inline void captureUsbSignal(uint16_t capture)
// {
//	 static uint16_t lastCapt=0;
//	 static uint8_t channelNumber=0;

//	 uint16_t val = (uint16_t)(capture - lastCapt) / 2;
//	 lastCapt = capture;

//	 // We process ppmInput right here to make servo movement as smooth as possible
//	 //	   while under trainee control
//	 //
//	 // G: Prioritize reset pulse. (Needed when less than 16 incoming pulses)
//	 //
//	 if (val>4000 && val<19000) {
//	   channelNumber = 1; // triggered
//	 }
//	 else {
//	   if ((channelNumber > 0) && (channelNumber <= NUM_TRAINER)) {
//		 if (val>800 && val<2200) {
//		   ppmInputValidityTimer = PPM_IN_VALID_TIMEOUT;
//		   ppmInput[channelNumber++ - 1] =
//			 //+-500 != 512, but close enough.
//			 (int16_t)(val - 1500)*(g_eeGeneral.PPM_Multiplier+10)/10;
//		 }
//		 else {
//		   channelNumber = 0; // not triggered
//		 }
//	   }
//	 }
// }

#endif
