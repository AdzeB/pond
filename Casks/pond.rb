cask "pond" do
  arch arm: "arm64", intel: "x64"

  version "1.4.1"
  sha256 arm:   "a65a30e58f1af21f228d31adb6a740c90b08455c01ae4cca221a292cb80a747e",
         intel: "de64b8de8d993b6c1d1b7baae515e1a2ca08c0e36ddc9ec58830005883879461"

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
