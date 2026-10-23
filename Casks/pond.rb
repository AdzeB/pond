cask "pond" do
  arch arm: "arm64", intel: "x64"

  version "1.6.1"
  sha256 arm:   "a3a592e7aa3101d98d35b01e9b0b823defcbf28d0e129623c90159d6031b7671",
         intel: "053ea75fbee487302134b570cbbcf2c1ffd7c9bb2399379c3275ef2411cd1592"

  url "https://github.com/raphaelsalaja/pond/releases/download/v#{version}/Pond-#{version}-#{arch}.dmg"
  name "Pond"
  desc "Local-first archive for things you save from the web"
  homepage "https://github.com/raphaelsalaja/pond"

  livecheck do
    url :url
    strategy :github_latest
  end

  depends_on macos: :ventura

  app "Pond.app"

  zap trash: [
    "~/Library/Application Support/pond",
    "~/Library/Logs/pond",
    "~/Library/Preferences/so.pond.desktop.plist",
  ]
end
