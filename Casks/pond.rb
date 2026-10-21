cask "pond" do
  arch arm: "arm64", intel: "x64"

  version "1.4.0"
  sha256 arm:   "593082eba4ed5bba8135d3eac266c920e4c648d3aa5fd97ed9d476e09b3ca583",
         intel: "bbccd3cf8b5b9c275091c25aa7aba5fc184594e385fb1391a418a76e97350b47"

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
