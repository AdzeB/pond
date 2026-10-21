cask "pond" do
  arch arm: "arm64", intel: "x64"

  version "1.3.0"
  sha256 arm:   "9a0eedadf3a7cd3ce3b319d34b2cfd330bc4bb7deac62d972e0d788430e5b829",
         intel: "671c2b95adb08a6321ce5c337e45090ad88f0f9cb3e48ca49266c6cec863e8a8"

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
