import { IconRefreshOutline18 } from "@pond/icons/outline/18";
import { Logo } from "@pond/ui/logo";
import { Tooltip } from "@pond/ui/tooltip";
import { type CSSProperties, useEffect, useState } from "react";
import { Assistant } from "./assistant";
import { type Scenario, type Surface, scenarios, type Theme } from "./fixtures";

const params = new URLSearchParams(window.location.search);
const initialScenario =
  scenarios.find((item) => item.id === params.get("state"))?.id ?? "empty";

export function Prototype() {
  const [surface, setSurface] = useState<Surface>(
    params.get("view") === "pane" ? "pane" : "page",
  );
  const [scenario, setScenario] = useState<Scenario>(initialScenario);
  const [theme, setTheme] = useState<Theme>(
    params.get("theme") === "light" ? "light" : "dark",
  );
  const [width, setWidth] = useState(Number(params.get("width")) || 380);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const query = new URLSearchParams({
      view: surface,
      state: scenario,
      theme,
      width: String(width),
    });
    window.history.replaceState(null, "", `?${query}`);
  }, [surface, scenario, theme, width]);

  return (
    <Tooltip.Provider>
      <div className="preview">
        <header className="preview-header">
          <div className="preview-brand">
            <Logo size={22} />
            <span>
              Pond <span className="slash">/</span> Assistant
            </span>
            <span className="preview-badge">Design preview</span>
          </div>
          <div className="preview-controls">
            <fieldset className="segment" aria-label="Preview surface">
              <button
                type="button"
                aria-pressed={surface === "page"}
                onClick={() => setSurface("page")}
              >
                Full Page
              </button>
              <button
                type="button"
                aria-pressed={surface === "pane"}
                onClick={() => setSurface("pane")}
              >
                Side Pane
              </button>
            </fieldset>
            <button
              type="button"
              className="theme-button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? "Light" : "Dark"} Theme
            </button>
          </div>
        </header>
        <nav className="state-tabs" aria-label="Preview states">
          {scenarios.map((item, index) => (
            <button
              type="button"
              key={item.id}
              aria-current={scenario === item.id ? "true" : undefined}
              onClick={() => {
                setScenario(item.id);
                setVersion((value) => value + 1);
              }}
            >
              <span className="state-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              {item.label}
            </button>
          ))}
        </nav>
        <main className="stage" data-surface={surface}>
          <div className="stage-heading">
            <span>
              {surface === "page" ? "SIDEBAR DESTINATION" : "LIBRARY COMPANION"}
            </span>
            <span>{surface === "page" ? "Assistant" : `${width}px`}</span>
          </div>
          <div
            className="surface-wrap"
            style={{ "--pane-width": `${width}px` } as CSSProperties}
          >
            <Assistant
              key={`${scenario}-${version}`}
              surface={surface}
              scenario={scenario}
              onExpand={() => setSurface(surface === "page" ? "pane" : "page")}
            />
          </div>
          <div className="stage-footer">
            <p>{scenarios.find((item) => item.id === scenario)?.description}</p>
            <div className="footer-controls">
              {surface === "pane" ? (
                <label>
                  Width{" "}
                  <select
                    aria-label="Pane width"
                    value={width}
                    onChange={(event) => setWidth(Number(event.target.value))}
                  >
                    <option value="280">280px</option>
                    <option value="340">340px</option>
                    <option value="380">380px</option>
                    <option value="560">560px</option>
                  </select>
                </label>
              ) : null}
              <button
                type="button"
                onClick={() => setVersion((value) => value + 1)}
              >
                <IconRefreshOutline18 /> Replay State
              </button>
            </div>
          </div>
        </main>
        <footer className="preview-footer">
          <span>Linear’s restraint. Notion’s clarity. Pond’s library.</span>
          <span>Simulated content · No provider calls · Nothing saved</span>
        </footer>
      </div>
    </Tooltip.Provider>
  );
}
