/* this is the linux 2.2.x way of handling joysticks. It allows an arbitrary
 * number of axis and buttons. It's event driven, and has full signed int
 * ranges of the axis (-32768 to 32767). It also lets you pull the joysticks
 * name. The only place this works of that I know of is in the linux 1.x
 * joystick driver, which is included in the linux 2.2.x kernels
 */

#include <stdio.h>
#include <fcntl.h>
// #include <unistd.h>
#include <sys/ioctl.h>
#include <linux/joystick.h>
#include <stdlib.h>

#include <stdlib.h>
#include <stdio.h>

#ifdef _WIN32
#include <Windows.h>
#else
#include <unistd.h>
#endif

#include "rs232/rs232.h"

/*
 * 'open_port()' - Open serial port 1.
 *
 * Returns the file descriptor on success or -1 on error.
 */
int SerialOpen(char * sPort)
{
	int fd; /* File descriptor for the port */

	fd = open(sPort, O_WRONLY | O_NOCTTY | O_NDELAY);
	if (fd == -1)
	{
		/* Could not open the port. */
		perror("SerialOpen: Unable to open serial port.");
	}
	else
	{
		fcntl(fd, F_SETFL, 0);
	}

	/* n = write(fd, "ATZ\r", 4); */
	/* if (n < 0) */
	/* { */
	/*	fputs("write() of 4 bytes failed!\n", stderr); */
	/* } */

	return (fd);
}

void SendChannel(int iFd, char iChannel, int iValue)
{
	
	int n = 0;
	n += write(iFd, 181, 1);
	n += write(iFd, iChannel, 1);
	n += write(iFd, (unsigned char)((iValue >> 8) & 0xFF), 1);
	printf("%u\n", (unsigned char)((iValue >> 8) & 0xFF));
	n += write(iFd, (unsigned char)(iValue & 0xFF), 1);
	printf("%u\n", (unsigned char)(iValue & 0xFF));

	printf("Sent %d to channel %d, out: %d\n", iValue, iChannel, n);
}

int main(int argc, char** argv)
{
	int joy_fd, *axis=NULL, num_of_axis=0, num_of_buttons=0, x;
	char *button=NULL, name_of_joystick[80];
	struct js_event js;

	char * sJoyDev = "/dev/input/js0";
	char * sRadioDev = "/dev/input/ttyACM0";
	if(1 < argc )
	{
		sJoyDev = argv[1];
	}
	if(2 < argc)
	{
		sRadioDev = argv[2];
	}
	int iFd = SerialOpen(sRadioDev);

	SendChannel(iFd, (char)atoi(argv[3]), atoi(argv[4]));

	return;


	if(( joy_fd = open( sJoyDev, O_RDONLY)) == -1 )
	{
		printf( "Couldn't open joystick\n" );
		return -1;
	}

	ioctl( joy_fd, JSIOCGAXES, &num_of_axis );
	ioctl( joy_fd, JSIOCGBUTTONS, &num_of_buttons );
	ioctl( joy_fd, JSIOCGNAME(80), &name_of_joystick );

	axis = (int *) calloc( num_of_axis, sizeof( int ) );
	button = (char *) calloc( num_of_buttons, sizeof( char ) );

	printf("Joystick detected: %s\n\t%d axis\n\t%d buttons\n\n"
		   , name_of_joystick
		   , num_of_axis
		   , num_of_buttons );

	fcntl( joy_fd, F_SETFL, O_NONBLOCK );	/* use non-blocking mode */

	while( 1 )	/* infinite loop */
	{

		/* read the joystick state */
		read(joy_fd, &js, sizeof(struct js_event));

		/* see what to do with the event */
		switch (js.type & ~JS_EVENT_INIT)
		{
		case JS_EVENT_AXIS:
			axis   [ js.number ] = js.value;
			break;
		case JS_EVENT_BUTTON:
			button [ js.number ] = js.value;
			break;
		}

		/* print the results */
		printf( "X: %6d	 Y: %6d	 ", axis[0], axis[1] );

		if( num_of_axis > 2 )
			printf("Z: %6d	", axis[2] );

		if( num_of_axis > 3 )
			printf("R: %6d	", axis[3] );

		for( x=0 ; x<num_of_buttons ; ++x )
			printf("B%d: %d	 ", x, button[x] );

		printf("  \r");
		fflush(stdout);
	}

	close( joy_fd );	/* too bad we never get here */
	return 0;
}
