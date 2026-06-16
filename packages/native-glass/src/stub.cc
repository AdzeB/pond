// Non-macOS stub: every entry point reports "unsupported" so the JS wrapper
// transparently falls back to no-ops. Liquid Glass is a macOS-26+ feature.
#include <node_api.h>

namespace {

napi_value ReturnFalse(napi_env env, napi_callback_info /*info*/) {
  napi_value out;
  napi_get_boolean(env, false, &out);
  return out;
}

napi_value Init(napi_env env, napi_value exports) {
  const char* names[] = {"isSupported", "setWindowGlass", "removeWindowGlass",
                         "setGlassEffectRegions", "clearGlassEffectRegions"};
  for (const char* name : names) {
    napi_value fn;
    napi_create_function(env, name, NAPI_AUTO_LENGTH, ReturnFalse, nullptr,
                         &fn);
    napi_set_named_property(env, exports, name, fn);
  }
  return exports;
}

}  // namespace

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
