cask "pond" do
  arch arm: "arm64", intel: "x64"

  version "2.0.2"
  sha256 arm:   "d41a4057ac99b4f9c400ac78083242816a9ae63832ddc91a2cfc4517ff5735b8",
         intel: "77a55d6f27d21d7265758e00de2bb65cf5937d0d545a8ecab0e697b9c2bb6ff4"

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
