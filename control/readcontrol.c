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

#define NAME_LENGTH 128

void PrintEvent(struct js_event js)
{
	int value = 0;
	switch(js.type)
	{
	case 1: // Button
		value = js.value*2048 - 1024;
		break;
	case 2: // Axis
		value = js.value/32;
		break;
	default:
#ifdef DEBUG
		fprintf(stderr, "Event: type %d, time %d, number %d, value %d\n", js.type, js.time, js.number, js.value);
#endif
		return;
	}
	printf("%d %d\n", js.number, value);
}

int main (int argc, char **argv)
{
	if(argc < 2)
	{
		printf("Usage: %s DEVICE\n", argv[0]);
		return 1;
	}
	
	int fd;
	unsigned char axes = 2;
	unsigned char buttons = 2;
	int version = 0x000800;
	char name[NAME_LENGTH] = "Unknown";
	uint16_t btnmap[KEY_MAX - BTN_MISC + 1];
	uint8_t axmap[ABS_MAX + 1];


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
