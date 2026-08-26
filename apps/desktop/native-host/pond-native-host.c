#include <errno.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>

/** Same framing as Chrome native messaging: 32-bit little-endian length, then UTF-8 JSON. */
#define MAX_MSG (8u * 1024u * 1024u)

static const char *offline_json = "{\"ok\":false,\"error\":\"offline\"}";

static int read_full(int fd, void *buf, size_t n) {
  unsigned char *p = buf;
  size_t got = 0;
  while (got < n) {
    ssize_t r = read(fd, p + got, n - got);
    if (r == 0) return -1;
    if (r < 0) {
      if (errno == EINTR) continue;
      return -1;
    }
    got += (size_t)r;
  }
  return 0;
}

static int write_full(int fd, const void *buf, size_t n) {
  const unsigned char *p = buf;
  size_t put = 0;
  while (put < n) {
    ssize_t w = write(fd, p + put, n - put);
    if (w < 0) {
      if (errno == EINTR) continue;
      return -1;
    }
    put += (size_t)w;
  }
  return 0;
}

static void reply_offline(void) {
  uint32_t len = (uint32_t)strlen(offline_json);
  (void)fwrite(&len, 4, 1, stdout);
  (void)fwrite(offline_json, 1, len, stdout);
  (void)fflush(stdout);
}

int main(void) {
  const char *home = getenv("HOME");
  if (!home || !home[0]) {
    fprintf(stderr, "pond-native-host: HOME is unset\n");
    reply_offline();
    return 0;
  }

  char sock_path[512];
  int n = snprintf(
      sock_path,
      sizeof sock_path,
      "%s/Library/Application Support/Pond/native.sock",
      home);
  if (n < 0 || (size_t)n >= sizeof sock_path) {
    reply_offline();
    return 0;
  }

  uint32_t req_len = 0;
  if (fread(&req_len, 4, 1, stdin) != 1) {
    return 0;
  }
  if (req_len == 0 || req_len > MAX_MSG) {
    fprintf(stderr, "pond-native-host: request too large (%u)\n", req_len);
    reply_offline();
    return 0;
  }

  unsigned char *req = malloc(req_len);
  if (!req) {
    reply_offline();
    return 0;
  }
  if (fread(req, 1, req_len, stdin) != req_len) {
    free(req);
    reply_offline();
    return 0;
  }

  int fd = socket(AF_UNIX, SOCK_STREAM, 0);
  if (fd < 0) {
    free(req);
    reply_offline();
    return 0;
  }

  struct sockaddr_un addr;
  memset(&addr, 0, sizeof addr);
  addr.sun_family = AF_UNIX;
  strncpy(addr.sun_path, sock_path, sizeof addr.sun_path - 1);

  if (connect(fd, (struct sockaddr *)&addr, sizeof addr) != 0) {
    close(fd);
    free(req);
    reply_offline();
    return 0;
  }

  if (write_full(fd, &req_len, 4) != 0 || write_full(fd, req, req_len) != 0) {
    close(fd);
    free(req);
    reply_offline();
    return 0;
  }
  free(req);

  uint32_t res_len = 0;
  if (read_full(fd, &res_len, 4) != 0 || res_len == 0 || res_len > MAX_MSG) {
    close(fd);
    reply_offline();
    return 0;
  }

  unsigned char *res = malloc(res_len);
  if (!res) {
    close(fd);
    reply_offline();
    return 0;
  }
  if (read_full(fd, res, res_len) != 0) {
    free(res);
    close(fd);
    reply_offline();
    return 0;
  }
  close(fd);

  (void)fwrite(&res_len, 4, 1, stdout);
  (void)fwrite(res, 1, res_len, stdout);
  (void)fflush(stdout);
  free(res);
  return 0;
}
