import * as View from "@codemirror/view";

import * as UI from "./UI";
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
    return UI.LINE_HEIGHT;
  }

  toDOM() {
    let root = document.createElement("div");
    root.style.height = `${this.estimatedHeight}px`;
    root.classList.add("SessionBanner");

    let date = new Intl.DateTimeFormat(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(this.session.createdAt);
    let label = document.createElement("div");
    label.classList.add("SessionBanner__title");
    label.innerText = `Session started ${date}`;
    root.appendChild(label);

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
    root.appendChild(shareButton);
    return root;
  }
}
