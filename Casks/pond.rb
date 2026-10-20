cask "pond" do
  arch arm: "arm64", intel: "x64"

  version "1.2.0"
  sha256 arm:   "0ab8c52a7f23de0f9a6974c164756cc1df96ead980287f32553972b6baddf79a",
         intel: "64c578106bce4f4e6516d56ba3c0ef960c0983c2134e23228615c11076090e17"

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
