cask "pond" do
  arch arm: "arm64", intel: "x64"

  version "1.0.0"
  sha256 arm:   "21ce9fd093cf73aaff2bf4f562028df94612dbd8bc5e2ae1a0c4518af2bd8652",
         intel: "77591402238ef728ddfb017b877da5e1f5f69863bebf9e113ffe81495865f1d6"

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
