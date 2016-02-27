#include <time.h>
#include <sys/time.h>
#include <stdio.h>

#include "readhmd.h"

Rift::Rift() {
	rotation = std::vector<float>(4);
	connect();
}

Rift::~Rift() {
	ohmd_ctx_destroy(ctx);
}

void Rift::connect() {
	ctx = ohmd_ctx_create();

	// Probe for devices
	num_devices = ohmd_ctx_probe(ctx);
	if(num_devices < 0)
	{
		printf("failed to probe devices: %s\n", ohmd_ctx_get_error(ctx));
		return;
	}

	// Open default device (0)
	hmd = ohmd_list_open_device(ctx, 0);

	if(!hmd)
	{
		printf("failed to open device: %s\n", ohmd_ctx_get_error(ctx));
		return;
	}
}

void Rift::poll()
{
	float rot[4];
	ohmd_ctx_update(ctx);
	ohmd_device_getf(hmd, OHMD_ROTATION_QUAT, rot);
	for(int i = 0; i < 4; i++)
	{
		rotation[i] = rot[i];
	}
	sleep(.01);
}

void Rift::sleep(double seconds) {
	struct timespec sleepfor;
	sleepfor.tv_sec = (time_t)seconds;
	sleepfor.tv_nsec = (long)((seconds - sleepfor.tv_sec) * 1000000000.0);
	nanosleep(&sleepfor, NULL);
}

void Rift::reset(){
	ohmd_ctx_destroy(ctx);
	sleep(.1);
	connect();
}

int main()
{
	Rift* rift = new Rift();
	while(true)
	{
		rift->poll();
		printf("so %d %d\n", (int)(rift->rotation[2]*1024), (int)(rift->rotation[1]*1024));
		fflush(stdout);
	}
}
