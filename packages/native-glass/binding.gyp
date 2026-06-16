{
  "targets": [
    {
      "target_name": "pond_glass",
      "conditions": [
        [
          "OS=='mac'",
          {
            "sources": ["src/glass.mm"],
            "libraries": [
              "-framework Cocoa",
              "-framework QuartzCore"
            ],
            "xcode_settings": {
              "CLANG_ENABLE_OBJC_ARC": "YES",
              "MACOSX_DEPLOYMENT_TARGET": "11.0",
              "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
              "OTHER_CFLAGS": ["-Wall", "-Wextra"]
            }
          },
          {
            "sources": ["src/stub.cc"]
          }
        ]
      ]
    }
  ]
}
