#include <openhmd/openhmd.h>
#include <string>
#include <vector>

class Rift {
  ohmd_context* ctx;
  ohmd_device* hmd;
  int num_devices;
  
 public:
  Rift();
  ~Rift();

  std::vector<float> rotation;
  void poll();
  void reset();

 private:
  void sleep(double seconds);
  void connect();
};
