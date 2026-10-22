cask "pond" do
  arch arm: "arm64", intel: "x64"

  version "1.5.0"
  sha256 arm:   "c59a67c0cb414b3fa286fd4f3679332a3ba92b32f13adb79b410605b9e6167a9",
         intel: "0075ff7af4599b5a19895f49a9c5c19a3931c81eb60ab459de60466901c6be17"

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
