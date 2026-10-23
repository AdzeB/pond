cask "pond" do
  arch arm: "arm64", intel: "x64"

  version "1.6.3"
  sha256 arm:   "3ef10f37342b782b57a066491dcb2b84d53293403ab052f0f6e04326c210539c",
         intel: "0edd29769d7da3d77e9612e43e97291783497ea2de7c36a7383f8ef27ef48cfd"

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
