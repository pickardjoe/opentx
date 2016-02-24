/*
 * Authors (alphabetical order)
 * - Andre Bernet <bernet.andre@gmail.com>
 * - Andreas Weitl
 * - Bertrand Songis <bsongis@gmail.com>
 * - Bryan J. Rentoul (Gruvin) <gruvin@gmail.com>
 * - Cameron Weeks <th9xer@gmail.com>
 * - Erez Raviv
 * - Gabriel Birkus
 * - Jean-Pierre Parisy
 * - Karl Szmutny
 * - Michael Blandford
 * - Michal Hlavinka
 * - Pat Mackenzie
 * - Philip Moss
 * - Rob Thomson
 * - Romolo Manfredini <romolo.manfredini@gmail.com>
 * - Thomas Husterer
 *
 * opentx is based on code named
 * gruvin9x by Bryan J. Rentoul: http://code.google.com/p/gruvin9x/,
 * er9x by Erez Raviv: http://code.google.com/p/er9x/,
 * and the original (and ongoing) project by
 * Thomas Husterer, th9x: http://code.google.com/p/th9x/
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 2 as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.	 See the
 * GNU General Public License for more details.
 *
 */

#ifndef serial_input_h
#define serial_input_h

#include "myeeprom.h"

#define NUM_SERIAL 16

// Serial input channels
extern int16_t serialInput[NUM_SERIAL];
extern int8_t serialBytesAvailable;
extern int32_t serialData;
extern Fifo<256> serialInputFifo;
// // Timer gets decremented in per10ms()
// #define SERIAL_IN_VALID_TIMEOUT 100 // 1s
// extern uint8_t serialInputValidityTimer;

// #define IS_SERIAL_INPUT_VALID() (serialInputValidityTimer != 0)

// #if defined(CPUARM)
// void checkSerialSignalWarning();
// #else
// #define checkSerialSignalWarning()
// #endif

void processSerialInput()
{
	uint8_t c;

	while (!serialInputFifo.pop(c))
	{
		CoTickDelay(10); // 20ms
	}
}
// // Needs to be inlined to avoid slow function calls in ISR routines
// inline void captureSerialSignal(uint16_t capture)
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
