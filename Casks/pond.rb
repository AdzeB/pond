cask "pond" do
  arch arm: "arm64", intel: "x64"

  version "1.1.1"
  sha256 arm:   "0ad5e49fa27ffd9c0f7f5ddeab7c54567a146f42cd3790fd6fb4b2f6a71244e0",
         intel: "e1020193f246591c7d2ae52eb6f84e6f3cc01dc40db6dc7db5480cc023d1e45a"

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
