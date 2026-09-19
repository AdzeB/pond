cask "pond" do
  arch arm: "arm64", intel: "x64"

  version "0.1.0"
  sha256 arm:   "2d08152ff5950d28c4c353f0e451598d71f852c89ada6f350f769b29e44e7436",
         intel: "a7656ac8b8ea7d0f2e2e860b29c5023e6030b453420321304295b6e9d2dcd21a"

  url "https://github.com/raphaelsalaja/pond/releases/download/v#{version}/Pond-#{version}-#{arch}.dmg"
  name "Pond"
  desc "Local-first archive for things you save from the web"
  homepage "https://github.com/raphaelsalaja/pond"

  livecheck do
    url :url
    strategy :github_latest
  end

  depends_on macos: :monterey

  app "Pond.app"

  zap trash: [
    "~/Library/Application Support/pond",
    "~/Library/Logs/pond",
    "~/Library/Preferences/so.pond.desktop.plist",
  ]
end
