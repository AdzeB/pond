// Native macOS Liquid Glass for Electron.
//
// A vendored, self-contained reimplementation of Electron PR #50415
// (`win.setGlassEffect` / `win.setGlassEffectRegions`) so call sites can migrate
// to the official API once it ships — see packages/native-glass/index.d.ts.
//
// Two complementary surfaces, both built on macOS 26 "Tahoe" / 27 "Golden Gate"
// `NSGlassEffectView`:
//
//   • Window glass  — one glass view inserted *below* the web-contents view, so
//     the OS compositor refracts the desktop behind the window while the web UI
//     stays crisp and fully interactive on top.
//
//   • Region glass  — an `NSGlassEffectContainerView` placed *above* the web
//     contents, holding one glass view per caller-supplied rect. Both the
//     container and its glass views override `-hitTest:` to return nil, so mouse
//     events fall through to the web UI underneath; the glass is a purely
//     decorative, click-through overlay that refracts whatever is behind it.
//     Rects arrive in CSS/top-left coordinates and are flipped into Cocoa's
//     bottom-left space, then re-flipped on every window resize.
//
// Everything is resolved through `NSClassFromString` + KVC, so the addon
// compiles against any SDK and degrades to a no-op when the classes are absent
// (older macOS): every entry point reports failure and the JS wrapper falls
// back to inert stubs.
#import <Cocoa/Cocoa.h>

#include <node_api.h>
#include <objc/runtime.h>

#include <string>

namespace {

// ---------------------------------------------------------------------------
// N-API value helpers
// ---------------------------------------------------------------------------

// Electron hands us the content NSView* packed into a Node Buffer
// (`BrowserWindow.getNativeWindowHandle()` on macOS). Unpack the pointer.
NSView* ViewFromHandle(napi_env env, napi_value value) {
  bool is_buffer = false;
  if (napi_is_buffer(env, value, &is_buffer) != napi_ok || !is_buffer)
    return nil;
  void* data = nullptr;
  size_t length = 0;
  if (napi_get_buffer_info(env, value, &data, &length) != napi_ok)
    return nil;
  if (data == nullptr || length < sizeof(void*))
    return nil;
  void* ptr = *reinterpret_cast<void**>(data);
  if (ptr == nullptr)
    return nil;
  return (__bridge NSView*)ptr;
}

NSString* OptionalString(napi_env env, napi_value object, const char* key) {
  napi_value value;
  if (napi_get_named_property(env, object, key, &value) != napi_ok)
    return nil;
  napi_valuetype type;
  if (napi_typeof(env, value, &type) != napi_ok || type != napi_string)
    return nil;
  size_t length = 0;
  if (napi_get_value_string_utf8(env, value, nullptr, 0, &length) != napi_ok)
    return nil;
  std::string buffer(length + 1, '\0');
  if (napi_get_value_string_utf8(env, value, buffer.data(), buffer.size(),
                                 &length) != napi_ok)
    return nil;
  return [NSString stringWithUTF8String:buffer.c_str()];
}

bool OptionalDouble(napi_env env, napi_value object, const char* key,
                    double* out) {
  napi_value value;
  if (napi_get_named_property(env, object, key, &value) != napi_ok)
    return false;
  napi_valuetype type;
  if (napi_typeof(env, value, &type) != napi_ok || type != napi_number)
    return false;
  return napi_get_value_double(env, value, out) == napi_ok;
}

// Decode a region's `contentImage` (Node Buffer of encoded image bytes, or a
// base64 / data-URL string) into an NSImage. Returns nil when absent/invalid.
NSImage* OptionalImage(napi_env env, napi_value object, const char* key) {
  napi_value value;
  if (napi_get_named_property(env, object, key, &value) != napi_ok)
    return nil;

  NSData* data = nil;
  bool is_buffer = false;
  napi_is_buffer(env, value, &is_buffer);
  if (is_buffer) {
    void* bytes = nullptr;
    size_t length = 0;
    if (napi_get_buffer_info(env, value, &bytes, &length) == napi_ok &&
        bytes != nullptr && length > 0) {
      data = [NSData dataWithBytes:bytes length:length];
    }
  } else {
    napi_valuetype type;
    if (napi_typeof(env, value, &type) == napi_ok && type == napi_string) {
      NSString* str = OptionalString(env, object, key);
      // Tolerate `data:image/png;base64,<...>` prefixes.
      NSRange comma = [str rangeOfString:@","];
      NSString* b64 = comma.location != NSNotFound
                          ? [str substringFromIndex:comma.location + 1]
                          : str;
      data = [[NSData alloc]
          initWithBase64EncodedString:b64
                              options:NSDataBase64DecodingIgnoreUnknownCharacters];
    }
  }
  if (data == nil)
    return nil;
  return [[NSImage alloc] initWithData:data];
}

// Parse "#RGB", "#RRGGBB" or "#AARRGGBB" into an sRGB NSColor. The 8-digit form
// follows Electron's `#AARRGGBB` convention (alpha first), matching
// `win.setBackgroundColor` so tint strings are interchangeable.
NSColor* ColorFromHex(NSString* hex) {
  if (hex == nil)
    return nil;
  NSString* clean =
      [[hex stringByTrimmingCharactersInSet:[NSCharacterSet
                                                whitespaceCharacterSet]]
          stringByReplacingOccurrencesOfString:@"#"
                                    withString:@""];
  NSUInteger len = clean.length;
  if (len == 3) {
    unichar r = [clean characterAtIndex:0];
    unichar g = [clean characterAtIndex:1];
    unichar b = [clean characterAtIndex:2];
    clean = [NSString stringWithFormat:@"%C%C%C%C%C%C", r, r, g, g, b, b];
    len = 6;
  }
  if (len != 6 && len != 8)
    return nil;
  unsigned int value = 0;
  if (![[NSScanner scannerWithString:clean] scanHexInt:&value])
    return nil;
  CGFloat r, g, b, a;
  if (len == 8) {
    // #AARRGGBB
    a = ((value >> 24) & 0xFF) / 255.0;
    r = ((value >> 16) & 0xFF) / 255.0;
    g = ((value >> 8) & 0xFF) / 255.0;
    b = (value & 0xFF) / 255.0;
  } else {
    r = ((value >> 16) & 0xFF) / 255.0;
    g = ((value >> 8) & 0xFF) / 255.0;
    b = (value & 0xFF) / 255.0;
    a = 1.0;
  }
  return [NSColor colorWithSRGBRed:r green:g blue:b alpha:a];
}

napi_value MakeBool(napi_env env, bool value) {
  napi_value out;
  napi_get_boolean(env, value, &out);
  return out;
}

void RunOnMain(void (^block)(void)) {
  if ([NSThread isMainThread])
    block();
  else
    dispatch_sync(dispatch_get_main_queue(), block);
}

// ---------------------------------------------------------------------------
// Glass class resolution (macOS 26+ only)
// ---------------------------------------------------------------------------

Class GlassClass() { return NSClassFromString(@"NSGlassEffectView"); }
Class ContainerClass() {
  return NSClassFromString(@"NSGlassEffectContainerView");
}

// NSGlassEffectViewStyle: 0 == regular, 1 == clear (best-effort via KVC).
NSInteger StyleValue(NSString* style) {
  return [style isEqualToString:@"clear"] ? 1 : 0;
}

void ApplyGlassOptions(NSView* glass, bool hasCorner, double cornerRadius,
                       NSColor* tint, NSString* style) {
  if (hasCorner && cornerRadius >= 0 &&
      [glass respondsToSelector:@selector(setCornerRadius:)]) {
    [glass setValue:@(cornerRadius) forKey:@"cornerRadius"];
  }
  if (tint != nil && [glass respondsToSelector:@selector(setTintColor:)]) {
    [glass setValue:tint forKey:@"tintColor"];
  }
  if (style != nil && [glass respondsToSelector:@selector(setStyle:)]) {
    [glass setValue:@(StyleValue(style)) forKey:@"style"];
  }
}

// ---------------------------------------------------------------------------
// Click-through subclassing
// ---------------------------------------------------------------------------
//
// Region glass sits above the web contents, so without intervention it would
// swallow every mouse event. We can't subclass NSGlassEffect* at compile time
// (the classes may be absent), so we synthesize a `-hitTest:`-returns-nil
// subclass at runtime and instantiate that instead. Created once per base
// class; all calls happen on the main thread so no extra locking is needed.
Class PassthroughSubclassOf(Class base) {
  if (base == nil)
    return nil;
  NSString* name =
      [NSString stringWithFormat:@"Pond_%@_Passthrough", NSStringFromClass(base)];
  Class existing = NSClassFromString(name);
  if (existing != nil)
    return existing;
  Class sub = objc_allocateClassPair(base, name.UTF8String, 0);
  if (sub == nil)
    return NSClassFromString(name) ?: base;
  Method hit = class_getInstanceMethod(base, @selector(hitTest:));
  const char* enc = hit ? method_getTypeEncoding(hit) : "@@:{CGPoint=dd}";
  IMP imp = imp_implementationWithBlock(^id(__unused id self_, __unused NSPoint p) {
    return nil;
  });
  class_addMethod(sub, @selector(hitTest:), imp, enc);
  objc_registerClassPair(sub);
  return sub;
}

// ---------------------------------------------------------------------------
// View bookkeeping
// ---------------------------------------------------------------------------

// `NSView.tag` is read-only, but `identifier`
// (NSUserInterfaceItemIdentification) is settable on any NSView — we use it to
// find/replace/remove our own views without disturbing Electron's subviews.
static NSString* const kGlassIdentifier = @"so.pond.window-glass";
static NSString* const kContainerIdentifier = @"so.pond.glass-container";

// Per-glass-view associated storage of the caller's logical (top-left, CSS-px)
// rect, so we can re-flip into Cocoa space whenever the window resizes.
static const void* kLogicalRectKey = &kLogicalRectKey;

NSView* SubviewWithIdentifier(NSView* parent, NSString* identifier) {
  for (NSView* sub in parent.subviews) {
    if ([sub.identifier isEqualToString:identifier])
      return sub;
  }
  return nil;
}

// Apple's AppKit guidance: glass views must live inside the container's
// `contentView` (not as direct subviews) for the container to merge and back
// them correctly. Returns that holder, falling back to the container itself if
// the property is unavailable.
NSView* ContainerHolder(NSView* container) {
  if (container != nil && [container respondsToSelector:@selector(contentView)]) {
    id holder = [container valueForKey:@"contentView"];
    if ([holder isKindOfClass:[NSView class]])
      return holder;
  }
  return container;
}

// Re-flip every region glass view in `content`'s container to match the current
// container height. Cocoa is bottom-left origin; logical rects are top-left.
void RelayoutRegions(NSView* content) {
  if (content == nil)
    return;
  NSView* container = SubviewWithIdentifier(content, kContainerIdentifier);
  if (container == nil)
    return;
  NSView* holder = ContainerHolder(container);
  CGFloat height = holder.bounds.size.height;
  for (NSView* glass in holder.subviews) {
    NSValue* boxed = objc_getAssociatedObject(glass, kLogicalRectKey);
    if (boxed == nil)
      continue;
    NSRect logical = boxed.rectValue;
    glass.frame = NSMakeRect(logical.origin.x,
                             height - logical.origin.y - logical.size.height,
                             logical.size.width, logical.size.height);
  }
}

// ---------------------------------------------------------------------------
// Resize observer (keeps region rects pinned across live resizes)
// ---------------------------------------------------------------------------

}  // namespace

@interface PondGlassResizeObserver : NSObject
+ (instancetype)shared;
- (void)windowDidResize:(NSNotification*)note;
@end

@implementation PondGlassResizeObserver
+ (instancetype)shared {
  static PondGlassResizeObserver* shared = nil;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    shared = [PondGlassResizeObserver new];
  });
  return shared;
}
- (void)windowDidResize:(NSNotification*)note {
  NSWindow* window = note.object;
  if (![window isKindOfClass:[NSWindow class]])
    return;
  RelayoutRegions(window.contentView);
}
@end

namespace {

void EnsureResizeObserver() {
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    [[NSNotificationCenter defaultCenter]
        addObserver:[PondGlassResizeObserver shared]
           selector:@selector(windowDidResize:)
               name:NSWindowDidResizeNotification
             object:nil];
  });
}

// ---------------------------------------------------------------------------
// isSupported
// ---------------------------------------------------------------------------

napi_value IsSupported(napi_env env, napi_callback_info /*info*/) {
  return MakeBool(env, GlassClass() != nil);
}

// ---------------------------------------------------------------------------
// Window glass (below web contents)
// ---------------------------------------------------------------------------

napi_value SetWindowGlass(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value args[2] = {nullptr, nullptr};
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  if (argc < 1)
    return MakeBool(env, false);

  NSView* handleView = ViewFromHandle(env, args[0]);
  if (handleView == nil)
    return MakeBool(env, false);

  double cornerRadius = -1.0;
  bool hasCorner = false;
  NSColor* tint = nil;
  NSString* style = nil;
  if (argc >= 2) {
    napi_valuetype type;
    if (napi_typeof(env, args[1], &type) == napi_ok && type == napi_object) {
      hasCorner = OptionalDouble(env, args[1], "cornerRadius", &cornerRadius);
      tint = ColorFromHex(OptionalString(env, args[1], "tintColor"));
      style = OptionalString(env, args[1], "style");
    }
  }

  __block bool ok = false;
  RunOnMain(^{
    Class glassClass = GlassClass();
    if (glassClass == nil)
      return;
    NSWindow* window = handleView.window;
    if (window == nil)
      return;
    NSView* content = window.contentView;
    if (content == nil)
      return;

    NSView* glass = SubviewWithIdentifier(content, kGlassIdentifier);
    if (glass == nil) {
      glass = [[glassClass alloc] initWithFrame:content.bounds];
      glass.identifier = kGlassIdentifier;
      glass.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
      [content addSubview:glass positioned:NSWindowBelow relativeTo:nil];
    }

    ApplyGlassOptions(glass, hasCorner, cornerRadius, tint, style);

    // Let the glass (and the transparent web layer above it) show through.
    window.opaque = NO;
    window.backgroundColor = [NSColor clearColor];
    ok = true;
  });

  return MakeBool(env, ok);
}

napi_value RemoveWindowGlass(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1] = {nullptr};
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  if (argc < 1)
    return MakeBool(env, false);
  NSView* handleView = ViewFromHandle(env, args[0]);
  if (handleView == nil)
    return MakeBool(env, false);

  __block bool ok = false;
  RunOnMain(^{
    NSWindow* window = handleView.window;
    if (window == nil)
      return;
    NSView* content = window.contentView;
    if (content == nil)
      return;
    NSView* glass = SubviewWithIdentifier(content, kGlassIdentifier);
    if (glass != nil) {
      [glass removeFromSuperview];
      ok = true;
    }
  });

  return MakeBool(env, ok);
}

// ---------------------------------------------------------------------------
// Region glass (above web contents, click-through)
// ---------------------------------------------------------------------------

void ClearContainer(NSView* content) {
  NSView* container = SubviewWithIdentifier(content, kContainerIdentifier);
  if (container != nil)
    [container removeFromSuperview];
}

napi_value SetGlassEffectRegions(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value args[2] = {nullptr, nullptr};
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  if (argc < 2)
    return MakeBool(env, false);

  NSView* handleView = ViewFromHandle(env, args[0]);
  if (handleView == nil)
    return MakeBool(env, false);

  bool is_array = false;
  if (napi_is_array(env, args[1], &is_array) != napi_ok || !is_array)
    return MakeBool(env, false);
  uint32_t count = 0;
  napi_get_array_length(env, args[1], &count);

  // Flatten the JS region descriptors into ObjC objects up front; the rest runs
  // on the main thread where touching N-API handles would be unsafe.
  NSMutableArray<NSDictionary*>* regions = [NSMutableArray array];
  for (uint32_t i = 0; i < count; i++) {
    napi_value region;
    if (napi_get_element(env, args[1], i, &region) != napi_ok)
      continue;
    napi_valuetype type;
    if (napi_typeof(env, region, &type) != napi_ok || type != napi_object)
      continue;

    double x = 0, y = 0, w = 0, h = 0, corner = -1;
    OptionalDouble(env, region, "x", &x);
    OptionalDouble(env, region, "y", &y);
    OptionalDouble(env, region, "width", &w);
    OptionalDouble(env, region, "height", &h);
    bool hasCorner = OptionalDouble(env, region, "cornerRadius", &corner);
    NSColor* tint = ColorFromHex(OptionalString(env, region, "tintColor"));
    NSString* style = OptionalString(env, region, "style");
    NSImage* image = OptionalImage(env, region, "contentImage");
    if (w <= 0 || h <= 0)
      continue;

    NSMutableDictionary* entry = [NSMutableDictionary dictionary];
    entry[@"rect"] = [NSValue valueWithRect:NSMakeRect(x, y, w, h)];
    entry[@"hasCorner"] = @(hasCorner);
    entry[@"cornerRadius"] = @(corner);
    if (tint) entry[@"tint"] = tint;
    if (style) entry[@"style"] = style;
    if (image) entry[@"image"] = image;
    [regions addObject:entry];
  }

  __block bool ok = false;
  RunOnMain(^{
    Class glassClass = GlassClass();
    Class containerClass = ContainerClass();
    if (glassClass == nil || containerClass == nil)
      return;
    NSWindow* window = handleView.window;
    if (window == nil)
      return;
    NSView* content = window.contentView;
    if (content == nil)
      return;

    EnsureResizeObserver();

    // Rebuild from scratch each call: cheap, and keeps add/remove logic simple.
    ClearContainer(content);
    if (regions.count == 0) {
      ok = true;  // An empty region set is a valid "clear".
      return;
    }

    Class passContainer = PassthroughSubclassOf(containerClass);
    Class passGlass = PassthroughSubclassOf(glassClass);

    NSView* container = [[passContainer alloc] initWithFrame:content.bounds];
    container.identifier = kContainerIdentifier;
    container.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    [content addSubview:container positioned:NSWindowAbove relativeTo:nil];

    // Glass views must be added to the container's contentView so the container
    // can merge/back them (per AppKit's NSGlassEffectContainerView contract).
    NSView* holder = [[NSView alloc] initWithFrame:container.bounds];
    holder.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    if ([container respondsToSelector:@selector(setContentView:)]) {
      [container setValue:holder forKey:@"contentView"];
    } else {
      [container addSubview:holder];
    }

    CGFloat height = holder.bounds.size.height;
    for (NSDictionary* entry in regions) {
      NSRect logical = [entry[@"rect"] rectValue];
      NSRect frame = NSMakeRect(
          logical.origin.x, height - logical.origin.y - logical.size.height,
          logical.size.width, logical.size.height);
      NSView* glass = [[passGlass alloc] initWithFrame:frame];
      glass.autoresizingMask = NSViewMinYMargin;  // pinned/relaid on resize
      objc_setAssociatedObject(glass, kLogicalRectKey,
                               [NSValue valueWithRect:logical],
                               OBJC_ASSOCIATION_RETAIN_NONATOMIC);

      ApplyGlassOptions(glass, [entry[@"hasCorner"] boolValue],
                        [entry[@"cornerRadius"] doubleValue], entry[@"tint"],
                        entry[@"style"]);

      NSImage* image = entry[@"image"];
      if (image != nil) {
        NSImageView* imageView =
            [[NSImageView alloc] initWithFrame:glass.bounds];
        imageView.image = image;
        imageView.imageScaling = NSImageScaleProportionallyDown;
        imageView.imageAlignment = NSImageAlignCenter;
        imageView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
        if ([glass respondsToSelector:@selector(setContentView:)]) {
          [glass setValue:imageView forKey:@"contentView"];
        } else {
          [glass addSubview:imageView];
        }
      }

      [holder addSubview:glass];
    }
    ok = true;
  });

  return MakeBool(env, ok);
}

napi_value ClearGlassEffectRegions(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1] = {nullptr};
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  if (argc < 1)
    return MakeBool(env, false);
  NSView* handleView = ViewFromHandle(env, args[0]);
  if (handleView == nil)
    return MakeBool(env, false);

  __block bool ok = false;
  RunOnMain(^{
    NSWindow* window = handleView.window;
    if (window == nil)
      return;
    NSView* content = window.contentView;
    if (content == nil)
      return;
    NSView* container = SubviewWithIdentifier(content, kContainerIdentifier);
    if (container != nil) {
      [container removeFromSuperview];
      ok = true;
    }
  });

  return MakeBool(env, ok);
}

// ---------------------------------------------------------------------------
// Module init
// ---------------------------------------------------------------------------

napi_value Init(napi_env env, napi_value exports) {
  struct {
    const char* name;
    napi_callback fn;
  } entries[] = {
      {"isSupported", IsSupported},
      {"setWindowGlass", SetWindowGlass},
      {"removeWindowGlass", RemoveWindowGlass},
      {"setGlassEffectRegions", SetGlassEffectRegions},
      {"clearGlassEffectRegions", ClearGlassEffectRegions},
  };
  for (auto& entry : entries) {
    napi_value fn;
    napi_create_function(env, entry.name, NAPI_AUTO_LENGTH, entry.fn, nullptr,
                         &fn);
    napi_set_named_property(env, exports, entry.name, fn);
  }
  return exports;
}

}  // namespace

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
