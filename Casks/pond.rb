cask "pond" do
  arch arm: "arm64", intel: "x64"

  version "1.5.1"
  sha256 arm:   "585c66246d082b7ca0d5ec3ac86735aadb88abc6b466a52b339b74edb9074b1e",
         intel: "0b1af58f6a446dbb18dfc0434d659f2420d7783bd00b335c185e8c53b55db9e3"

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
