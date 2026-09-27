import {
  IconChevronDownOutline18,
  IconDotsVerticalOutline18,
  IconFolderOutline18,
  IconGridOutline18,
  IconImageOutline18,
  IconInputSearchOutline18,
  IconMagnifierMinusOutline18,
  IconMagnifierPlusOutline18,
  IconMenuLeftOutline18,
  IconMenuRightOutline18,
  IconPlusOutline18,
  IconSidebarRightOutline18,
  IconStarOutline18,
  IconTagOutline18,
  IconXmarkOutline18,
} from "nucleo-ui-outline-18";
import { useMemo, useState } from "react";

const tabs = ["Organize", "Info", "Comments"];
const initialTags = ["Travel", "Packing", "Style"];

function IconButton({ label, children, active, onClick, disabled }) {
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={label}
      title={label}
      data-active={active || undefined}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function Sidebar({ selected, onSelect }) {
  const items = [
    ["All", "1,248", IconGridOutline18],
    ["Uncategorized", "320", IconImageOutline18],
    ["Untagged", "412", IconTagOutline18],
    ["Research", "186", IconFolderOutline18],
    ["References", "334", IconFolderOutline18],
  ];
  return (
    <aside className="sidebar">
      <div className="brand">Pond</div>
      <button type="button" className="library-switcher">
        <span>Personal</span>
        <IconChevronDownOutline18 />
      </button>
      <nav aria-label="Library">
        {items.map(([label, count, ItemIcon]) => (
          <button
            type="button"
            key={label}
            className={selected === label ? "selected" : ""}
            onClick={() => onSelect(label)}
          >
            <ItemIcon />
            <span>{label}</span>
            <small>{count}</small>
          </button>
        ))}
      </nav>
    </aside>
  );
}

function AppToolbar({ zoom, setZoom, inspectorOpen, setInspectorOpen }) {
  const [query, setQuery] = useState("");
  return (
    <header className="app-toolbar">
      <div className="toolbar-start">
        <span className="history-controls">
          <IconButton label="Back">
            <IconMenuLeftOutline18 />
          </IconButton>
          <IconButton label="Forward" disabled>
            <IconMenuRightOutline18 />
          </IconButton>
        </span>
        <IconImageOutline18 />
        <strong>Man travel bag essentials</strong>
      </div>
      <div className="toolbar-center" aria-label="Viewer zoom controls">
        <IconButton
          label="Zoom out"
          onClick={() => setZoom((value) => Math.max(70, value - 10))}
        >
          <IconMagnifierMinusOutline18 />
        </IconButton>
        <button
          type="button"
          className="zoom-value"
          onClick={() => setZoom(100)}
        >
          {zoom}%
        </button>
        <IconButton
          label="Zoom in"
          onClick={() => setZoom((value) => Math.min(130, value + 10))}
        >
          <IconMagnifierPlusOutline18 />
        </IconButton>
      </div>
      <div className="toolbar-end">
        <label className="search-field">
          <IconInputSearchOutline18 />
          <input
            aria-label="Search saves"
            placeholder="Search your saves…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <IconButton
          label={inspectorOpen ? "Close inspector" : "Open inspector"}
          active={inspectorOpen}
          onClick={() => setInspectorOpen((open) => !open)}
        >
          <IconSidebarRightOutline18 />
        </IconButton>
      </div>
    </header>
  );
}

function Rating({ value, onChange }) {
  return (
    <div
      className="rating"
      role="group"
      aria-label={`Rating ${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          type="button"
          key={star}
          aria-label={`${star} stars`}
          aria-pressed={value === star}
          data-filled={star <= value || undefined}
          onClick={() => onChange(value === star ? 0 : star)}
        >
          <IconStarOutline18 />
        </button>
      ))}
    </div>
  );
}

function TagsField({ tags, setTags }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const add = () => {
    const next = draft.trim();
    if (next && !tags.some((tag) => tag.toLowerCase() === next.toLowerCase()))
      setTags((current) => [...current, next]);
    setDraft("");
    setAdding(false);
  };
  return (
    <div className="chips" aria-label="Tags">
      {tags.map((tag) => (
        <span className="chip" key={tag}>
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            onClick={() =>
              setTags((current) => current.filter((item) => item !== tag))
            }
          >
            <IconXmarkOutline18 />
          </button>
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          className="chip-input"
          value={draft}
          aria-label="New tag"
          placeholder="New tag"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={add}
          onKeyDown={(event) => {
            if (event.key === "Enter") add();
            if (event.key === "Escape") setAdding(false);
          }}
        />
      ) : (
        <button
          type="button"
          className="round-add"
          aria-label="Add tag"
          onClick={() => setAdding(true)}
        >
          <IconPlusOutline18 />
        </button>
      )}
    </div>
  );
}

function PropertyRow({ label, children, multiline }) {
  return (
    <div className="property-row" data-multiline={multiline || undefined}>
      <span className="property-label">{label}</span>
      <div className="property-value">{children}</div>
    </div>
  );
}

function OrganizePane({ values, setValue, rating, setRating, tags, setTags }) {
  return (
    <div className="property-sheet">
      <section className="property-section">
        <h2>Identity</h2>
        <PropertyRow label="Title">
          <input
            value={values.title}
            onChange={(event) => setValue("title", event.target.value)}
          />
        </PropertyRow>
        <PropertyRow label="Description" multiline>
          <textarea
            rows="3"
            value={values.description}
            onChange={(event) => setValue("description", event.target.value)}
          />
        </PropertyRow>
      </section>
      <section className="property-section">
        <h2>Organization</h2>
        <PropertyRow label="Rating">
          <Rating value={rating} onChange={setRating} />
        </PropertyRow>
        <PropertyRow label="Tags" multiline>
          <TagsField tags={tags} setTags={setTags} />
        </PropertyRow>
        <PropertyRow label="Folders">
          <button type="button" className="folder-field">
            <IconFolderOutline18 />
            <span>References / Travel</span>
            <IconChevronDownOutline18 />
          </button>
        </PropertyRow>
        <PropertyRow label="Notes" multiline>
          <textarea
            rows="3"
            value={values.notes}
            onChange={(event) => setValue("notes", event.target.value)}
          />
        </PropertyRow>
      </section>
    </div>
  );
}

function InfoPane() {
  const groups = [
    [
      "Source",
      [
        ["Platform", "Pinterest"],
        ["Author", "Raphael Salaja"],
        ["URL", "pinterest.com/pin/…"],
      ],
    ],
    [
      "File",
      [
        ["Type", "JPEG image"],
        ["Dimensions", "480 × 640"],
        ["Size", "72 KB"],
        ["Imported", "26 Sep 2026"],
      ],
    ],
  ];
  return (
    <div className="property-sheet">
      {groups.map(([title, rows]) => (
        <section className="property-section info-section" key={title}>
          <h2>{title}</h2>
          {rows.map(([label, value]) => (
            <PropertyRow label={label} key={label}>
              <span>{value}</span>
            </PropertyRow>
          ))}
        </section>
      ))}
      <section className="property-section info-section">
        <h2>Colors</h2>
        <div className="swatches" aria-label="Dominant colors">
          {["#eee9dd", "#c8b69d", "#9d7250", "#5f4430", "#22221f"].map(
            (color) => (
              <span key={color} style={{ backgroundColor: color }} />
            ),
          )}
        </div>
      </section>
    </div>
  );
}

function CommentsPane() {
  const [comments, setComments] = useState([
    "The warm leather and bedding palette works beautifully here.",
  ]);
  const [draft, setDraft] = useState("");
  const addComment = () => {
    const next = draft.trim();
    if (!next) return;
    setComments((current) => [...current, next]);
    setDraft("");
  };
  return (
    <div className="comments-pane">
      {comments.map((comment, index) => (
        <article className="comment" key={`${comment}-${index}`}>
          <span className="comment-avatar">RS</span>
          <div>
            <strong>You</strong>
            <p>{comment}</p>
          </div>
        </article>
      ))}
      <div className="comment-compose">
        <textarea
          value={draft}
          aria-label="New comment"
          placeholder="Add a comment…"
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="button" disabled={!draft.trim()} onClick={addComment}>
          Add comment
        </button>
      </div>
    </div>
  );
}

function Inspector({ activeTab, setActiveTab, onClose }) {
  const [rating, setRating] = useState(4);
  const [tags, setTags] = useState(initialTags);
  const [menuOpen, setMenuOpen] = useState(false);
  const [values, setValues] = useState({
    title: "Man travel bag essentials",
    description: "A compact packing reference for short city trips.",
    notes: "Pair with the weekend packing checklist.",
  });
  const setValue = (key, value) =>
    setValues((current) => ({ ...current, [key]: value }));
  return (
    <aside className="inspector" aria-label="Save inspector">
      <header className="inspector-header">
        <div className="tabs" role="tablist" aria-label="Save details">
          {tabs.map((tab) => (
            <button
              type="button"
              role="tab"
              key={tab}
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="pane-actions">
          <IconButton
            label="More actions"
            active={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <IconDotsVerticalOutline18 />
          </IconButton>
          <IconButton label="Close inspector" onClick={onClose}>
            <IconXmarkOutline18 />
          </IconButton>
        </div>
        {menuOpen ? (
          <div className="more-menu">
            <button type="button" onClick={() => setMenuOpen(false)}>
              Copy link
            </button>
            <button type="button" onClick={() => setMenuOpen(false)}>
              Reveal in Finder
            </button>
          </div>
        ) : null}
      </header>
      <div className="inspector-scroll">
        <div className="tab-panel" key={activeTab} role="tabpanel">
          {activeTab === "Organize" ? (
            <OrganizePane
              values={values}
              setValue={setValue}
              rating={rating}
              setRating={setRating}
              tags={tags}
              setTags={setTags}
            />
          ) : null}
          {activeTab === "Info" ? <InfoPane /> : null}
          {activeTab === "Comments" ? <CommentsPane /> : null}
        </div>
      </div>
    </aside>
  );
}

export function App() {
  const [selectedFolder, setSelectedFolder] = useState("All");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("Organize");
  const [zoom, setZoom] = useState(100);
  const imageStyle = useMemo(
    () => ({ transform: `scale(${zoom / 100})` }),
    [zoom],
  );
  return (
    <main className="app-shell">
      <Sidebar selected={selectedFolder} onSelect={setSelectedFolder} />
      <section className="app-content">
        <AppToolbar
          zoom={zoom}
          setZoom={setZoom}
          inspectorOpen={inspectorOpen}
          setInspectorOpen={setInspectorOpen}
        />
        <div className="workspace">
          <section className="viewer" aria-label="Selected Save">
            <img
              src="/assets/travel-bag.jpg"
              alt="Travel bag packed with city-trip essentials"
              style={imageStyle}
            />
          </section>
          {inspectorOpen ? (
            <Inspector
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onClose={() => setInspectorOpen(false)}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}
