cask "pond" do
  arch arm: "arm64", intel: "x64"

  version "1.1.0"
  sha256 arm:   "153a6d97dc4829f20f70f89adf111756fc05f9ae871be5e6662aa6ce79412eca",
         intel: "189a50c168a3e453a105c2405328aae81f6de699b1c79df63ef5b1894c221914"

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
