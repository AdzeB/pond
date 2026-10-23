cask "pond" do
  arch arm: "arm64", intel: "x64"

  version "1.6.2"
  sha256 arm:   "98be30fec054c083ade2fb77ce8fc7a09fe6fb9e672cc05faab1115604d8739c",
         intel: "6a3142da4147f2c4868a4dce63ae5a0831262aa21dee5c64b6f4281688530291"

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
