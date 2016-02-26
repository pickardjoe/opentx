/*
 * jstest.c	 Version 1.2
 *
 * Copyright (c) 1996-1999 Vojtech Pavlik
 *
 * Sponsored by SuSE
 */

/*
 * This program can be used to test all the features of the Linux
 * joystick API, including non-blocking and select() access, as
 * well as version 0.x compatibility mode. It is also intended to
 * serve as an example implementation for those who wish to learn
 * how to write their own joystick using applications.
 */

/*
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.	 See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
 *
 * Should you need to contact me, the author, you can do so either by
 * e-mail - mail your message to <vojtech@ucw.cz>, or by paper mail:
 * Vojtech Pavlik, Simunkova 1594, Prague 8, 182 00 Czech Republic
 */

#include <sys/ioctl.h>
#include <sys/time.h>
#include <sys/types.h>
#include <stdlib.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <errno.h>
#include <string.h>
#include <stdlib.h>
#include <stdint.h>

#include <linux/input.h>
#include <linux/joystick.h>
#define NUM_CHANNELS 16

char *axis_names[ABS_MAX + 1] = {
	"X", "Y", "Z", "Rx", "Ry", "Rz", "Throttle", "Rudder",
	"Wheel", "Gas", "Brake", "?", "?", "?", "?", "?",
	"Hat0X", "Hat0Y", "Hat1X", "Hat1Y", "Hat2X", "Hat2Y", "Hat3X", "Hat3Y",
	"?", "?", "?", "?", "?", "?", "?",
};


int channel_map[NUM_CHANNELS] = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16};

char *button_names[KEY_MAX - BTN_MISC + 1] = {
	"Btn0", "Btn1", "Btn2", "Btn3", "Btn4", "Btn5", "Btn6", "Btn7", "Btn8", "Btn9", "?", "?", "?", "?", "?", "?",
	"LeftBtn", "RightBtn", "MiddleBtn", "SideBtn", "ExtraBtn", "ForwardBtn", "BackBtn", "TaskBtn", "?", "?", "?", "?", "?", "?", "?", "?",
	"Trigger", "ThumbBtn", "ThumbBtn2", "TopBtn", "TopBtn2", "PinkieBtn", "BaseBtn", "BaseBtn2", "BaseBtn3", "BaseBtn4", "BaseBtn5", "BaseBtn6", "BtnDead",
	"BtnA", "BtnB", "BtnC", "BtnX", "BtnY", "BtnZ", "BtnTL", "BtnTR", "BtnTL2", "BtnTR2", "BtnSelect", "BtnStart", "BtnMode", "BtnThumbL", "BtnThumbR", "?",
	"?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?",
	"WheelBtn", "Gear up",
};

#define NAME_LENGTH 128

void PrintEvent(struct js_event js)
{
	if(js.number < NUM_CHANNELS)
	{
		if(2 == js.type) // Axis
		{
			printf("so %d %d\n", channel_map[js.number], js.value/32);
		}
		else if(1 == js.type) // Button
		{
			printf("so %d %d\n", channel_map[js.number], js.value*2048 - 1024);
		}
	}
//	printf("Event: type %d, time %d, number %d, value %d\n", js.type, js.time, js.number, js.value);
}

int main (int argc, char **argv)
{
	int fd;
	unsigned char axes = 2;
	unsigned char buttons = 2;
	int version = 0x000800;
	char name[NAME_LENGTH] = "Unknown";
	uint16_t btnmap[KEY_MAX - BTN_MISC + 1];
	uint8_t axmap[ABS_MAX + 1];

	if(argc < 2)
	{
		printf("argc %d", argc);
	}

	if ((fd = open(argv[argc - 1], O_RDONLY)) < 0) {
		perror("jstest");
		return 1;
	}

	ioctl(fd, JSIOCGVERSION, &version);
	ioctl(fd, JSIOCGAXES, &axes);
	ioctl(fd, JSIOCGBUTTONS, &buttons);
	ioctl(fd, JSIOCGNAME(NAME_LENGTH), name);
	ioctl(fd, JSIOCGAXMAP, axmap);
	ioctl(fd, JSIOCGBTNMAP, btnmap);

/*
 * Reading in nonblocking mode.
 */

	if (!strcmp("-n", argv[1])) {

		struct js_event js;

		fcntl(fd, F_SETFL, O_NONBLOCK);

		while (1) {

			while (read(fd, &js, sizeof(struct js_event)) == sizeof(struct js_event))
			{
				PrintEvent(js);
			}

			if (errno != EAGAIN) {
				perror("\njstest: error reading");
				return 1;
			}

			usleep(10000);
		}
	}
	else
	{
		struct js_event js;

		while (1) {
			if (read(fd, &js, sizeof(struct js_event)) != sizeof(struct js_event)) {
				perror("\njstest: error reading");
				return 1;
			}

			PrintEvent(js);

			fflush(stdout);
		}
	}
}
