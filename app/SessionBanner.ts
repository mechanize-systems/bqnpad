import * as View from "@codemirror/view";

import * as UI from "@mechanize/ui";

import * as Workspace0 from "./Workspace0";
import { encodeWorkspace } from "./WorkspaceManager";

export class SessionBanner extends View.WidgetType {
  constructor(
    private readonly session: Workspace0.Session0,
    private readonly getWorkspace: () => Workspace0.Workspace0,
    private readonly isCurrent: boolean,
  ) {
    super();
  }

  override get estimatedHeight() {
    return 60;
  }

  toDOM() {
    let root = document.createElement("div");
    root.style.height = `${this.estimatedHeight}px`;
    root.classList.add("SessionBanner");

    let inner = document.createElement("div");
    inner.classList.add("SessionBanner__inner");
    root.appendChild(inner);

    let date = new Intl.DateTimeFormat(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(this.session.createdAt);
    let label = document.createElement("div");
    label.classList.add("SessionBanner__title");
    label.innerText = `Session started ${date}`;
    inner.appendChild(label);

    let shareButton = document.createElement("button");
    shareButton.classList.add("Button");
    shareButton.classList.add("SessionBanner__link");
    shareButton.textContent = "Link↗";
    shareButton.title = "Shareable link to this session";
    shareButton.onclick = () => {
      let workspace = this.getWorkspace();
      let code = encodeWorkspace(
        workspace,
        this.isCurrent ? undefined : this.session,
      );
      let url = `${window.location.origin}/s?bqn=${encodeURIComponent(code)}`;
      window.open(url);
    };
    inner.appendChild(shareButton);

    return root;
  }
}
